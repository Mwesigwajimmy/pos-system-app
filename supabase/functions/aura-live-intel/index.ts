// supabase/functions/aura-live-intel/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA LIVE INTEL ---
 * v1.0
 *
 * Aura's window on the outside world: web search, page reading, and live
 * exchange rates. Called by aura-quantum-audit (signed-in directors) and
 * aura-public-concierge (website visitors) when a question needs information
 * that is not in the database and not in the model's training data.
 *
 * WHY THIS IS A SEPARATE FUNCTION
 *
 * It is the only part of the system that talks to the open internet. Keeping
 * it separate means there is exactly one file to audit when asking "what does
 * Aura send outside, and to whom". Both callers pass a plain question string
 * and get back facts. Neither can make this function read a tenant table,
 * because it has no tenant queries in it — the only database call is for the
 * Jina API key.
 *
 * DATA LEAVING THE SYSTEM
 *
 * The single real risk in giving an AI web access is that the outbound query
 * carries private data with it. Aura's prompts contain invoices, staff names,
 * ledger totals and customer balances. If a search string were assembled from
 * that prompt, every question would ship tenant records to a third party.
 *
 * So: sanitiseQuery() below strips UUIDs, long digit runs, currency amounts,
 * email addresses and phone numbers before anything is sent, and callers are
 * built to pass only the user's own typed words — never the business data
 * pack. That is enforced here rather than left to a prompt instruction,
 * because a prompt instruction is a request and code is a guarantee.
 *
 * INBOUND
 *
 * This function reaches out; nothing reaches in. It exposes no tenant data,
 * so a crawler that found the URL would get nothing but a search proxy. The
 * app itself should carry `noindex` headers so authenticated pages never enter
 * a search index in the first place — that is a Next.js concern, not this one.
 *
 * PROVIDERS
 *   Search & page reading : Jina (s.jina.ai, r.jina.ai) — reuses the JINA_API_KEY
 *                           already in aura_system_settings.
 *   Exchange rates        : open.er-api.com — free, no key, covers UGX.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_QUERY_CHARS = 200;
const MAX_RESULTS = 5;
const SNIPPET_CHARS = 600;
const PAGE_CHARS = 6000;
const CACHE_TTL_MS = 15 * 60 * 1000;      // search results
const FX_CACHE_TTL_MS = 60 * 60 * 1000;   // rates move slowly enough

const cache = new Map<string, { at: number; value: any }>();

function cached(key: string, ttl: number): any | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  if (hit) cache.delete(key);
  if (cache.size > 400) {
    for (const [k, v] of cache) if (Date.now() - v.at > CACHE_TTL_MS) cache.delete(k);
  }
  return null;
}

function store(key: string, value: any) {
  cache.set(key, { at: Date.now(), value });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// OUTBOUND SANITISATION
// ---------------------------------------------------------------------------

/**
 * The last line of defence before text leaves the system. Callers are built to
 * pass only what the user typed, but a future change upstream could widen
 * that, so anything record-shaped is removed here regardless of origin.
 */
function sanitiseQuery(raw: string): string {
  let q = String(raw ?? '');

  q = q.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ' ');  // uuids
  q = q.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, ' ');                                        // emails
  q = q.replace(/\+?\d[\d\s().-]{7,}\d/g, ' ');                                          // phone numbers
  q = q.replace(/\b\d[\d,]{5,}(?:\.\d+)?\b/g, ' ');                                      // large amounts / ids
  q = q.replace(/\b(?:INV|DIR|RCP|PO|REF)[-_/]?[A-Z0-9-]{4,}\b/gi, ' ');                 // document numbers
  q = q.replace(/\s+/g, ' ').trim();

  return q.slice(0, MAX_QUERY_CHARS);
}

/**
 * Retrieved web text is untrusted. A page can contain instructions aimed at
 * the model. Neutralising the obvious phrasings costs nothing; the prompt on
 * the caller side also tells the model to treat all of this as quoted material.
 */
