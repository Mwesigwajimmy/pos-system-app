// supabase/functions/aura-inbox/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA INBOX ---
 * v1.2 — customer messages in, drafted replies out, and now outbound mail.
 *
 * ACTIONS
 *   inbound        a provider webhook delivers a message
 *   draft          write a reply for one message
 *   list           the queue, newest first
 *   approve_send   a person approves; only then does anything leave
 *   channels       connect or list a business's numbers and addresses
 *   compose        send a NEW email to one or many recipients (v1.2)
 *   compose_draft  Aura writes the subject and body from an instruction (v1.2)
 *
 * WHAT v1.2 FIXES AND ADDS
 *
 * 1. Credential merge on reconnect. Connecting a channel that already exists
 *    used to REPLACE the credentials jsonb wholesale, wiping stored tokens
 *    and the relay address if fields were left blank. Now the new credentials
 *    are merged over the existing ones, and the relay address, once minted,
 *    is never regenerated.
 *
 * 2. Relay backfill. A channel connected before v1.1 has no relay address.
 *    The channels list now mints one on read if it is missing, so every
 *    email channel always has one to show.
 *
 * 3. Compose. A business can write a brand-new email (not a reply) to one
 *    address or to hundreds. Bulk goes through Resend's batch endpoint in
 *    chunks of 100 with a pause between chunks, and every send is recorded
 *    as an outbound message so the thread history is complete. Capped at
 *    500 recipients per call — beyond that is a mailing list product, and
 *    a runaway loop should not be able to email a business's entire
 *    customer base twice.
 *
 * 4. compose_draft. Aura writes the email from a plain instruction, using
 *    the same memory recall the reply drafter uses. Nothing is sent by this
 *    action — it only returns text for a person to read, edit and approve.
 *
 * WHY APPROVAL IS NOT OPTIONAL — unchanged, see v1.1 note. auto_send is off
 * by default and should stay off far longer than feels necessary.
 *
 * EMAIL, OPTION B — unchanged. Every business sends from the shared verified
 * domain with its own display name, and receives by forwarding its real
 * inbox to its unique relay address (credentials.relay_address).
 *
 * REQUIRES sql/AURA_INBOX.sql (unchanged — no migration needed for v1.2)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
};

const CHAT_MODEL = 'Meta-Llama-3.3-70B-Instruct';
const MAX_DRAFT_TOKENS = 500;
const MAX_COMPOSE_TOKENS = 700;
const THREAD_CONTEXT = 6;

const MAX_RECIPIENTS = 500;       // per compose call
const BATCH_SIZE = 100;           // Resend's batch endpoint maximum
const BATCH_PAUSE_MS = 700;       // stays under Resend's default 2 req/s

const DEFAULT_SENDING_DOMAIN = 'inbox.bbu1.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sb() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}

async function settingValue(client: any, key: string): Promise<string> {
  const fromEnv = Deno.env.get(key);
  if (fromEnv) return fromEnv;
  const { data } = await client.from('aura_system_settings')
    .select('key_value').eq('key_name', key).maybeSingle();
  return data?.key_value ?? '';
}

