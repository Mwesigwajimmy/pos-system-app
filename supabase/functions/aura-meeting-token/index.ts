// supabase/functions/aura-meeting-token/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

/**
 * --- AURA MEETING TOKEN ---
 * v1.0 — mints JaaS (Jitsi as a Service) tokens.
 *
 * WHY THIS EXISTS
 *
 * meet.jit.si withdrew support for embedding. Calls placed through it now end
 * after five minutes and force the host to sign in — fine for a demo, useless
 * in front of a customer. JaaS is the supported path: free for unlimited
 * minutes on up to 25 endpoints, no server to run.
 *
 * JaaS authenticates every participant with a JWT signed by an RSA private
 * key. That key must never reach the browser — anyone holding it can mint
 * tokens against your account indefinitely. So signing happens here, and the
 * frontend receives only short-lived tokens.
 *
 * TWO TOKENS PER MEETING
 *
 *   MODERATOR — for the director opening the room. Can lock it, admit people
 *   from the lobby, mute others, end the call. Four hours.
 *
 *   GUEST — embedded in the invite link as ?jwt=. This is what makes "no
 *   account needed" true: JaaS requires a token from every participant, so
 *   without one an invitee would hit a sign-in wall. Not a moderator, and
 *   scoped to this one room. Twelve hours, because meetings get forwarded and
 *   people join late.
 *
 * Both are scoped to a single room rather than '*'. A wildcard token leaked in
 * a forwarded WhatsApp message would open every meeting the business has ever
 * held.
 *
 * SETUP: see JAAS_SETUP.md. Three values go in aura_system_settings —
 * JAAS_APP_ID, JAAS_KID, JAAS_PRIVATE_KEY.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODERATOR_TTL_SECONDS = 4 * 60 * 60;
const GUEST_TTL_SECONDS = 12 * 60 * 60;

// As in the report engine: a caller presenting a user JWT must be provably a
// member of the business before a token is minted in its name. Turn on once
// you confirm which membership table your project uses.
const STRICT_TENANT_CHECK = (Deno.env.get('AURA_STRICT_TENANT_CHECK') ?? 'false') === 'true';

const MEMBERSHIP_SOURCES: { table: string; userCol: string; bizCol: string }[] = [
  { table: 'tenant_users', userCol: 'user_id', bizCol: 'tenant_id' },
  { table: 'business_members', userCol: 'user_id', bizCol: 'business_id' },
  { table: 'user_business_roles', userCol: 'user_id', bizCol: 'business_id' },
  { table: 'profiles', userCol: 'id', bizCol: 'business_id' },
  { table: 'employees', userCol: 'user_id', bizCol: 'business_id' },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Turns a PEM private key into something crypto.subtle can sign with.
 * JaaS issues PKCS#8 keys ("BEGIN PRIVATE KEY"). A PKCS#1 key ("BEGIN RSA
 * PRIVATE KEY") will not import and needs converting first — see the setup
 * guide, because the error otherwise is an unhelpful "invalid key".
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');

  if (!cleaned) throw new Error('The private key is empty.');
  if (/BEGIN RSA PRIVATE KEY/.test(pem)) {
    throw new Error('That key is in PKCS#1 format. Convert it with: openssl pkcs8 -topk8 -nocrypt -in key.pk -out key.pem');
  }

  let der: ArrayBuffer;
  try {
    const binary = atob(cleaned);
    der = new ArrayBuffer(binary.length);
    const view = new Uint8Array(der);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  } catch (e) {
    throw new Error('The private key is not valid base64. Paste the whole file including the BEGIN and END lines.');
  }

  return await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

interface TokenOptions {
  appId: string;
  kid: string;
  key: CryptoKey;
  room: string;
  userId: string;
  name: string;
  email?: string | null;
  moderator: boolean;
  ttl: number;
}

async function mint(o: TokenOptions): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Shape taken from JaaS's own documentation. If a token is ever rejected
  // with "invalid context", the usual cause is this: some JaaS versions expect
  // the moderator and feature flags as the STRINGS 'true'/'false' rather than
  // booleans. Swap them and re-test before looking anywhere else.
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: o.appId,
    room: o.room,          // one room, never '*'
    exp: now + o.ttl,
    nbf: now - 10,         // small allowance for clock drift between machines
    context: {
      user: {
        id: o.userId,
        name: o.name,
        email: o.email ?? undefined,
        moderator: o.moderator,
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: true,     // available on JaaS; the room can switch it on
        'outbound-call': false,
      },
    },
  };

  return await create({ alg: 'RS256', typ: 'JWT', kid: o.kid }, payload, o.key);
}

async function assertAccess(sb: any, req: Request, businessId: string, userId: string): Promise<{ ok: boolean; reason?: string }> {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (serviceKey && token === serviceKey) return { ok: true };

  if (token) {
    const { data: userData } = await sb.auth.getUser(token);
    const uid = userData?.user?.id;
    if (uid && uid !== userId) return { ok: false, reason: 'Token identity does not match the requested user.' };
    if (uid) {
      for (const src of MEMBERSHIP_SOURCES) {
        try {
          const { data, error } = await sb.from(src.table).select(src.userCol)
            .eq(src.userCol, uid).eq(src.bizCol, businessId).limit(1);
          if (!error && data && data.length > 0) return { ok: true };
        } catch (_e) { /* table absent — try the next */ }
      }
    }
  }

  if (STRICT_TENANT_CHECK) return { ok: false, reason: 'Caller could not be verified as a member of this business.' };
  console.warn(`[AURA MEETING TOKEN] Unverified caller for business ${businessId}.`);
  return { ok: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { businessId, userId, room, displayName, email } = body as Record<string, any>;

    if (!businessId) throw new Error('businessId is required.');
    if (!room) throw new Error('room is required.');

    // The room name is generated by the client and must not be trusted blindly
    // — a crafted value could scope a token to somebody else's room name.
    const safeRoom = String(room).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    if (!safeRoom) throw new Error('The room name contained no usable characters.');
    if (!safeRoom.startsWith(`bbu1-${String(businessId).replace(/-/g, '').slice(0, 8)}`)) {
      throw new Error('The room name does not belong to this business.');
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const access = await assertAccess(sb, req, businessId, userId ?? '');
    if (!access.ok) return json({ success: false, error: `Access denied: ${access.reason}` }, 403);

    const { data: settings } = await sb.from('aura_system_settings')
      .select('key_name, key_value')
      .in('key_name', ['JAAS_APP_ID', 'JAAS_KID', 'JAAS_PRIVATE_KEY']);

    const get = (k: string) => settings?.find((s: any) => s.key_name === k)?.key_value ?? Deno.env.get(k) ?? '';
    const appId = get('JAAS_APP_ID');
    const kid = get('JAAS_KID');
    const pem = get('JAAS_PRIVATE_KEY');

    if (!appId || !kid || !pem) {
      // Not an error the director should see as a crash: the meeting falls
      // back to the public server, which still works for short calls.
      return json({
        success: false,
        configured: false,
        error: 'JaaS is not configured. Add JAAS_APP_ID, JAAS_KID and JAAS_PRIVATE_KEY to aura_system_settings — see JAAS_SETUP.md.',
      }, 200);
    }

    const key = await importPrivateKey(pem);
    const name = String(displayName || 'Director').slice(0, 60);

    const [moderatorToken, guestToken] = await Promise.all([
      mint({ appId, kid, key, room: safeRoom, userId: String(userId || 'host'), name, email: email ?? null, moderator: true, ttl: MODERATOR_TTL_SECONDS }),
      mint({ appId, kid, key, room: safeRoom, userId: `guest-${crypto.randomUUID().slice(0, 8)}`, name: 'Guest', moderator: false, ttl: GUEST_TTL_SECONDS }),
    ]);

    return json({
      success: true,
      configured: true,
      domain: '8x8.vc',
      appId,
      room: safeRoom,
      fullRoomName: `${appId}/${safeRoom}`,
      moderatorToken,
      guestToken,
      // Guests open this directly. The token travels in the URL, which is why
      // it is scoped to this room and expires in half a day.
      guestUrl: `https://8x8.vc/${appId}/${safeRoom}?jwt=${guestToken}`,
      moderatorExpiresIn: MODERATOR_TTL_SECONDS,
      guestExpiresIn: GUEST_TTL_SECONDS,
    });

  } catch (error) {
    console.error('[AURA MEETING TOKEN]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});