function defuse(text: string): string {
  return String(text ?? '')
    .replace(/ignore (all )?(previous|prior|above) instructions/gi, '[removed]')
    .replace(/disregard (your|all) (rules|instructions|guidelines)/gi, '[removed]')
    .replace(/you are now|new instructions:|system prompt:/gi, '[removed]')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// PROVIDERS
// ---------------------------------------------------------------------------

async function webSearch(query: string, jinaKey: string, maxResults: number) {
  const clean = sanitiseQuery(query);
  if (!clean) return { query: clean, results: [], error: 'Query was empty after sanitisation.' };

  const key = `s:${clean}:${maxResults}`;
  const hit = cached(key, CACHE_TTL_MS);
  if (hit) return hit;

  try {
    const res = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(clean)}`, {
      headers: {
        'Authorization': `Bearer ${jinaKey}`,
        'Accept': 'application/json',
        'X-Retain-Images': 'none',
      },
    });
    if (!res.ok) {
      return { query: clean, results: [], error: `Search provider returned ${res.status}.` };
    }
    const body = await res.json();
    const rows = Array.isArray(body?.data) ? body.data : [];

    const results = rows.slice(0, maxResults).map((r: any) => ({
      title: defuse(r.title ?? '').slice(0, 180),
      url: String(r.url ?? ''),
      snippet: defuse(r.description || r.content || '').slice(0, SNIPPET_CHARS),
      published: r.date ?? r.publishedTime ?? null,
    }));

    const out = { query: clean, results, error: null };
    store(key, out);
    return out;
  } catch (e) {
    return { query: clean, results: [], error: (e as Error).message };
  }
}

async function readPage(url: string, jinaKey: string) {
  if (!/^https?:\/\//i.test(url)) return { url, text: '', error: 'Only http and https URLs can be read.' };

  const key = `r:${url}`;
  const hit = cached(key, CACHE_TTL_MS);
  if (hit) return hit;

  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Authorization': `Bearer ${jinaKey}`,
        'Accept': 'application/json',
        'X-Retain-Images': 'none',
      },
    });
    if (!res.ok) return { url, text: '', error: `Reader returned ${res.status}.` };

    const body = await res.json();
    const out = {
      url,
      title: defuse(body?.data?.title ?? '').slice(0, 200),
      text: defuse(body?.data?.content ?? '').slice(0, PAGE_CHARS),
      error: null,
    };
    store(key, out);
    return out;
  } catch (e) {
    return { url, text: '', error: (e as Error).message };
  }
}

async function exchangeRates(base: string, symbols: string[]) {
  const b = (base || 'USD').toUpperCase().slice(0, 3);
  const key = `fx:${b}`;
  let payload = cached(key, FX_CACHE_TTL_MS);

  if (!payload) {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${b}`);
      if (!res.ok) return { base: b, rates: {}, error: `Rate provider returned ${res.status}.` };
      const body = await res.json();
      if (body?.result !== 'success') return { base: b, rates: {}, error: 'Rate provider reported a failure.' };
      payload = { base: b, updated: body.time_last_update_utc ?? null, rates: body.rates ?? {} };
      store(key, payload);
    } catch (e) {
      return { base: b, rates: {}, error: (e as Error).message };
    }
  }

  const wanted = symbols.length > 0
    ? symbols.map((s) => s.toUpperCase().slice(0, 3))
    : ['USD', 'EUR', 'GBP', 'UGX', 'KES', 'TZS', 'RWF', 'NGN', 'ZAR', 'CNY'];

  const rates: Record<string, number> = {};
  for (const s of wanted) {
    if (payload.rates?.[s] !== undefined) rates[s] = payload.rates[s];
  }

  return { base: payload.base, updated: payload.updated, rates, error: null };
}

// ---------------------------------------------------------------------------
// INTENT
// ---------------------------------------------------------------------------

