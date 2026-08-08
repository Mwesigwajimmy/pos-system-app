// supabase/functions/aura-inbox/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA INBOX ---
 * v1.1 — customer messages in, drafted replies out.
 *
 * ACTIONS
 *   inbound       a provider webhook delivers a message
 *   draft         write a reply for one message
 *   list          the queue, newest first
 *   approve_send  a person approves; only then does anything leave
 *   channels      connect or list a business's numbers and addresses
 *
 * WHY APPROVAL IS NOT OPTIONAL
 *
 * These replies go to customers under the business's own name, from the
 * business's own number. A price quoted wrongly at two in the morning is a
 * commitment the owner has to honour or publicly retract, and they will not
 * have seen it happen. auto_send exists on the channel record for when a
 * business has read a month of drafts and trusts them — it is off by default
 * and should stay off far longer than feels necessary.
 *
 * WHAT THE DRAFT IS BUILT FROM
 *
 * The customer's message, the last few turns of that conversation, and
 * whatever aura-memory recalls for the business — its terms, its prices as
 * stored, its standing instructions. Not the ledger. A reply to a customer
 * should never contain a figure pulled live from the accounts, because the
 * person receiving it is not entitled to see the accounts and the assistant
 * cannot tell which figures are safe to share.
 *
 * SENDING — EMAIL, OPTION B (v1.1)
 *
 * No business needs its own verified sending domain or its own Resend
 * account. Every business's email goes out through one shared, already-
 * verified domain (AURA_SENDING_DOMAIN, e.g. inbox.bbu1.com), with the
 * business's own name as the display name and the business's own real
 * address as reply-to:
 *
 *   From:     "Acme Traders" <replies@inbox.bbu1.com>
 *   Reply-To: info@acmetraders.com
 *
 * The customer sees the business's name; a reply lands in the business's
 * real inbox. Nothing about your platform's name appears. This is what
 * makes onboarding free and instant for any business, regardless of what
 * they use for email (Gmail, Outlook, a custom domain — doesn't matter).
 *
 * RECEIVING — EMAIL, OPTION B (v1.1)
 *
 * Since every business shares one receiving domain, each one is given a
 * unique relay address on it (credentials.relay_address, auto-generated on
 * connect — no schema change, it just lives inside the existing jsonb
 * credentials column). The business sets up ONE forwarding rule in their own
 * mail provider — Outlook, Gmail, whatever — from their real address to
 * that relay address. Resend's webhook then delivers to this function, and
 * resolveBusiness() matches the relay address back to the right business.
 *
 * A business that later wants their own domain fully verified for sending
 * (so the from-address is literally their own) can still do that later —
 * this shared-domain path is the free default that works for everyone from
 * day one, not the ceiling.
 *
 * SENDING — WHATSAPP
 *
 * Goes through Meta's Cloud API. Each business stores its own credentials on
 * its own channel row, because one shared account would route one
 * customer's replies from another customer's number.
 *
 * REQUIRES sql/AURA_INBOX.sql (unchanged — no migration needed for v1.1)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
};

const CHAT_MODEL = 'Meta-Llama-3.3-70B-Instruct';
const MAX_DRAFT_TOKENS = 500;
const THREAD_CONTEXT = 6;         // previous messages given to the drafter

// The one domain every business's outbound and inbound email shares, unless
// overridden via AURA_SENDING_DOMAIN (env var or aura_system_settings row).
// This must be a domain verified in Resend for both sending and receiving.
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
      if (!value?.messages) continue;      // statuses arrive here too

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

  // "Name <address@example.com>" or a bare address.
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
 * For email (v1.1): a message can arrive addressed either to the business's
 * own real address (identifier — relevant if a business later verifies its
 * own domain) or to its relay address on the shared sending domain
 * (credentials.relay_address — the normal path for everyone today).
 */
async function resolveBusiness(client: any, channel: string, identifier: string) {
  const cleaned = channel === 'whatsapp'
    ? identifier.replace(/[^\d]/g, '')          // +256 700 123 456 -> 256700123456
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
// DRAFTING
// ---------------------------------------------------------------------------

async function draftReply(client: any, message: any, businessName: string, currency: string): Promise<{ draft: string; error?: string }> {
  const apiKey = await settingValue(client, 'SAMBANOVA_API_KEY');
  if (!apiKey) return { draft: '', error: 'No SAMBANOVA_API_KEY available.' };

  // The conversation so far, so a reply does not repeat what was said an hour
  // ago or answer a question that has already been answered.
  const { data: history } = await client.from('aura_messages')
    .select('direction, body, draft_reply, status, created_at')
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

  // What the business has told Aura about itself: terms, prices, policies.
  let recalled = '';
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/aura-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        action: 'recall',
        businessId: message.business_id,
        query: message.body,
        limit: 4,
        minSimilarity: 0.35,
      }),
    });
    const out = await res.json();
    if (out?.success && out.found > 0) recalled = out.pack;
  } catch (e) {
    // A reply without recall is worse but still useful; a reply that never
    // arrives because recall failed is not.
    console.warn('[AURA INBOX] recall unavailable:', (e as Error).message);
  }

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

  try {
    const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `The customer${message.counterparty_name ? ` (${message.counterparty_name})` : ''} wrote:\n\n${message.body}` },
        ],
        temperature: 0.4,
        max_tokens: MAX_DRAFT_TOKENS,
      }),
    });

    if (!res.ok) return { draft: '', error: `Drafting model returned ${res.status}: ${(await res.text()).slice(0, 200)}` };

    const out = await res.json();
    const draft = String(out?.choices?.[0]?.message?.content ?? '').trim()
      .replace(/^["']|["']$/g, '');

    return draft ? { draft } : { draft: '', error: 'The model returned nothing.' };
  } catch (e) {
    return { draft: '', error: (e as Error).message };
  }
}