function mintRelayAddress(businessId: string, sendingDomain: string): string {
  const slug = String(businessId).replace(/-/g, '').slice(0, 12);
  return `biz-${slug}@${sendingDomain}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accepts an array, or a string separated by commas, semicolons or newlines. */
function normaliseRecipients(raw: unknown): { valid: string[]; invalid: string[] } {
  const list = Array.isArray(raw)
    ? raw.map(String)
    : String(raw ?? '').split(/[,;\n]/);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const item of list) {
    const addr = item.trim().toLowerCase();
    if (!addr) continue;
    if (seen.has(addr)) continue;
    seen.add(addr);
    (EMAIL_RE.test(addr) ? valid : invalid).push(addr);
  }
  return { valid, invalid };
}

// ---------------------------------------------------------------------------
// INBOUND — normalising what providers send
// ---------------------------------------------------------------------------

interface Incoming {
  channel: 'whatsapp' | 'email' | 'sms' | 'web';
  externalId: string | null;
  counterparty: string;
  counterpartyName: string | null;
  toIdentifier: string;
  subject: string | null;
  body: string;
}

/**
 * Meta delivers a deeply nested envelope that also carries delivery receipts
 * and read receipts through the same webhook. Only actual text messages are
 * of interest; a status callback treated as a message would have Aura reply
 * to a read receipt.
 */
function parseWhatsApp(payload: any): Incoming[] {
  const out: Incoming[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      if (!value?.messages) continue;

      const businessNumber = value?.metadata?.display_phone_number ?? '';
      const contacts = value?.contacts ?? [];

      for (const m of value.messages) {
        if (m.type !== 'text' || !m.text?.body) continue;
        const contact = contacts.find((c: any) => c.wa_id === m.from);
        out.push({
          channel: 'whatsapp',
          externalId: m.id ?? null,
          counterparty: m.from,
          counterpartyName: contact?.profile?.name ?? null,
          toIdentifier: businessNumber,
          subject: null,
          body: String(m.text.body).slice(0, 4000),
        });
      }
    }
  }
  return out;
}

/** Generic inbound email, as posted by Postmark, Mailgun or a custom Worker. */
function parseEmail(payload: any): Incoming[] {
  const from = payload?.from ?? payload?.sender ?? payload?.From ?? '';
  const to = payload?.to ?? payload?.recipient ?? payload?.To ?? '';
  const body = payload?.text ?? payload?.['body-plain'] ?? payload?.TextBody ?? payload?.html ?? '';
  if (!from || !body) return [];

  const match = String(from).match(/^(.*?)\s*<(.+?)>$/);
  return [{
    channel: 'email',
    externalId: payload?.message_id ?? payload?.MessageID ?? payload?.['Message-Id'] ?? null,
    counterparty: (match ? match[2] : String(from)).trim().toLowerCase(),
    counterpartyName: match ? match[1].replace(/^"|"$/g, '').trim() || null : null,
    toIdentifier: String(Array.isArray(to) ? to[0] : to).trim().toLowerCase(),
    subject: payload?.subject ?? payload?.Subject ?? null,
    body: String(body).slice(0, 8000),
  }];
}

/**
 * Resend's inbound webhook (event: "email.received") carries only metadata —
 * the actual body has to be fetched with a follow-up call to the Receiving
 * API. `received_for` (when present) is the address the mail was actually
 * delivered to on Resend's side, which is what forwarding rules produce —
 * preferred over `to`, which can still show the customer's original address
 * for a forwarded message.
 */
async function parseResendInbound(payload: any, client: any): Promise<Incoming[]> {
  const data = payload?.data;
  if (!data?.email_id) return [];

  const apiKey = await settingValue(client, 'RESEND_API_KEY');
  let body = '';
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${data.email_id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const full = await res.json();
      body = full?.text || full?.html || '';
    } else {
      console.warn('[AURA INBOX] Resend receiving fetch failed:', res.status, await res.text());
    }
  } catch (e) {
    console.warn('[AURA INBOX] could not fetch Resend email body:', (e as Error).message);
  }
  if (!body) return [];

  const from = String(data.from ?? '');
  const match = from.match(/^(.*?)\s*<(.+?)>$/);

  const toList: string[] =
    Array.isArray(data.received_for) && data.received_for.length > 0
      ? data.received_for
      : (Array.isArray(data.to) ? data.to : [data.to].filter(Boolean));

  return [{
    channel: 'email',
    externalId: data.email_id ?? null,
    counterparty: (match ? match[2] : from).trim().toLowerCase(),
    counterpartyName: match ? match[1].replace(/^"|"$/g, '').trim() || null : null,
    toIdentifier: String(toList[0] ?? '').trim().toLowerCase(),
    subject: data.subject ?? null,
    body: String(body).slice(0, 8000),
  }];
}

/**
 * Which business owns the number or address the message arrived at.
 *
 * For email: a message can arrive addressed either to the business's own
 * real address (identifier — relevant once a business verifies its own
 * domain) or to its relay address on the shared sending domain
 * (credentials.relay_address — the normal path for everyone today).
 */
async function resolveBusiness(client: any, channel: string, identifier: string) {
  const cleaned = channel === 'whatsapp'
    ? identifier.replace(/[^\d]/g, '')
    : identifier.toLowerCase().trim();

  const { data } = await client.from('aura_channels')
    .select('*').eq('channel', channel).eq('is_active', true);

  return (data ?? []).find((c: any) => {
    if (channel === 'whatsapp') {
      const stored = String(c.identifier).replace(/[^\d]/g, '');
      return stored === cleaned || stored.endsWith(cleaned) || cleaned.endsWith(stored);
    }

    const storedIdentifier = String(c.identifier).toLowerCase().trim();
    const storedRelay = String(c.credentials?.relay_address ?? '').toLowerCase().trim();
    return storedIdentifier === cleaned || (storedRelay && storedRelay === cleaned);
  }) ?? null;
}

// ---------------------------------------------------------------------------
// MEMORY RECALL — shared by reply drafting and composing
// ---------------------------------------------------------------------------

async function recallForBusiness(businessId: string, query: string): Promise<string> {
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/aura-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        action: 'recall',
        businessId,
        query,
        limit: 4,
        minSimilarity: 0.35,
      }),
    });
    const out = await res.json();
    if (out?.success && out.found > 0) return out.pack;
  } catch (e) {
    // A draft without recall is worse but still useful; a draft that never
    // arrives because recall failed is not.
    console.warn('[AURA INBOX] recall unavailable:', (e as Error).message);
  }
  return '';
}

async function callModel(client: any, system: string, user: string, maxTokens: number): Promise<{ text: string; error?: string }> {
  const apiKey = await settingValue(client, 'SAMBANOVA_API_KEY');
  if (!apiKey) return { text: '', error: 'No SAMBANOVA_API_KEY available.' };

  try {
    const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) return { text: '', error: `Drafting model returned ${res.status}: ${(await res.text()).slice(0, 200)}` };

    const out = await res.json();
    const text = String(out?.choices?.[0]?.message?.content ?? '').trim();
    return text ? { text } : { text: '', error: 'The model returned nothing.' };
  } catch (e) {
    return { text: '', error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// DRAFTING A REPLY
// ---------------------------------------------------------------------------

async function draftReply(client: any, message: any, businessName: string, currency: string): Promise<{ draft: string; error?: string }> {
  const { data: history } = await client.from('aura_messages')
    .select('id, direction, body, draft_reply, status, created_at')
    .eq('business_id', message.business_id)
    .eq('thread_key', message.thread_key)
    .order('created_at', { ascending: false })
    .limit(THREAD_CONTEXT);

  const thread = (history ?? []).reverse()
    .filter((m: any) => m.id !== message.id)
    .map((m: any) => m.direction === 'inbound'
      ? `Customer: ${m.body}`
      : `${businessName}: ${m.status === 'sent' ? m.body : (m.draft_reply ?? m.body)}`)
    .join('\n');

  const recalled = await recallForBusiness(message.business_id, message.body);

  const system = `You are writing a reply on behalf of ${businessName}, to a customer who has messaged them on ${message.channel === 'whatsapp' ? 'WhatsApp' : 'email'}.

You are writing AS the business, not as an assistant. Never say you are an AI, never refer to yourself in the third person, and never mention that a draft was generated.

HOW TO WRITE
- Match the channel. WhatsApp is short, warm and direct — two or three sentences, no greeting block, no signature. Email carries a subject line and a little more structure.
- Answer the question that was asked, first. Pleasantries after, if at all.
- Use the customer's name if it is known, once.
- Plain language. A customer asking about a delivery does not want to read "we are pleased to inform you".

WHAT YOU MUST NOT DO
- Never quote a price, a stock figure, a balance or a date unless it appears in the material below. Inventing a price commits the business to it.
- Never promise a delivery time, a discount, a refund or an exception. If the customer asks for one, say the owner will confirm shortly.
- Never share anything about the business's finances, other customers, staff or suppliers.
- If you cannot answer from what is here, say plainly that you will check and come back — a short honest reply is better than a confident wrong one that the owner has to retract.

${recalled ? `WHAT THIS BUSINESS HAS ON RECORD:\n${recalled}\n` : 'Nothing specific is on record for this question, so answer generally and offer to confirm.\n'}
${thread ? `THE CONVERSATION SO FAR:\n${thread}\n` : ''}
Currency, if amounts come up: ${currency}.

Write only the reply itself. No preamble, no explanation, no quotation marks around it.`;

  const { text, error } = await callModel(
    client, system,
    `The customer${message.counterparty_name ? ` (${message.counterparty_name})` : ''} wrote:\n\n${message.body}`,
    MAX_DRAFT_TOKENS,
  );

  if (error) return { draft: '', error };
  return { draft: text.replace(/^["']|["']$/g, '') };
}

// ---------------------------------------------------------------------------
// SENDING
// ---------------------------------------------------------------------------

async function sendWhatsApp(channel: any, to: string, text: string): Promise<{ ok: boolean; error?: string; id?: string }> {
  const token = channel?.credentials?.access_token;
  const phoneNumberId = channel?.credentials?.phone_number_id;
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'This WhatsApp channel has no access_token and phone_number_id stored.' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^\d]/g, ''),
        type: 'text',
        text: { preview_url: false, body: text.slice(0, 4000) },
      }),
    });

    const out = await res.json();
    if (!res.ok) {
      // Meta's own message is far more useful than a generic failure — it
      // names expired tokens and the 24-hour window explicitly.
      return { ok: false, error: out?.error?.message ?? `WhatsApp returned ${res.status}.` };
    }
    return { ok: true, id: out?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * The pieces every outbound email needs, resolved once per channel: which
 * API key, which from-address, which reply-to. Shared by single sends,
 * replies and bulk compose so they can never disagree.
 */
async function emailSendConfig(client: any, channel: any, businessName?: string) {
  const apiKey = channel?.credentials?.resend_api_key || await settingValue(client, 'RESEND_API_KEY');
  const sendingDomain = channel?.credentials?.verified_from_domain
    || await settingValue(client, 'AURA_SENDING_DOMAIN')
    || DEFAULT_SENDING_DOMAIN;

  const displayName = (businessName || 'Support').replace(/["<>]/g, '');
  return {
    apiKey,
    from: `${displayName} <replies@${sendingDomain}>`,
    replyTo: channel?.identifier || undefined,
  };
}

async function sendEmail(
  client: any,
  channel: any,
  to: string,
  subject: string,
  text: string,
  businessName?: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { apiKey, from, replyTo } = await emailSendConfig(client, channel, businessName);
  if (!apiKey) return { ok: false, error: 'No Resend API key configured.' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: subject || 'Re: your message',
        text,
      }),
    });
    if (!res.ok) return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 200)}` };
    const out = await res.json().catch(() => ({}));
    return { ok: true, id: out?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Bulk email through Resend's batch endpoint: up to 100 messages per call,
 * with a pause between calls to stay under the rate limit. If a whole batch
 * call fails, every recipient in that chunk is marked failed with the same
 * reason — Resend does not report per-recipient outcomes on a failed call.
 */
async function sendEmailBulk(
  client: any,
  channel: any,
  recipients: string[],
  subject: string,
  text: string,
  businessName?: string,
): Promise<Array<{ to: string; ok: boolean; id?: string; error?: string }>> {
  const { apiKey, from, replyTo } = await emailSendConfig(client, channel, businessName);
  if (!apiKey) return recipients.map((to) => ({ to, ok: false, error: 'No Resend API key configured.' }));

  const results: Array<{ to: string; ok: boolean; id?: string; error?: string }> = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    if (i > 0) await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));

    const batch = chunk.map((to) => ({
      from,
      to: [to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
    }));

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        const reason = `${res.status}: ${(await res.text()).slice(0, 200)}`;
        for (const to of chunk) results.push({ to, ok: false, error: reason });
        continue;
      }

      const out = await res.json().catch(() => ({}));
      const ids: any[] = Array.isArray(out?.data) ? out.data : [];
      chunk.forEach((to, idx) => results.push({ to, ok: true, id: ids[idx]?.id }));
    } catch (e) {
      for (const to of chunk) results.push({ to, ok: false, error: (e as Error).message });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);

  // Meta verifies a webhook by GET before it will deliver anything to it.
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const client = sb();
    const expected = await settingValue(client, 'WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && expected && token === expected) {
      return new Response(challenge ?? '', { status: 200, headers: corsHeaders });
    }
    return new Response('Verification failed', { status: 403, headers: corsHeaders });
  }

  const started = Date.now();
  try {
    const payload = await req.json();
    const client = sb();

    // A provider webhook has no `action` — that is how it is told apart from
    // a call made by the app. Resend's inbound event carries `type` instead
    // of a flat `from`, so it needs its own check here.
    const isWebhook = !payload.action && (
      payload.object === 'whatsapp_business_account' ||
      payload.type === 'email.received' ||
      payload.from || payload.sender || payload.From
    );
    const action = isWebhook ? 'inbound' : String(payload.action ?? '').toLowerCase();

    // ------------------------------------------------------------- INBOUND
    if (action === 'inbound') {
      const incoming = payload.object === 'whatsapp_business_account'
        ? parseWhatsApp(payload)
        : payload.type === 'email.received'
          ? await parseResendInbound(payload, client)
          : parseEmail(payload);

      if (incoming.length === 0) {
        // Delivery receipts and read receipts land here constantly. Returning
        // 200 stops the provider retrying something that was never a message.
        return json({ success: true, stored: 0, note: 'Nothing in this payload was a text message.' });
      }

      const stored: any[] = [];
      const unrouted: any[] = [];

      for (const msg of incoming) {
        const channelRow = await resolveBusiness(client, msg.channel, msg.toIdentifier);
        if (!channelRow) {
          // Better to record than discard: a message arriving at an
          // unconnected number is a configuration problem the owner should be
          // told about, not something to drop silently.
          unrouted.push({ channel: msg.channel, to: msg.toIdentifier, from: msg.counterparty });
          continue;
        }

        const { data: row, error } = await client.from('aura_messages').insert({
          business_id: channelRow.business_id,
          channel: msg.channel,
          direction: 'inbound',
          external_id: msg.externalId,
          counterparty: msg.counterparty,
          counterparty_name: msg.counterpartyName,
          thread_key: msg.counterparty,
          subject: msg.subject,
          body: msg.body,
          status: 'new',
        }).select('*').single();

        if (error) {
          // A duplicate is the provider retrying, not a failure.
          if (error.message.includes('duplicate') || error.code === '23505') {
            stored.push({ duplicate: true, externalId: msg.externalId });
            continue;
          }
          unrouted.push({ from: msg.counterparty, reason: error.message });
          continue;
        }

        stored.push({ id: row.id, from: msg.counterparty });

        if (channelRow.auto_draft) {
          const { data: tenant } = await client.from('tenants')
            .select('name, currency').eq('id', channelRow.business_id).maybeSingle();

          const { draft, error: draftErr } = await draftReply(
            client, row, tenant?.name ?? 'the business', tenant?.currency ?? '',
          );

          if (draft) {
            await client.from('aura_messages').update({
              draft_reply: draft, draft_at: new Date().toISOString(), status: 'drafted',
            }).eq('id', row.id);

            // auto_send is off by default and should stay off until a month of
            // drafts have been read. See the note at the top of this file.
            if (channelRow.auto_send) {
              const result = msg.channel === 'whatsapp'
                ? await sendWhatsApp(channelRow, msg.counterparty, draft)
                : await sendEmail(client, channelRow, msg.counterparty,
                    msg.subject ? `Re: ${msg.subject}` : '', draft, tenant?.name);

              await client.from('aura_messages').update({
                status: result.ok ? 'sent' : 'failed',
                sent_at: result.ok ? new Date().toISOString() : null,
                send_error: result.ok ? null : result.error,
              }).eq('id', row.id);
            }
          } else if (draftErr) {
            console.warn('[AURA INBOX] draft failed:', draftErr);
          }
        }
      }

      return json({ success: true, stored: stored.length, unrouted, details: stored, durationMs: Date.now() - started });
    }

    // --------------------------------------------------------------- DRAFT
    if (action === 'draft') {
      if (!payload.messageId) throw new Error('messageId is required.');

      const { data: message } = await client.from('aura_messages')
        .select('*').eq('id', payload.messageId).maybeSingle();
      if (!message) throw new Error('That message does not exist.');

      const { data: tenant } = await client.from('tenants')
        .select('name, currency').eq('id', message.business_id).maybeSingle();

      const { draft, error } = await draftReply(
        client, message, tenant?.name ?? 'the business', tenant?.currency ?? '',
      );
      if (error) throw new Error(error);

      await client.from('aura_messages').update({
        draft_reply: draft, draft_at: new Date().toISOString(), status: 'drafted',
      }).eq('id', message.id);

      return json({ success: true, messageId: message.id, draft });
    }

    // ---------------------------------------------------------------- LIST
    if (action === 'list') {
      if (!payload.businessId) throw new Error('businessId is required.');

      let q = client.from('aura_messages')
        .select('*').eq('business_id', payload.businessId)
        .order('created_at', { ascending: false })
        .limit(Math.min(Number(payload.limit) || 50, 200));

      if (payload.status) q = q.eq('status', payload.status);
      if (payload.channel) q = q.eq('channel', payload.channel);

      const { data, error } = await q;
      if (error) throw new Error(error.message);

      return json({
        success: true,
        messages: data ?? [],
        waiting: (data ?? []).filter((m: any) => m.status === 'new' || m.status === 'drafted').length,
      });
    }

    // -------------------------------------------------------- APPROVE_SEND
    if (action === 'approve_send') {
      if (!payload.messageId) throw new Error('messageId is required.');
      if (payload.confirm !== true) {
        return json({ success: false, error: 'Nothing was sent. Send confirm: true once a person has read the reply.' }, 200);
      }

      const { data: message } = await client.from('aura_messages')
        .select('*').eq('id', payload.messageId).maybeSingle();
      if (!message) throw new Error('That message does not exist.');
      if (message.status === 'sent') return json({ success: false, error: 'That reply has already been sent.' }, 200);

      // An edited draft is what gets sent — the owner's wording wins over the
      // model's every time.
      const text = String(payload.text ?? message.draft_reply ?? '').trim();
      if (!text) throw new Error('There is no reply text to send.');

      const { data: channelRow } = await client.from('aura_channels')
        .select('*').eq('business_id', message.business_id)
        .eq('channel', message.channel).eq('is_active', true).maybeSingle();
      if (!channelRow) throw new Error(`No active ${message.channel} channel is connected for this business.`);

      const { data: tenant } = await client.from('tenants')
        .select('name').eq('id', message.business_id).maybeSingle();

      const result = message.channel === 'whatsapp'
        ? await sendWhatsApp(channelRow, message.counterparty, text)
        : await sendEmail(client, channelRow, message.counterparty,
            message.subject ? `Re: ${message.subject}` : '', text, tenant?.name);

      await client.from('aura_messages').update({
        draft_reply: text,
        status: result.ok ? 'sent' : 'failed',
        approved_by: payload.approvedBy ?? null,
        approved_at: new Date().toISOString(),
        sent_at: result.ok ? new Date().toISOString() : null,
        send_error: result.ok ? null : result.error,
      }).eq('id', message.id);

      // The reply is recorded as its own outbound message so the thread reads
      // as a conversation rather than a list of questions.
      if (result.ok) {
        await client.from('aura_messages').insert({
          business_id: message.business_id,
          channel: message.channel,
          direction: 'outbound',
          external_id: result.id ?? null,
          counterparty: message.counterparty,
          counterparty_name: message.counterparty_name,
          thread_key: message.thread_key,
          subject: message.subject ? `Re: ${message.subject}` : null,
          body: text,
          status: 'sent',
          approved_by: payload.approvedBy ?? null,
          approved_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
        });
      }

      return json({ success: result.ok, sent: result.ok, error: result.error ?? null });
    }

    // ------------------------------------------------------- COMPOSE_DRAFT
    // Aura writes a new email from an instruction. Nothing sends here — this
    // only returns text for a person to read, edit and approve.
    if (action === 'compose_draft') {
      if (!payload.businessId) throw new Error('businessId is required.');
      const instruction = String(payload.instruction ?? '').trim();
      if (!instruction) throw new Error('Say what the email should be about.');

      const { data: tenant } = await client.from('tenants')
        .select('name, currency').eq('id', payload.businessId).maybeSingle();
      const businessName = tenant?.name ?? 'the business';

      const recalled = await recallForBusiness(payload.businessId, instruction);

      const system = `You are writing an email on behalf of ${businessName}, to be sent to one or more of their customers.

You are writing AS the business. Never say you are an AI and never mention that this was drafted.

HOW TO WRITE
- Plain, warm, direct language. Short paragraphs. No corporate filler.
- If this goes to many recipients, write it so it reads naturally without a personal name.
- Never quote a price, a stock figure or a date unless it appears in the material below.
- Never promise discounts, refunds or exceptions the instruction did not state.
- Never mention the business's finances, other customers, staff or suppliers.

${recalled ? `WHAT THIS BUSINESS HAS ON RECORD:\n${recalled}\n` : ''}Currency, if amounts come up: ${tenant?.currency ?? ''}.

Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
{"subject": "...", "body": "..."}`;

      const { text, error } = await callModel(client, system, instruction, MAX_COMPOSE_TOKENS);
      if (error) throw new Error(error);

      let subject = '';
      let body = '';
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        subject = String(parsed?.subject ?? '').trim();
        body = String(parsed?.body ?? '').trim();
      } catch {
        // The model ignored the shape — treat everything as the body rather
        // than failing the whole request.
        body = text;
      }
      if (!body) throw new Error('The model returned nothing usable.');

      return json({ success: true, subject, body });
    }

    // -------------------------------------------------------------- COMPOSE
    // A brand-new outbound email to one or many recipients. Requires an
    // explicit confirm, the same as approve_send — bulk especially, because
    // a mis-sent campaign cannot be unsent.
    if (action === 'compose') {
      if (!payload.businessId) throw new Error('businessId is required.');
      if (payload.confirm !== true) {
        return json({ success: false, error: 'Nothing was sent. Send confirm: true once a person has read the email.' }, 200);
      }

      const { valid: recipients, invalid } = normaliseRecipients(payload.to);
      if (recipients.length === 0) throw new Error('No valid email address to send to.');
      if (recipients.length > MAX_RECIPIENTS) {
        throw new Error(`That is ${recipients.length} recipients — the limit is ${MAX_RECIPIENTS} per send. Split the list.`);
      }

      const subject = String(payload.subject ?? '').trim();
      const body = String(payload.body ?? '').trim();
      if (!subject) throw new Error('The email needs a subject.');
      if (!body) throw new Error('The email needs a body.');

      const { data: channelRow } = await client.from('aura_channels')
        .select('*').eq('business_id', payload.businessId)
        .eq('channel', 'email').eq('is_active', true).maybeSingle();
      if (!channelRow) throw new Error('No active email channel is connected for this business. Connect one first.');

      const { data: tenant } = await client.from('tenants')
        .select('name').eq('id', payload.businessId).maybeSingle();

      const results = recipients.length === 1
        ? [{ to: recipients[0], ...(await sendEmail(client, channelRow, recipients[0], subject, body, tenant?.name)) }]
        : await sendEmailBulk(client, channelRow, recipients, subject, body, tenant?.name);

      // Every send becomes an outbound message on that recipient's thread, so
      // when they reply, the conversation already has its first half.
      const now = new Date().toISOString();
      const rows = results.map((r) => ({
        business_id: payload.businessId,
        channel: 'email',
        direction: 'outbound',
        external_id: r.id ?? null,
        counterparty: r.to,
        counterparty_name: null,
        thread_key: r.to,
        subject,
        body,
        status: r.ok ? 'sent' : 'failed',
        send_error: r.ok ? null : (r.error ?? null),
        approved_by: payload.approvedBy ?? null,
        approved_at: now,
        sent_at: r.ok ? now : null,
      }));

      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await client.from('aura_messages').insert(rows.slice(i, i + 100));
        if (error) console.warn('[AURA INBOX] compose record failed:', error.message);
      }

      const sent = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);

      return json({
        success: sent > 0,
        sent,
        failed: failed.length,
        failures: failed.slice(0, 20),
        invalidAddresses: invalid,
        durationMs: Date.now() - started,
      });
    }

    // ------------------------------------------------------------ CHANNELS
    if (action === 'channels') {
      if (!payload.businessId) throw new Error('businessId is required.');

      if (payload.connect) {
        const { channel, identifier, provider, credentials, autoDraft, autoSend } = payload.connect;
        if (!channel || !identifier) throw new Error('channel and identifier are required.');

        // v1.2: merge over what is already stored, so reconnecting with a
        // blank key field no longer wipes tokens or the relay address. Blank
        // strings from an empty form field must not overwrite real values.
        const { data: existing } = await client.from('aura_channels')
          .select('credentials')
          .eq('business_id', payload.businessId)
          .eq('channel', channel).eq('identifier', identifier)
          .maybeSingle();

        const supplied: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(credentials ?? {})) {
          if (v !== '' && v !== null && v !== undefined) supplied[k] = v;
        }
        const finalCredentials: Record<string, any> = {
          ...(existing?.credentials ?? {}),
          ...supplied,
        };

        // Email, Option B: every business gets a unique relay address on the
        // shared sending domain, so inbound mail forwarded to it can be
        // matched back to this business. Minted once, kept stable after.
        if (channel === 'email' && !finalCredentials.relay_address) {
          const sendingDomain = await settingValue(client, 'AURA_SENDING_DOMAIN') || DEFAULT_SENDING_DOMAIN;
          finalCredentials.relay_address = mintRelayAddress(payload.businessId, sendingDomain);
        }

        const { data, error } = await client.from('aura_channels').upsert({
          business_id: payload.businessId,
          channel,
          identifier,
          provider: provider ?? (channel === 'whatsapp' ? 'meta_cloud' : 'resend'),
          credentials: finalCredentials,
          auto_draft: autoDraft !== false,
          auto_send: autoSend === true,
          is_active: true,
        }, { onConflict: 'business_id,channel,identifier' })
          .select('id, channel, identifier, auto_draft, auto_send').single();

        if (error) throw new Error(error.message);

        // relay_address is not a secret — a business needs to see it to set
        // up their forwarding rule — so it's surfaced explicitly, without
        // exposing the rest of credentials (tokens, keys).
        return json({
          success: true,
          channel: { ...data, relay_address: finalCredentials.relay_address ?? null },
        });
      }

      const { data } = await client.from('aura_channels')
        .select('id, channel, identifier, provider, credentials, auto_draft, auto_send, is_active, created_at')
        .eq('business_id', payload.businessId);

      // v1.2 backfill: an email channel connected before relay addresses
      // existed gets one minted here, on read, so the UI always has an
      // address to show and forwarding can be set up.
      const sendingDomain = await settingValue(client, 'AURA_SENDING_DOMAIN') || DEFAULT_SENDING_DOMAIN;
      const sanitized: any[] = [];

      for (const c of (data ?? [])) {
        let relay = c.credentials?.relay_address ?? null;

        if (c.channel === 'email' && !relay) {
          relay = mintRelayAddress(payload.businessId, sendingDomain);
          await client.from('aura_channels')
            .update({ credentials: { ...(c.credentials ?? {}), relay_address: relay } })
            .eq('id', c.id);
        }

        // Same principle as connect: only relay_address escapes credentials,
        // nothing else.
        sanitized.push({
          id: c.id,
          channel: c.channel,
          identifier: c.identifier,
          provider: c.provider,
          auto_draft: c.auto_draft,
          auto_send: c.auto_send,
          is_active: c.is_active,
          created_at: c.created_at,
          relay_address: relay,
        });
      }

      return json({ success: true, channels: sanitized });
    }

    throw new Error(`Unknown action "${action}". Use inbound, draft, list, approve_send, compose, compose_draft or channels.`);

  } catch (error) {
    console.error('[AURA INBOX]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});