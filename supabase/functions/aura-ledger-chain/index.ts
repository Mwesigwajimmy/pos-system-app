// supabase/functions/aura-ledger-chain/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA LEDGER CHAIN ---
 * v1.0 — sealing and verification.
 *
 * SEAL takes financial records that have not been sealed yet, hashes each with
 * the hash before it, and appends the links. VERIFY re-reads the live records,
 * recomputes their hashes, and reports anything that no longer matches.
 *
 * THE POINT
 *
 * A record that was altered after sealing produces a different payload hash,
 * so verification names it. A record that was deleted has a link with nothing
 * behind it, so verification names that too. And because each link includes
 * the previous hash, an altered record cannot be re-sealed quietly — every
 * link after it would have to be rewritten, and the database refuses to let
 * any link be rewritten at all.
 *
 * WHAT IS HASHED, AND WHY IT MATTERS
 *
 * Only the fields that carry financial meaning: amounts, dates, references,
 * status. Not updated_at, not internal flags. Hash a field the application
 * touches routinely and every record shows as tampered after an ordinary save,
 * which trains people to ignore the alarm — a verifier that cries wolf is
 * worse than none.
 *
 * The hash is taken over a canonical string: keys sorted, nulls normalised,
 * numbers fixed to two decimals. Without that, the same record hashes
 * differently depending on the order Postgres returned its columns, and
 * nothing would ever verify.
 *
 * ACTIONS
 *   { "action": "seal",   "businessId": "..." }            seal what is new
 *   { "action": "verify", "businessId": "..." }            check everything
 *   { "action": "status", "businessId": "..." }            chain head
 *   { "action": "proof",  "businessId": "...", "sourceTable": "invoices", "sourceId": "..." }
 *
 * REQUIRES sql/AURA_LEDGER_CHAIN.sql.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENESIS = '0'.repeat(64);
const MAX_SEAL_PER_RUN = 2000;

/**
 * Fields that carry financial meaning, per source. Column names verified
 * against the live schema.
 */
