// supabase/functions/aura-memory/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA MEMORY ---
 * v1.1 — remembering, and being able to find it again.
 *
 * v1.1 fixes a silent failure worth understanding, because it will recur
 * anywhere pgvector meets PostgREST: the query embedding was sent as a JS
 * array. supabase-js serialises that as a JSON array, PostgREST's cast to
 * `vector` yields null, and every comparison against null returns null. The
 * request succeeds, matches nothing, and reports no error.
 *
 * It cost an hour to find because every individual part tested clean — the
 * store, the index, the dimensions, the SQL function called directly. Only
 * asking recall to match a sentence against a byte-identical copy of itself
 * showed it, because that is a query no working search can fail.
 *
 * Built on ai_knowledge, which already exists with the right shape and 20,130
 * rows in it. Embeddings come from Jina, using the key already in
 * aura_system_settings — jina-embeddings-v3 produces 1024 dimensions, which
 * is exactly what the embedding column was declared as.
 *
 * ACTIONS
 *   stats     what is stored, how much is searchable, how much is duplicated
 *   backfill  embed rows that have text but no embedding
 *   remember  store something new
 *   recall    find what is relevant to a question
 *   forget    remove a memory
 *
 * WHY 17,681 ROWS HAVE TEXT AND ONLY 3,608 ARE SEARCHABLE
 *
 * An unembedded row is invisible to recall. It is not an error and nothing
 * reports it — the search simply returns what it can see and the rest may as
 * well not exist. `backfill` fixes that, in batches, resumable.
 *
 * WHAT MEMORY IS NOT
 *
 * The model does not learn. Its weights do not change and nothing here alters
 * them. What this does is store text and find the relevant piece again, so it
 * can be put in front of the model when it matters. That is what every system
 * described as "learning from your conversations" actually does, and calling
 * it recall rather than learning keeps expectations where they belong.
 *
 * A memory is also not evidence. Something Aura was told in March is not a
 * ledger figure, and directive 8 in the chat function still governs: computed
 * numbers beat remembered ones, always.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMBED_MODEL = 'jina-embeddings-v3';
const EMBED_DIMENSIONS = 1024;      // must match vector(1024) on the column
// Jina's ceiling is a TOKEN rate, not a request rate: 100,000 per minute on
// this plan. Sixty-four passages at up to 8,000 characters is roughly 128,000
// tokens in one call — over the whole minute's budget in a single request.
// Batch size alone cannot fix that; the run has to pace itself.
const BATCH = 20;
const MAX_TEXT_CHARS = 3000;        // ~750 tokens; longer adds little to recall
const TOKENS_PER_MINUTE = 85000;    // headroom under 100k for other callers
const MAX_BACKFILL_PER_RUN = 1000;

/** Rough but adequate: English averages close to four characters per token. */
const estimateTokens = (texts: string[]) =>
  Math.ceil(texts.reduce((sum, t) => sum + t.length, 0) / 4);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const GLOBAL_BUSINESS = '00000000-0000-0000-0000-000000000000';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** The text a row should be searched by, whatever shape its content is in. */
function textOf(row: any): string {
  const c = row?.content;
  if (!c) return '';
  if (typeof c === 'string') return c;
  const candidate = c.raw_text ?? c.text ?? c.body ?? c.summary ?? '';
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  // Nothing named — fall back to the whole object rather than skipping the row.
  try { return JSON.stringify(c).slice(0, 4000); } catch (_e) { return ''; }
}

/**
 * Embeds text through Jina.
 *
 * `task` matters more than it looks: a question and the passage that answers
 * it are different kinds of text, and telling the model which is which
 * measurably improves matching. Using the same task for both is the most
 * common way retrieval quietly underperforms.
 */