const FX_PATTERN = /\b(exchange\s*rate|forex|fx\b|currency|convert|how much is|worth in|rate of|usd|ugx|kes|tzs|rwf|eur|gbp|ngn|zar|dollar|shilling|euro|pound)\b/i;
const CURRENCY_CODES = /\b(USD|UGX|KES|TZS|RWF|EUR|GBP|NGN|ZAR|CNY|INR|AED|JPY|CAD|AUD|CHF|SAR|EGP|GHS|XOF|XAF)\b/g;

function detectFx(q: string): { base: string; symbols: string[] } | null {
  if (!FX_PATTERN.test(q)) return null;
  const codes = [...new Set((q.toUpperCase().match(CURRENCY_CODES) ?? []))];
  if (codes.length >= 2) return { base: codes[0], symbols: codes.slice(1) };
  if (codes.length === 1) return { base: codes[0], symbols: [] };
  return { base: 'USD', symbols: [] };
}

// ---------------------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = String(body.action ?? 'auto').toLowerCase();
    const query = String(body.query ?? '');
    const maxResults = Math.min(Number(body.maxResults) || 4, MAX_RESULTS);

    let jinaKey = Deno.env.get('JINA_API_KEY') ?? '';
    if (!jinaKey && action !== 'fx') {
      const sb = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } },
      );
      const { data } = await sb.from('aura_system_settings')
        .select('key_value').eq('key_name', 'JINA_API_KEY').maybeSingle();
      jinaKey = data?.key_value ?? '';
    }

    if (action === 'fx') {
      const fx = await exchangeRates(String(body.base ?? 'USD'), Array.isArray(body.symbols) ? body.symbols : []);
      return json({ success: true, fx });
    }

    if (action === 'read') {
      if (!jinaKey) return json({ success: false, error: 'No JINA_API_KEY available.' }, 400);
      const page = await readPage(String(body.url ?? ''), jinaKey);
      return json({ success: true, page });
    }

    if (action === 'search') {
      if (!jinaKey) return json({ success: false, error: 'No JINA_API_KEY available.' }, 400);
      const search = await webSearch(query, jinaKey, maxResults);
      return json({ success: true, search });
    }

    // --- auto: work out what the question needs and fetch it in parallel ---
    const fxIntent = detectFx(query);
    const jobs: Promise<any>[] = [];

    jobs.push(jinaKey ? webSearch(query, jinaKey, maxResults) : Promise.resolve({ query, results: [], error: 'No search key configured.' }));
    jobs.push(fxIntent ? exchangeRates(fxIntent.base, fxIntent.symbols) : Promise.resolve(null));

    const [search, fx] = await Promise.all(jobs);

    // Compact, prompt-ready text. Built here so both callers render live facts
    // identically and neither has to reimplement the formatting.
    const lines: string[] = [];
    if (fx && !fx.error && Object.keys(fx.rates).length > 0) {
      lines.push(`EXCHANGE RATES (base ${fx.base}${fx.updated ? `, updated ${fx.updated}` : ''}):`);
      for (const [code, rate] of Object.entries(fx.rates)) {
        lines.push(`  1 ${fx.base} = ${rate} ${code}`);
      }
      lines.push('');
    }
    if (search?.results?.length > 0) {
      lines.push(`WEB RESULTS for "${search.query}" (retrieved ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC):`);
      search.results.forEach((r: any, i: number) => {
        lines.push(`  [${i + 1}] ${r.title}`);
        lines.push(`      ${r.url}`);
        if (r.published) lines.push(`      published: ${r.published}`);
        lines.push(`      ${r.snippet}`);
      });
    }

    return json({
      success: true,
      query: search?.query ?? sanitiseQuery(query),
      hasResults: (search?.results?.length ?? 0) > 0 || (fx && !fx.error && Object.keys(fx.rates ?? {}).length > 0),
      search,
      fx,
      pack: lines.join('\n'),
    });

  } catch (error) {
    console.error('[AURA LIVE INTEL]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});