/**
 * Writes a fresh outbound email — not a reply to any specific customer, no
 * thread history to draw on. Used by the standalone "New email" composer.
 */
async function draftCompose(client: any, businessId: string, prompt: string, businessName: string, currency: string): Promise<{ subject: string; body: string; error?: string }> {
  const apiKey = await settingValue(client, 'SAMBANOVA_API_KEY');
  if (!apiKey) return { subject: '', body: '', error: 'No SAMBANOVA_API_KEY available.' };

  let recalled = '';
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/aura-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ action: 'recall', businessId, query: prompt, limit: 4, minSimilarity: 0.35 }),
    });
    const out = await res.json();
    if (out?.success && out.found > 0) recalled = out.pack;
  } catch (e) {
    console.warn('[AURA INBOX] recall unavailable for compose:', (e as Error).message);
  }

  const system = `You are writing a fresh email on behalf of ${businessName} — not a reply to anyone, a new message the business is initiating.

You are writing AS the business. Never say you are an AI, never mention that a draft was generated.

Plain, direct, short. No filler, no "we are pleased to inform you."

${recalled ? `WHAT THIS BUSINESS HAS ON RECORD:\n${recalled}\n` : ''}
Currency, if relevant: ${currency}.

Respond in exactly this format and nothing else:
SUBJECT: <a short subject line>
BODY: <the email body>`;

  try {
    const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: MAX_DRAFT_TOKENS,
      }),
    });
    if (!res.ok) return { subject: '', body: '', error: `Drafting model returned ${res.status}: ${(await res.text()).slice(0, 200)}` };

    const out = await res.json();
    const raw = String(out?.choices?.[0]?.message?.content ?? '').trim();
    const subjectMatch = raw.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = raw.match(/BODY:\s*([\s\S]+)/i);
    return {
      subject: subjectMatch?.[1]?.trim() ?? '',
      body: (bodyMatch?.[1]?.trim() ?? raw).replace(/^["']|["']$/g, ''),
    };
  } catch (e) {
    return { subject: '', body: '', error: (e as Error).message };
  }
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
 * Email — Option B. Sends from the shared, already-verified sending domain,
 * branded with the business's own name, replying to the business's real
 * address. A business's own resend_api_key (if it ever adds one under
 * Option A) still overrides the shared key; the from-domain logic here is
 * independent of that and always uses AURA_SENDING_DOMAIN unless the
 * channel itself carries a verified from_domain override in credentials.
 */
async function sendEmail(
  client: any,
  channel: any,
  to: string,
  subject: string,
  text: string,
  businessName?: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const apiKey = channel?.credentials?.resend_api_key || await settingValue(client, 'RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'No Resend API key configured.' };

  const sendingDomain = channel?.credentials?.verified_from_domain
    || await settingValue(client, 'AURA_SENDING_DOMAIN')
    || DEFAULT_SENDING_DOMAIN;

  const displayName = (businessName || 'Support').replace(/["<>]/g, '');
  const from = `${displayName} <replies@${sendingDomain}>`;
  const replyTo = channel?.identifier || undefined;

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

    // ------------------------------------------------------------ CHANNELS
    if (action === 'channels') {
      if (!payload.businessId) throw new Error('businessId is required.');

      if (payload.connect) {
        const { channel, identifier, provider, credentials, autoDraft, autoSend } = payload.connect;
        if (!channel || !identifier) throw new Error('channel and identifier are required.');

        const finalCredentials = { ...(credentials ?? {}) };

        // Email, Option B: every business gets a unique relay address on the
        // shared sending domain, so inbound mail forwarded to it can be
        // matched back to this business. Generated once, kept stable after.
        if (channel === 'email' && !finalCredentials.relay_address) {
          const sendingDomain = await settingValue(client, 'AURA_SENDING_DOMAIN') || DEFAULT_SENDING_DOMAIN;
          const slug = String(payload.businessId).replace(/-/g, '').slice(0, 12);
          finalCredentials.relay_address = `biz-${slug}@${sendingDomain}`;
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

      // Same principle on the read path: only relay_address escapes
      // credentials, nothing else.
      const sanitized = (data ?? []).map((c: any) => ({
        id: c.id,
        channel: c.channel,
        identifier: c.identifier,
        provider: c.provider,
        auto_draft: c.auto_draft,
        auto_send: c.auto_send,
        is_active: c.is_active,
        created_at: c.created_at,
        relay_address: c.credentials?.relay_address ?? null,
      }));

      return json({ success: true, channels: sanitized });
    }

    throw new Error(`Unknown action "${action}". Use inbound, draft, list, approve_send or channels.`);

  } catch (error) {
    console.error('[AURA INBOX]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});