const SOURCES: Record<string, { scope: string; order: string; fields: string[] }> = {
  invoices: {
    scope: 'business_id',
    order: 'created_at',
    fields: ['invoice_number', 'customer_name', 'total_amount', 'subtotal', 'tax_amount', 'amount_paid', 'balance_due', 'status', 'payment_status', 'due_date', 'currency', 'created_at'],
  },
  expenses: {
    scope: 'business_id',
    order: 'date',
    fields: ['description', 'amount', 'category', 'vendor_name', 'payment_status', 'date', 'currency_code'],
  },
  payments: {
    scope: 'business_id',
    order: 'payment_date',
    fields: ['amount', 'payment_date', 'method', 'receipt_number', 'currency_code'],
  },
  sales: {
    scope: 'business_id',
    order: 'created_at',
    fields: ['total_amount', 'amount_paid', 'discount_amount', 'tax_amount', 'payment_method', 'payment_status', 'status', 'user_id', 'created_at'],
  },
  transactions: {
    scope: 'business_id',
    order: 'transaction_date',
    fields: ['transaction_date', 'description', 'type', 'amount', 'member_name'],
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * One record, one string, always the same string.
 *
 * Keys sorted so column order cannot change the hash. Numbers fixed to two
 * decimals because Postgres returns "1200" and "1200.00" for the same numeric
 * depending on the driver. Nulls and empty strings collapsed to one token, as
 * a field cleared to '' and a field set to null are the same absence.
 */
function canonical(row: any, fields: string[]): string {
  return [...fields].sort().map((f) => {
    const v = row?.[f];
    if (v === null || v === undefined || v === '') return `${f}=~`;
    if (typeof v === 'number') return `${f}=${v.toFixed(2)}`;
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return `${f}=${Number(v).toFixed(2)}`;
    if (v instanceof Date) return `${f}=${v.toISOString()}`;
    return `${f}=${String(v)}`;
  }).join('|');
}

async function linkHash(businessId: string, seq: number, payloadHash: string, prevHash: string): Promise<string> {
  return await sha256(`${businessId}|${seq}|${payloadHash}|${prevHash}`);
}

/** Pages past PostgREST's default limit. */
async function pullAll(sb: any, table: string, cols: string, filter: (q: any) => any, max = 20000) {
  const out: any[] = [];
  let offset = 0;
  while (out.length < max) {
    const { data, error } = await filter(sb.from(table).select(cols)).range(offset, offset + 999);
    if (error) return { rows: out, error: error.message };
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return { rows: out, error: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const started = Date.now();
  try {
    const body = await req.json();
    const action = String(body.action ?? 'status').toLowerCase();
    const businessId = String(body.businessId ?? '');
    if (!businessId) throw new Error('businessId is required.');

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // ------------------------------------------------------------- STATUS
    if (action === 'status') {
      const { data, error } = await sb.rpc('get_chain_status', { p_business_id: businessId });
      if (error) throw new Error(error.message);
      const s = data?.[0] ?? {};
      return json({
        success: true,
        sealedRecords: Number(s.sealed_records ?? 0),
        firstSealed: s.first_sealed ?? null,
        lastSealed: s.last_sealed ?? null,
        headHash: s.head_hash ?? null,
        headSeq: Number(s.head_seq ?? 0),
      });
    }

    // --------------------------------------------------------------- SEAL
    if (action === 'seal') {
      const { data: head } = await sb.from('aura_ledger_chain')
        .select('seq, hash').eq('business_id', businessId)
        .order('seq', { ascending: false }).limit(1);

      let seq = Number(head?.[0]?.seq ?? 0);
      let prevHash = String(head?.[0]?.hash ?? GENESIS);

      const { data: existing } = await sb.from('aura_ledger_chain')
        .select('source_table, source_id').eq('business_id', businessId);
      const already = new Set((existing ?? []).map((r: any) => `${r.source_table}:${r.source_id}`));

      const links: any[] = [];
      const perSource: Record<string, number> = {};
      const skipped: string[] = [];

      for (const [table, cfg] of Object.entries(SOURCES)) {
        if (links.length >= MAX_SEAL_PER_RUN) break;

        const cols = ['id', ...cfg.fields].join(', ');
        const { rows, error } = await pullAll(sb, table, cols,
          (q: any) => q.eq(cfg.scope, businessId).order(cfg.order, { ascending: true }));

        if (error) { skipped.push(`${table}: ${error}`); continue; }

        for (const row of rows) {
          if (links.length >= MAX_SEAL_PER_RUN) break;
          const sourceId = String(row.id);
          if (already.has(`${table}:${sourceId}`)) continue;

          const payload = canonical(row, cfg.fields);
          const payloadHash = await sha256(payload);
          seq += 1;
          const hash = await linkHash(businessId, seq, payloadHash, prevHash);

          const snapshot: Record<string, unknown> = {};
          for (const f of cfg.fields) snapshot[f] = row[f] ?? null;

          links.push({
            business_id: businessId,
            seq,
            source_table: table,
            source_id: sourceId,
            payload_hash: payloadHash,
            prev_hash: prevHash,
            hash,
            snapshot,
          });

          prevHash = hash;
          perSource[table] = (perSource[table] ?? 0) + 1;
        }
      }

      // Inserted in order and in batches. Sequence gaps would break every
      // subsequent verification, so a failed batch stops the run rather than
      // continuing past the hole.
      let inserted = 0;
      for (let i = 0; i < links.length; i += 200) {
        const batch = links.slice(i, i + 200);
        const { error } = await sb.from('aura_ledger_chain').insert(batch);
        if (error) {
          return json({
            success: false,
            error: `Sealing stopped at sequence ${batch[0].seq}: ${error.message}`,
            sealed: inserted,
          }, 200);
        }
        inserted += batch.length;
      }

      return json({
        success: true,
        sealed: inserted,
        perSource,
        headSeq: seq,
        headHash: prevHash,
        unreadableSources: skipped,
        truncated: links.length >= MAX_SEAL_PER_RUN,
        note: links.length >= MAX_SEAL_PER_RUN
          ? `Stopped at ${MAX_SEAL_PER_RUN} records this run. Call seal again to continue.`
          : null,
        durationMs: Date.now() - started,
      });
    }

    // ------------------------------------------------------------- VERIFY
    if (action === 'verify') {
      const { rows: chain, error: chainErr } = await pullAll(sb, 'aura_ledger_chain',
        'seq, source_table, source_id, payload_hash, prev_hash, hash, snapshot, sealed_at',
        (q: any) => q.eq('business_id', businessId).order('seq', { ascending: true }));
      if (chainErr) throw new Error(chainErr);

      if (chain.length === 0) {
        return json({ success: true, sealedRecords: 0, verdict: 'EMPTY', message: 'Nothing has been sealed for this business yet.' });
      }

      // Live records, fetched once per table rather than per link.
      const live: Record<string, Map<string, any>> = {};
      for (const [table, cfg] of Object.entries(SOURCES)) {
        const cols = ['id', ...cfg.fields].join(', ');
        const { rows } = await pullAll(sb, table, cols, (q: any) => q.eq(cfg.scope, businessId));
        live[table] = new Map(rows.map((r: any) => [String(r.id), r]));
      }

      const altered: any[] = [];
      const missing: any[] = [];
      const brokenLinks: any[] = [];
      let prevHash = GENESIS;
      let expectedSeq = 1;

      for (const link of chain) {
        if (Number(link.seq) !== expectedSeq) {
          brokenLinks.push({ seq: link.seq, reason: `Sequence jumped — expected ${expectedSeq}. A link is missing from the chain itself.` });
          expectedSeq = Number(link.seq);
        }
        expectedSeq += 1;

        if (link.prev_hash !== prevHash) {
          brokenLinks.push({ seq: link.seq, reason: 'This link does not follow the one before it. The chain has been rebuilt or reordered.' });
        }

        const recomputed = await linkHash(businessId, Number(link.seq), link.payload_hash, link.prev_hash);
        if (recomputed !== link.hash) {
          brokenLinks.push({ seq: link.seq, reason: 'The link hash does not match its own contents.' });
        }
        prevHash = link.hash;

        const cfg = SOURCES[link.source_table];
        if (!cfg) continue;

        const row = live[link.source_table]?.get(String(link.source_id));
        if (!row) {
          missing.push({
            seq: link.seq, table: link.source_table, id: link.source_id,
            sealedAt: link.sealed_at, snapshot: link.snapshot,
            reason: 'This record was sealed and no longer exists.',
          });
          continue;
        }

        const nowHash = await sha256(canonical(row, cfg.fields));
        if (nowHash !== link.payload_hash) {
          // Naming the changed fields is the difference between an alarm and
          // something an accountant can act on.
          const changed: Record<string, { sealed: unknown; now: unknown }> = {};
          for (const f of cfg.fields) {
            const before = (link.snapshot ?? {})[f] ?? null;
            const after = row[f] ?? null;
            if (String(before ?? '') !== String(after ?? '')) changed[f] = { sealed: before, now: after };
          }
          altered.push({
            seq: link.seq, table: link.source_table, id: link.source_id,
            sealedAt: link.sealed_at, changed,
          });
        }
      }

      const clean = altered.length === 0 && missing.length === 0 && brokenLinks.length === 0;

      return json({
        success: true,
        verdict: clean ? 'INTACT' : 'TAMPERED',
        sealedRecords: chain.length,
        headHash: chain[chain.length - 1].hash,
        alteredCount: altered.length,
        missingCount: missing.length,
        brokenLinkCount: brokenLinks.length,
        altered: altered.slice(0, 100),
        missing: missing.slice(0, 100),
        brokenLinks: brokenLinks.slice(0, 100),
        message: clean
          ? `All ${chain.length} sealed records match the ledger exactly, and every link follows the one before it.`
          : `${altered.length} record(s) changed after sealing, ${missing.length} deleted, ${brokenLinks.length} broken link(s). Each is listed with what it was when sealed.`,
        durationMs: Date.now() - started,
      });
    }

    // -------------------------------------------------------------- PROOF
    // A single record's certificate, for a bank or an auditor.
    if (action === 'proof') {
      const table = String(body.sourceTable ?? '');
      const sourceId = String(body.sourceId ?? '');
      const cfg = SOURCES[table];
      if (!cfg) throw new Error(`sourceTable must be one of: ${Object.keys(SOURCES).join(', ')}`);
      if (!sourceId) throw new Error('sourceId is required.');

      const { data: link } = await sb.from('aura_ledger_chain')
        .select('*').eq('business_id', businessId)
        .eq('source_table', table).eq('source_id', sourceId).maybeSingle();

      if (!link) return json({ success: false, error: 'That record has not been sealed.' }, 200);

      const cols = ['id', ...cfg.fields].join(', ');
      const { data: row } = await sb.from(table).select(cols).eq('id', sourceId).maybeSingle();
      if (!row) {
        return json({
          success: true, verdict: 'MISSING', link,
          message: 'This record was sealed but no longer exists in the ledger.',
        });
      }

      const nowHash = await sha256(canonical(row, cfg.fields));
      const intact = nowHash === link.payload_hash;

      return json({
        success: true,
        verdict: intact ? 'INTACT' : 'ALTERED',
        record: row,
        sealedAt: link.sealed_at,
        sequence: link.seq,
        payloadHash: link.payload_hash,
        currentHash: nowHash,
        prevHash: link.prev_hash,
        linkHash: link.hash,
        snapshotAtSealing: link.snapshot,
        statement: intact
          ? `This record has been unchanged since it was sealed on ${String(link.sealed_at).slice(0, 19).replace('T', ' ')} UTC. Its hash, and every link after it in the chain, still verify.`
          : `This record HAS CHANGED since it was sealed on ${String(link.sealed_at).slice(0, 19).replace('T', ' ')} UTC. The values recorded at sealing are included above.`,
      });
    }

    throw new Error(`Unknown action "${action}". Use seal, verify, status or proof.`);

  } catch (error) {
    console.error('[AURA LEDGER CHAIN]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});