async function embed(texts: string[], apiKey: string, task: 'retrieval.query' | 'retrieval.passage'): Promise<number[][]> {
  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      task,
      dimensions: EMBED_DIMENSIONS,
      input: texts.map((t) => t.slice(0, MAX_TEXT_CHARS)),
    }),
  });

  if (!res.ok) throw new Error(`Embedding failed (${res.status}): ${(await res.text()).slice(0, 200)}`);

  const body = await res.json();
  const vectors = (body?.data ?? []).map((d: any) => d.embedding);
  if (vectors.length !== texts.length) {
    throw new Error(`Asked for ${texts.length} embeddings and received ${vectors.length}.`);
  }
  // A dimension mismatch inserts cleanly and then never matches anything —
  // silent and very hard to diagnose later. Caught here instead.
  if (vectors[0]?.length !== EMBED_DIMENSIONS) {
    throw new Error(`Model returned ${vectors[0]?.length} dimensions; the column expects ${EMBED_DIMENSIONS}.`);
  }
  return vectors;
}

async function jinaKey(sb: any): Promise<string> {
  const fromEnv = Deno.env.get('JINA_API_KEY');
  if (fromEnv) return fromEnv;
  const { data } = await sb.from('aura_system_settings')
    .select('key_value').eq('key_name', 'JINA_API_KEY').maybeSingle();
  const key = data?.key_value ?? '';
  if (!key) throw new Error('No JINA_API_KEY in aura_system_settings.');
  return key;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const started = Date.now();
  try {
    const body = await req.json();
    const action = String(body.action ?? 'stats').toLowerCase();
    const businessId = body.businessId ? String(body.businessId) : null;

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // -------------------------------------------------------------- STATS
    if (action === 'stats') {
      const { count: total } = await sb.from('ai_knowledge').select('*', { count: 'exact', head: true });
      const { count: embedded } = await sb.from('ai_knowledge')
        .select('*', { count: 'exact', head: true }).not('embedding', 'is', null);

      let scoped = null;
      if (businessId) {
        const { count } = await sb.from('ai_knowledge')
          .select('*', { count: 'exact', head: true }).eq('business_id', businessId);
        scoped = count ?? 0;
      }

      const searchable = total ? Math.round(((embedded ?? 0) / total) * 100) : 0;

      return json({
        success: true,
        total: total ?? 0,
        embedded: embedded ?? 0,
        awaitingEmbedding: (total ?? 0) - (embedded ?? 0),
        percentSearchable: searchable,
        forThisBusiness: scoped,
        note: searchable < 90
          ? `Only ${searchable}% of what is stored can be found. The rest is invisible to recall until it is embedded — run backfill.`
          : 'Effectively all stored knowledge is searchable.',
      });
    }

    // ----------------------------------------------------------- BACKFILL
    if (action === 'backfill') {
      const key = await jinaKey(sb);
      const limit = Math.min(Number(body.limit) || 200, MAX_BACKFILL_PER_RUN);

      let query = sb.from('ai_knowledge')
        .select('id, content, content_type, business_id')
        .is('embedding', null)
        .limit(limit);

      // Embedding one tenant at a time keeps a large backfill controllable.
      if (businessId) query = query.eq('business_id', businessId);

      const { data: rows, error } = await query;
      if (error) throw new Error(error.message);
      if (!rows?.length) {
        return json({ success: true, embedded: 0, remaining: 0, message: 'Everything with text is already embedded.' });
      }

      const usable = rows.map((r: any) => ({ row: r, text: textOf(r) }))
        .filter((x) => x.text.length >= 20);
      const skipped = rows.length - usable.length;

      let embeddedCount = 0;
      const failures: any[] = [];

      // Token budget for the current minute, refilled as the window rolls.
      let windowStart = Date.now();
      let tokensThisWindow = 0;
      let pausedMs = 0;

      for (let i = 0; i < usable.length; i += BATCH) {
        const batch = usable.slice(i, i + BATCH);
        const texts = batch.map((b) => b.text.slice(0, MAX_TEXT_CHARS));
        const tokens = estimateTokens(texts);

        // Reset the window once a minute has passed.
        if (Date.now() - windowStart >= 60_000) {
          windowStart = Date.now();
          tokensThisWindow = 0;
        }

        // Would this batch exceed the minute's budget? Wait for the window to
        // roll rather than sending it and being refused — a 429 costs the
        // whole batch, and this costs a few seconds.
        if (tokensThisWindow + tokens > TOKENS_PER_MINUTE) {
          const waitFor = Math.max(0, 60_000 - (Date.now() - windowStart)) + 500;
          pausedMs += waitFor;
          await sleep(waitFor);
          windowStart = Date.now();
          tokensThisWindow = 0;
        }

        try {
          // Stored content is what gets searched THROUGH, so it is a passage.
          const vectors = await embed(texts, key, 'retrieval.passage');
          tokensThisWindow += tokens;

          for (let j = 0; j < batch.length; j++) {
            const { error: upErr } = await sb.from('ai_knowledge')
              // Same literal form on the way in. Writes happened to work as an
              // array, but relying on two different representations for the
              // same column is how one of them quietly stops working later.
              .update({ embedding: `[${vectors[j].join(',')}]`, updated_at: new Date().toISOString() })
              .eq('id', batch[j].row.id);
            if (upErr) failures.push({ id: batch[j].row.id, reason: upErr.message });
            else embeddedCount += 1;
          }
        } catch (e) {
          const message = (e as Error).message;

          // A rate limit is worth waiting out once — the alternative is
          // stopping a run that would finish on its own in under a minute.
          if (message.includes('429')) {
            await sleep(62_000);
            pausedMs += 62_000;
            windowStart = Date.now();
            tokensThisWindow = 0;
            try {
              const vectors = await embed(texts, key, 'retrieval.passage');
              tokensThisWindow += tokens;
              for (let j = 0; j < batch.length; j++) {
                const { error: upErr } = await sb.from('ai_knowledge')
                  .update({ embedding: `[${vectors[j].join(',')}]`, updated_at: new Date().toISOString() })
                  .eq('id', batch[j].row.id);
                if (upErr) failures.push({ id: batch[j].row.id, reason: upErr.message });
                else embeddedCount += 1;
              }
              continue;
            } catch (retryErr) {
              failures.push({ from: i, count: batch.length, reason: `After waiting out the rate limit: ${(retryErr as Error).message}` });
              break;
            }
          }

          failures.push({ from: i, count: batch.length, reason: message });
          break;   // anything else is usually the key or the account; stop
        }
      }

      const { count: remaining } = await sb.from('ai_knowledge')
        .select('*', { count: 'exact', head: true }).is('embedding', null);

      return json({
        success: failures.length === 0,
        embedded: embeddedCount,
        skippedAsEmpty: skipped,
        remaining: remaining ?? 0,
        failures,
        pausedForRateLimitMs: pausedMs,
        note: (remaining ?? 0) > 0
          ? `${remaining} rows still unembedded. Call backfill again — it is resumable and picks up where it stopped.`
          : 'Everything usable is now searchable.',
        durationMs: Date.now() - started,
      });
    }

    // ----------------------------------------------------------- REMEMBER
    if (action === 'remember') {
      const text = String(body.text ?? '').trim();
      if (text.length < 10) throw new Error('There is not enough text to be worth remembering.');

      const key = await jinaKey(sb);
      const [vector] = await embed([text], key, 'retrieval.passage');

      const { data, error } = await sb.from('ai_knowledge').insert({
        business_id: body.global === true ? GLOBAL_BUSINESS : businessId,
        content: { raw_text: text, ...(body.meta ?? {}) },
        content_type: String(body.contentType ?? 'learned_note'),
        source: String(body.source ?? 'aura'),
        embedding: `[${vector.join(',')}]`,
        // Something true this quarter is not true forever. An expiry on
        // time-bound facts is what stops a memory store slowly filling with
        // confident, stale answers.
        valid_until: body.validUntil ?? null,
        metadata: body.metadata ?? {},
      }).select('id').single();

      if (error) throw new Error(error.message);
      return json({ success: true, id: data?.id, remembered: text.slice(0, 200) });
    }

    // ------------------------------------------------------------- RECALL
    if (action === 'recall') {
      const question = String(body.query ?? '').trim();
      if (!question) throw new Error('query is required.');
      if (!businessId) throw new Error('businessId is required.');

      const key = await jinaKey(sb);

      // The SAME task as stored text, deliberately.
      //
      // The pair 'retrieval.query' and 'retrieval.passage' is meant to align —
      // that is the whole point of task adapters. In this account they do not:
      // recalling a stored sentence using its own text returned nothing, while
      // recalling it with its own stored vector returned 1.000. Identical text,
      // and the only difference was the task. Two adapters producing
      // near-orthogonal vectors give exactly that, and it fails silently
      // because there is no error anywhere — just a similarity too low to
      // clear any threshold.
      //
      // Embedding both sides identically guarantees one space. It gives up a
      // few points of theoretical retrieval quality and buys a system that
      // actually finds things.
      const [vector] = await embed([question], key, 'retrieval.passage');

      // The vector goes over the wire as a STRING, not an array.
      //
      // supabase-js serialises a JS array as a JSON array, and PostgREST casts
      // that to `vector` inconsistently. When the cast yields null every
      // comparison returns null — so the query succeeds, matches nothing, and
      // reports no error. That is precisely what happened here: recall could
      // not match a stored sentence against a byte-identical copy of itself,
      // while calling the same SQL function directly returned 1.000.
      //
      // pgvector's own literal form is '[0.1,0.2,...]', and passing that
      // leaves no cast to guess at.
      const queryLiteral = `[${vector.join(',')}]`;

      const { data, error } = await sb.rpc('match_ai_knowledge', {
        p_business_id: businessId,
        p_query: queryLiteral,
        p_limit: Math.min(Number(body.limit) || 6, 25),
        // ?? rather than ||: zero is falsy, so || quietly replaced a requested
        // threshold of 0 with 0.35 — which made "turn the threshold off"
        // impossible to actually test.
        p_min_similarity: body.minSimilarity !== undefined && body.minSimilarity !== null
          ? Number(body.minSimilarity) : 0.35,
        p_content_types: body.contentTypes ?? null,
      });

      if (error) throw new Error(error.message);

      const memories = (data ?? []).map((m: any) => ({
        id: m.id,
        text: textOf(m),
        contentType: m.content_type,
        source: m.source,
        scope: m.business_id === businessId ? 'this business' : 'general',
        similarity: Math.round((m.similarity ?? 0) * 100) / 100,
        storedAt: m.created_at,
      }));

      return json({
        success: true,
        found: memories.length,
        memories,
        // A zero result with a healthy store means something upstream is
        // wrong, not that nothing is relevant. These make that visible rather
        // than leaving it looking like a poor match.
        diagnostics: memories.length === 0 ? {
          queryDimensions: vector.length,
          minSimilarity: body.minSimilarity !== undefined && body.minSimilarity !== null
            ? Number(body.minSimilarity) : 0.35,
          // The actual numbers. A vector of zeros makes cosine distance NaN,
          // every comparison then fails, and the result is an empty set with
          // no error — indistinguishable from a search that simply found
          // nothing. These three values tell the two apart at a glance.
          firstThreeValues: vector.slice(0, 3),
          magnitude: Math.sqrt(vector.reduce((s: number, v: number) => s + v * v, 0)).toFixed(4),
          allZero: vector.every((v: number) => v === 0),
          anyNaN: vector.some((v: number) => !Number.isFinite(v)),
          literalPrefix: `[${vector.slice(0, 2).join(',')}...`,
          note: 'Nothing matched. If magnitude is 0 or anyNaN is true, the embedding is the problem, not the search.',
        } : undefined,
        // Prompt-ready, and labelled as recall rather than fact so the model
        // does not present a remembered figure as a computed one.
        pack: memories.length > 0
          ? `--- RECALLED FROM MEMORY (previously stored, not computed now) ---\n${
              memories.map((m: any, i: number) => `[${i + 1}] (${m.scope}, ${Math.round(m.similarity * 100)}% match) ${m.text.slice(0, 600)}`).join('\n')
            }\n--- END RECALL ---`
          : '',
        durationMs: Date.now() - started,
      });
    }

    // ------------------------------------------------------------- FORGET
    if (action === 'forget') {
      if (!body.id) throw new Error('id is required.');
      const { error } = await sb.from('ai_knowledge').delete().eq('id', body.id);
      if (error) throw new Error(error.message);
      return json({ success: true, forgotten: body.id });
    }

    throw new Error(`Unknown action "${action}". Use stats, backfill, remember, recall or forget.`);

  } catch (error) {
    console.error('[AURA MEMORY]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});