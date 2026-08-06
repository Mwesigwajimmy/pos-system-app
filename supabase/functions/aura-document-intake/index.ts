// supabase/functions/aura-document-intake/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"
import * as XLSX from "https://esm.sh/xlsx@0.18.5"

/**
 * --- AURA DOCUMENT INTAKE ---
 * v1.0
 *
 * Reads an uploaded receipt, supplier invoice or bank statement and turns it
 * into structured, checked figures ready for a director to approve.
 *
 * IT PROPOSES. IT DOES NOT POST.
 *
 * The obvious version of this feature reads a receipt and writes an expense.
 * That version is dangerous here, for a reason that has nothing to do with AI:
 * the expenses table currently carries four ledger triggers, two of which call
 * fn_master_tax_ledger_connector on the same AFTER INSERT event. Every row
 * inserted posts its tax entries twice. An AI inserting rows into that table
 * multiplies an existing accounting fault at machine speed, and the resulting
 * ledger would be very hard to unpick.
 *
 * So APPLY_ENABLED is false. Extraction, validation and the proposal are fully
 * built; the insert is one flag away and should stay off until the duplicated
 * triggers are resolved. When you turn it on, the write goes to the ordinary
 * expenses table so your triggers fire exactly as they would from the UI —
 * no bypass, no special path.
 *
 * ARITHMETIC IS DONE IN CODE, NOT BY THE MODEL
 *
 * The model reads the document and returns fields. Every sum, every tax check,
 * every comparison of line items against a stated total is then recomputed
 * here. A language model asked to add up a column will usually be right, and
 * "usually" is not a standard you can put in an accounting system. Where the
 * document's own total disagrees with its lines, the proposal says so rather
 * than quietly adopting one of them.
 *
 * TEXT AND IMAGES
 *
 * PDFs and text documents go through Jina reader, which you already pay for.
 * Photographs go to gemma-4-31B-it, the vision model on your SambaNova account
 * — model string confirmed in the Playground. Images are sent inline as base64
 * rather than as a link, because the provider cannot be assumed to reach a
 * private Supabase URL and a remote-fetch failure on their side surfaces as an
 * unhelpful generic error on ours.
 *
 * v2.0 — what was read can now be PRESENTED and EXPORTED.
 *
 * Extraction alone leaves the director staring at a card. Two things follow
 * naturally from the same data and cost nothing extra:
 *
 *   SLIDES. Built here in the schema AuraBoardroom expects, so a supplier
 *   invoice or a bank statement can be put on screen and narrated. The figures
 *   are the validated ones — the same numbers the card shows, not a second
 *   reading of the document.
 *
 *   SPREADSHEET. Line items or statement rows as a real .xlsx, with the
 *   arithmetic checks on their own sheet so whoever opens it can see what did
 *   and did not reconcile. A statement retyped by hand is where errors enter;
 *   this removes the retyping.
 *
 * Both are derived from the validated extraction, never from a second pass at
 * the model. One reading, one set of numbers, three ways to look at them.
 *
 * CALLING IT
 *   { "action": "extract", "businessId": "...", "userId": "...",
 *     "bucket": "receipts", "path": "<storage path>", "documentType": "auto" }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Writing is off. See the note above — this is an accounting decision, not a
// technical limit. Turn it on after the duplicate expense triggers are fixed.
const APPLY_ENABLED = false;

// Your SambaNova dashboard lists gemma-4-31B-it as Text + Vision. Confirm the
// exact model string in the Playground before enabling — an unrecognised model
// id fails every image and the failure looks like a bad photo.
// Vision is ON. The model string was confirmed in the SambaNova Playground
// (cloud.sambanova.ai -> Playground -> model selector reads gemma-4-31B-it).
// If SambaNova ever retires or renames it, images start failing while PDFs
// carry on working — check the Playground first, and the error message from
// readImageText below will point at the model string when that is the cause.
// Set enabled back to false to switch images off without touching anything else.
const VISION = { enabled: true, model: 'gemma-4-31B-it', maxImageBytes: 5 * 1024 * 1024 };

const TEXT_MODEL = 'Meta-Llama-3.3-70B-Instruct';
const MAX_DOC_CHARS = 24000;
const SIGNED_URL_TTL = 600;

const DOCUMENT_TYPES = ['receipt', 'supplier_invoice', 'bank_statement', 'auto'] as const;
type AuraDocType = typeof DOCUMENT_TYPES[number];

const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
const PDF_EXT = /\.pdf$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function num(v: unknown): number {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(v: unknown): string {
  return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Normalises the many ways a date appears on a printed document. */
function normaliseDate(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // dd/mm/yyyy and dd-mm-yyyy. Day-first is the convention in Uganda and most
  // of the world; month-first would silently mis-date every receipt from the
  // 13th onward and look correct before that.
  const dmy = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    let y = dmy[3];
    if (y.length === 2) y = `20${y}`;
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) return `${y}-${m}-${d}`;
  }

  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const named = s.toLowerCase().match(/(\d{1,2})\s*([a-z]{3,})\s*(\d{4})/);
  if (named) {
    const mi = months.findIndex((m) => named[2].startsWith(m));
    if (mi >= 0) return `${named[3]}-${String(mi + 1).padStart(2, '0')}-${named[1].padStart(2, '0')}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// READING THE DOCUMENT
// ---------------------------------------------------------------------------

async function readPdfText(signedUrl: string, jinaKey: string): Promise<{ text: string; error: string | null }> {
  try {
    const res = await fetch(`https://r.jina.ai/${signedUrl}`, {
      headers: { 'Authorization': `Bearer ${jinaKey}`, 'Accept': 'application/json', 'X-Retain-Images': 'none' },
    });
    if (!res.ok) return { text: '', error: `Reader returned ${res.status}.` };
    const body = await res.json();
    const text = String(body?.data?.content ?? '').slice(0, MAX_DOC_CHARS);
    if (!text.trim()) {
      return { text: '', error: 'The file was read but contained no extractable text. If this is a scanned image inside a PDF, it needs the vision path rather than the text reader.' };
    }
    return { text, error: null };
  } catch (e) {
    return { text: '', error: (e as Error).message };
  }
}

function mimeFor(path: string): string {
  if (/\.png$/i.test(path)) return 'image/png';
  if (/\.webp$/i.test(path)) return 'image/webp';
  if (/\.heic$/i.test(path) || /\.heif$/i.test(path)) return 'image/heic';
  return 'image/jpeg';
}

/** Base64 without blowing the stack on a multi-megabyte photo. */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function readImageText(signedUrl: string, apiKey: string, path: string): Promise<{ text: string; error: string | null }> {
  if (!VISION.enabled) {
    return {
      text: '',
      error: 'This is an image, and the vision path is switched off. Confirm the model string in the SambaNova Playground, then set VISION.enabled to true in aura-document-intake and redeploy.',
    };
  }
  try {
    // The image is sent inline as base64 rather than as a link. The provider
    // cannot be assumed to reach a private Supabase URL, and a remote-fetch
    // failure on their side surfaces as an unhelpful generic error on ours.
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) return { text: '', error: `Could not download the image from storage (${fileRes.status}).` };

    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    if (bytes.length > VISION.maxImageBytes) {
      return { text: '', error: `That image is ${(bytes.length / 1048576).toFixed(1)} MB. Photograph the receipt closer, or reduce it below ${(VISION.maxImageBytes / 1048576).toFixed(0)} MB.` };
    }

    const dataUrl = `data:${mimeFor(path)};base64,${toBase64(bytes)}`;

    const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe every line of text visible in this document exactly as printed, including all numbers, dates and totals. Do not summarise, interpret or correct anything. Output the raw text only.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
        max_tokens: 3000,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      // A wrong model id is by far the most likely cause, and the raw error
      // does not say so.
      const hint = /model/i.test(detail)
        ? ` The model string "${VISION.model}" may be wrong — check the exact id in the SambaNova Playground.`
        : '';
      return { text: '', error: `Vision model returned ${res.status}.${hint} ${detail}` };
    }

    const body = await res.json();
    const text = String(body?.choices?.[0]?.message?.content ?? '').slice(0, MAX_DOC_CHARS);
    return text.trim() ? { text, error: null } : { text: '', error: 'The vision model returned nothing readable. If the photo is blurred or badly lit, take another.' };
  } catch (e) {
    return { text: '', error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// STRUCTURING
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You extract data from business documents. You return JSON and nothing else — no explanation, no markdown fence.

Return exactly this shape:
{
  "documentType": "receipt" | "supplier_invoice" | "bank_statement" | "unknown",
  "vendor": string | null,
  "documentNumber": string | null,
  "documentDate": string | null,
  "currency": string | null,
  "subtotal": number | null,
  "taxAmount": number | null,
  "taxRate": number | null,
  "total": number | null,
  "paymentMethod": string | null,
  "lines": [ { "description": string, "quantity": number | null, "unitPrice": number | null, "amount": number } ],
  "statementPeriodStart": string | null,
  "statementPeriodEnd": string | null,
  "transactions": [ { "date": string, "description": string, "moneyIn": number | null, "moneyOut": number | null, "balance": number | null } ],
  "notes": string | null
}

RULES:
- Copy figures exactly as printed. Do not calculate, correct or reconcile anything — arithmetic is checked elsewhere and your job is faithful transcription.
- Any field you cannot read, return as null. Never guess a value. A null is useful; an invented number is not.
- Use "lines" for receipts and supplier invoices, "transactions" for bank statements. Leave the other empty.
- Dates exactly as printed. Do not reformat.
- Numbers as plain numbers: no currency symbols, no thousands separators.
- If the document is unreadable or is not a business document, set documentType to "unknown" and put the reason in notes.`;

async function structure(text: string, apiKey: string, hint: AuraDocType): Promise<{ data: any; error: string | null }> {
  try {
    const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: `${hint !== 'auto' ? `The uploader says this is a ${hint}.\n\n` : ''}DOCUMENT TEXT:\n\n${text}` },
        ],
        temperature: 0,
        max_tokens: 2500,
      }),
    });
    if (!res.ok) return { data: null, error: `Extraction model returned ${res.status}.` };

    const body = await res.json();
    let raw = String(body?.choices?.[0]?.message?.content ?? '').trim();
    raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return { data: null, error: 'The model did not return JSON.' };

    return { data: JSON.parse(raw.slice(start, end + 1)), error: null };
  } catch (e) {
    return { data: null, error: `Could not parse the extraction: ${(e as Error).message}` };
  }
}

// ---------------------------------------------------------------------------
// VALIDATION — every number recomputed here, never trusted from the model
// ---------------------------------------------------------------------------

function validate(d: any, currencyFallback: string) {
  const checks: { level: 'ok' | 'warn' | 'fail'; message: string }[] = [];

  const lines = Array.isArray(d.lines) ? d.lines : [];
  const txns = Array.isArray(d.transactions) ? d.transactions : [];

  const lineSum = round2(lines.reduce((s: number, l: any) => s + num(l.amount), 0));
  const stated = d.total !== null && d.total !== undefined ? round2(num(d.total)) : null;
  const subtotal = d.subtotal !== null && d.subtotal !== undefined ? round2(num(d.subtotal)) : null;
  const tax = d.taxAmount !== null && d.taxAmount !== undefined ? round2(num(d.taxAmount)) : null;

  if (lines.length > 0 && stated !== null) {
    const diff = round2(stated - lineSum);
    if (Math.abs(diff) < 0.02) {
      checks.push({ level: 'ok', message: `Line items sum to the stated total (${fmt(stated)}).` });
    } else if (tax !== null && Math.abs(round2(lineSum + tax) - stated) < 0.02) {
      checks.push({ level: 'ok', message: `Lines are tax-exclusive: ${fmt(lineSum)} plus tax ${fmt(tax)} matches the total ${fmt(stated)}.` });
    } else {
      checks.push({ level: 'warn', message: `Line items sum to ${fmt(lineSum)} but the document states ${fmt(stated)} — a difference of ${fmt(diff)}. Check before approving.` });
    }
  }

  if (subtotal !== null && tax !== null && stated !== null) {
    const diff = round2(stated - (subtotal + tax));
    if (Math.abs(diff) > 0.02) {
      checks.push({ level: 'warn', message: `Subtotal ${fmt(subtotal)} plus tax ${fmt(tax)} is ${fmt(subtotal + tax)}, not the stated total ${fmt(stated)}.` });
    }
  }

  // Uganda VAT is 18%. Worth checking explicitly, since the same 18% confusion
  // is already causing misrecorded collections elsewhere in this system.
  if (subtotal !== null && tax !== null && subtotal > 0) {
    const impliedRate = round2((tax / subtotal) * 100);
    if (Math.abs(impliedRate - 18) < 0.3) {
      checks.push({ level: 'ok', message: `Tax is ${impliedRate.toFixed(1)}% of the subtotal — consistent with 18% VAT.` });
    } else if (tax > 0) {
      checks.push({ level: 'warn', message: `Tax works out at ${impliedRate.toFixed(1)}% of the subtotal, which is not the standard 18%. Confirm the tax treatment.` });
    }
  }

  const parsedDate = normaliseDate(d.documentDate);
  if (d.documentDate && !parsedDate) {
    checks.push({ level: 'warn', message: `The date "${d.documentDate}" could not be read reliably. Set it manually.` });
  }
  if (parsedDate) {
    const t = new Date(parsedDate).getTime();
    if (t > Date.now() + 86400000) checks.push({ level: 'warn', message: `The document is dated ${parsedDate}, which is in the future.` });
  }

  if (stated === null && lines.length === 0 && txns.length === 0) {
    checks.push({ level: 'fail', message: 'No total and no line items could be read. There is nothing usable to propose.' });
  }
  if (!d.vendor && d.documentType !== 'bank_statement') {
    checks.push({ level: 'warn', message: 'No vendor name was found on the document.' });
  }

  let txnIn = 0, txnOut = 0;
  if (txns.length > 0) {
    txnIn = round2(txns.reduce((s: number, x: any) => s + num(x.moneyIn), 0));
    txnOut = round2(txns.reduce((s: number, x: any) => s + num(x.moneyOut), 0));
    checks.push({ level: 'ok', message: `${txns.length} statement line(s) read: ${fmt(txnIn)} in, ${fmt(txnOut)} out, net ${fmt(txnIn - txnOut)}.` });
  }

  return {
    checks,
    computed: {
      lineSum,
      statedTotal: stated,
      subtotal,
      taxAmount: tax,
      documentDate: parsedDate,
      currency: d.currency || currencyFallback,
      transactionsIn: txnIn,
      transactionsOut: txnOut,
      lineCount: lines.length,
      transactionCount: txns.length,
    },
    blocking: checks.some((c) => c.level === 'fail'),
  };
}

/** What would be written, expressed against the real columns of the real
 *  table, so a director approving it can see exactly what they are agreeing to. */
function buildProposal(d: any, v: any, businessId: string, receiptUrl: string | null) {
  const type = String(d.documentType ?? 'unknown');

  if (type === 'bank_statement') {
    return {
      targetTable: null,
      note: 'Bank statement lines are for reconciliation against existing records, not for insertion. Matching each line to an invoice or expense is the next step and is not built yet.',
      lines: (d.transactions ?? []).map((x: any) => ({
        date: normaliseDate(x.date),
        description: String(x.description ?? '').slice(0, 300),
        moneyIn: num(x.moneyIn),
        moneyOut: num(x.moneyOut),
        balance: x.balance === null || x.balance === undefined ? null : num(x.balance),
      })),
    };
  }

  // A failed validation means nothing readable came out of the file. Offering
  // a zero-value expense anyway invites someone to approve a row built from
  // nothing, so no proposal is made at all.
  if (v.blocking) {
    return {
      targetTable: null,
      note: 'Nothing usable could be read from this file, so there is nothing to propose. If it is a receipt, try a clearer photograph with the whole document in frame.',
    };
  }

  return {
    targetTable: 'expenses',
    // Column names verified against the live schema, not assumed.
    row: {
      business_id: businessId,
      description: String(d.documentNumber ? `${d.vendor ?? 'Supplier'} — ${d.documentNumber}` : (d.vendor ?? 'Uploaded document')).slice(0, 300),
      amount: v.computed.statedTotal ?? v.computed.lineSum,
      category: null,                 // deliberately blank: the director picks it
      vendor_name: d.vendor ?? null,
      payment_status: d.paymentMethod ? 'paid' : null,
      date: v.computed.documentDate,
      currency_code: v.computed.currency,
      receipt_url: receiptUrl,
    },
    unsetFields: ['category'],
    note: 'Category is left blank on purpose. Guessing an expense category puts figures in the wrong place on the P&L, and a wrong classification is harder to spot later than a blank one.',
  };
}

// ---------------------------------------------------------------------------
// PRESENTING AND EXPORTING WHAT WAS READ
// ---------------------------------------------------------------------------

/**
 * Slides in the exact shape AuraBoardroom.tsx expects:
 *   visual_type: 'stats_grid' | 'bar_chart' | 'pie_chart' | 'area_chart'
 *   data_payload: [{ name, value }]  — value is a string for stats_grid,
 *                                      a number for every chart
 * The component reads each slide's `content` aloud, so the document narrates
 * itself.
 */
function buildSlides(d: any, v: any, fileName: string): any[] {
  const cur = v.computed.currency ?? '';
  const money = (n: number) => `${cur} ${Math.round(num(n)).toLocaleString('en-US')}`;
  const slides: any[] = [];
  const lines = Array.isArray(d.lines) ? d.lines : [];
  const txns = Array.isArray(d.transactions) ? d.transactions : [];
  const kind = String(d.documentType ?? 'document').replace(/_/g, ' ');

  slides.push({
    title: d.vendor ? String(d.vendor).slice(0, 60) : 'Document read',
    content: `A ${kind}${v.computed.documentDate ? ` dated ${v.computed.documentDate}` : ''}${d.documentNumber ? `, reference ${d.documentNumber}` : ''}. ${
      v.computed.statedTotal !== null ? `The total is ${money(v.computed.statedTotal)}.` : 'No total could be read from it.'
    }`,
    visual_type: 'stats_grid',
    data_payload: [
      { name: 'Total', value: v.computed.statedTotal !== null ? money(v.computed.statedTotal) : 'not read' },
      { name: 'Subtotal', value: v.computed.subtotal !== null ? money(v.computed.subtotal) : '—' },
      { name: 'Tax', value: v.computed.taxAmount !== null ? money(v.computed.taxAmount) : '—' },
      { name: 'Date', value: v.computed.documentDate ?? 'not read' },
    ],
  });

  if (lines.length > 0) {
    const top = [...lines].sort((a: any, b: any) => num(b.amount) - num(a.amount)).slice(0, 6);
    slides.push({
      title: 'What it is made of',
      content: `${lines.length} line${lines.length > 1 ? 's' : ''}, summing to ${money(v.computed.lineSum)}. The largest is ${String(top[0]?.description ?? 'unnamed').slice(0, 50)} at ${money(top[0]?.amount)}.`,
      visual_type: 'bar_chart',
      data_payload: top.map((l: any) => ({
        name: String(l.description ?? 'Item').slice(0, 20),
        value: Math.round(num(l.amount)),
      })),
    });
  }

  if (txns.length > 0) {
    slides.push({
      title: 'Money in and out',
      content: `${txns.length} statement line${txns.length > 1 ? 's' : ''}: ${money(v.computed.transactionsIn)} in against ${money(v.computed.transactionsOut)} out, a net movement of ${money(v.computed.transactionsIn - v.computed.transactionsOut)}.`,
      visual_type: 'bar_chart',
      data_payload: [
        { name: 'In', value: Math.round(v.computed.transactionsIn) },
        { name: 'Out', value: Math.round(v.computed.transactionsOut) },
        { name: 'Net', value: Math.round(v.computed.transactionsIn - v.computed.transactionsOut) },
      ],
    });
  }

  // Only worth a slide when something actually failed — a slide saying
  // "everything checks out" wastes the director's attention.
  const problems = (v.checks ?? []).filter((c: any) => c.level !== 'ok');
  if (problems.length > 0) {
    slides.push({
      title: 'Check these before you record it',
      content: `${problems.length} thing${problems.length > 1 ? 's did' : ' did'} not add up on this document. Worth resolving before the figures go anywhere.`,
      visual_type: 'stats_grid',
      data_payload: problems.slice(0, 4).map((c: any, i: number) => ({
        name: `Check ${i + 1}`,
        value: String(c.message).slice(0, 70),
      })),
    });
  }

  slides.push({
    title: 'Nothing has been recorded',
    content: `This was read from ${fileName}. No entry has been made in the accounts — the figures are here for you to review and enter yourself.`,
    visual_type: 'stats_grid',
    data_payload: [
      { name: 'Source', value: fileName.slice(0, 40) },
      { name: 'Status', value: 'Read only' },
    ],
  });

  return slides;
}

/** The document as a workbook: the figures, and what did or did not reconcile. */
function buildWorkbook(d: any, v: any, fileName: string): Uint8Array {
  const wb = XLSX.utils.book_new();
  const cur = v.computed.currency ?? '';

  const summary: Record<string, unknown>[] = [
    { Field: 'Source file', Value: fileName },
    { Field: 'Document type', Value: String(d.documentType ?? 'unknown') },
    { Field: 'Vendor', Value: d.vendor ?? '' },
    { Field: 'Reference', Value: d.documentNumber ?? '' },
    { Field: 'Date', Value: v.computed.documentDate ?? '' },
    { Field: 'Currency', Value: cur },
    { Field: 'Subtotal', Value: v.computed.subtotal ?? '' },
    { Field: 'Tax', Value: v.computed.taxAmount ?? '' },
    { Field: 'Total', Value: v.computed.statedTotal ?? '' },
    { Field: 'Line items sum', Value: v.computed.lineSum },
    { Field: 'Read at', Value: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC' },
    { Field: '', Value: '' },
    { Field: 'NOTE', Value: 'Read from a document by Aura. Nothing was recorded in the accounts.' },
  ];
  const sumWs = XLSX.utils.json_to_sheet(summary);
  sumWs['!cols'] = [{ wch: 22 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, sumWs, 'Summary');

  const lines = Array.isArray(d.lines) ? d.lines : [];
  if (lines.length > 0) {
    const ws = XLSX.utils.json_to_sheet(lines.map((l: any) => ({
      Description: l.description ?? '',
      Quantity: l.quantity ?? null,
      UnitPrice: l.unitPrice ?? null,
      Amount: num(l.amount),
    })));
    ws['!cols'] = [{ wch: 46 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
    ws['!autofilter'] = { ref: ws['!ref'] };
    XLSX.utils.book_append_sheet(wb, ws, 'Line items');
  }

  const txns = Array.isArray(d.transactions) ? d.transactions : [];
  if (txns.length > 0) {
    const ws = XLSX.utils.json_to_sheet(txns.map((t: any) => ({
      Date: normaliseDate(t.date) ?? t.date ?? '',
      Description: t.description ?? '',
      MoneyIn: t.moneyIn === null || t.moneyIn === undefined ? null : num(t.moneyIn),
      MoneyOut: t.moneyOut === null || t.moneyOut === undefined ? null : num(t.moneyOut),
      Balance: t.balance === null || t.balance === undefined ? null : num(t.balance),
    })));
    ws['!cols'] = [{ wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    ws['!autofilter'] = { ref: ws['!ref'] };
    XLSX.utils.book_append_sheet(wb, ws, 'Statement');
  }

  // The checks travel with the figures. A spreadsheet that hides the fact
  // that its own numbers did not add up is worse than no spreadsheet.
  const checks = (v.checks ?? []).map((c: any) => ({ Result: c.level.toUpperCase(), Detail: c.message }));
  const checkWs = XLSX.utils.json_to_sheet(checks.length > 0 ? checks : [{ Result: 'OK', Detail: 'No checks were run.' }]);
  checkWs['!cols'] = [{ wch: 10 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, checkWs, 'Checks');

  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

// ---------------------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const started = Date.now();
  try {
    const body = await req.json();
    const action = String(body.action ?? 'extract').toLowerCase();
    const { businessId, userId, bucket, path } = body;
    const documentType: AuraDocType = DOCUMENT_TYPES.includes(body.documentType) ? body.documentType : 'auto';

    if (!businessId) throw new Error('businessId is required.');
    if (!bucket || !path) throw new Error('bucket and path are required — the file must already be uploaded to storage.');

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: tenant } = await sb.from('tenants').select('name, currency').eq('id', businessId).maybeSingle();
    const currencyFallback = tenant?.currency || 'USD';

    // A short-lived signed URL. The reader and the vision model both need to
    // fetch the file, and these buckets are private.
    const { data: signed, error: signErr } = await sb.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
    if (signErr || !signed) throw new Error(`Could not open ${bucket}/${path}: ${signErr?.message ?? 'unknown error'}`);

    const { data: keys } = await sb.from('aura_system_settings')
      .select('key_name, key_value').in('key_name', ['SAMBANOVA_API_KEY', 'JINA_API_KEY']);
    const sambaKey = keys?.find((k: any) => k.key_name === 'SAMBANOVA_API_KEY')?.key_value ?? Deno.env.get('SAMBANOVA_API_KEY') ?? '';
    const jinaKey = keys?.find((k: any) => k.key_name === 'JINA_API_KEY')?.key_value ?? Deno.env.get('JINA_API_KEY') ?? '';
    if (!sambaKey) throw new Error('No SambaNova key available.');

    const isImage = IMAGE_EXT.test(path);
    const isPdf = PDF_EXT.test(path);

    const read = isImage
      ? await readImageText(signed.signedUrl, sambaKey, path)
      : await readPdfText(signed.signedUrl, jinaKey);

    if (read.error || !read.text) {
      return json({
        success: false,
        stage: 'read',
        fileKind: isImage ? 'image' : isPdf ? 'pdf' : 'other',
        error: read.error ?? 'Nothing could be read from the file.',
      }, 200);
    }

    const extracted = await structure(read.text, sambaKey, documentType);
    if (extracted.error || !extracted.data) {
      return json({ success: false, stage: 'extract', error: extracted.error ?? 'Extraction failed.' }, 200);
    }

    const validation = validate(extracted.data, currencyFallback);
    const proposal = buildProposal(extracted.data, validation, businessId, `${bucket}/${path}`);

    // --- APPLY (off) ---
    if (action === 'apply') {
      if (!APPLY_ENABLED) {
        return json({
          success: false,
          stage: 'apply',
          error: 'Writing is disabled. The expenses table currently carries two triggers calling fn_master_tax_ledger_connector on the same INSERT, so every inserted row posts its tax entries twice. Resolve that first, then set APPLY_ENABLED to true.',
          extracted: extracted.data, validation, proposal,
        }, 200);
      }
      if (validation.blocking) {
        return json({ success: false, stage: 'apply', error: 'The document failed validation. Nothing was written.', validation }, 200);
      }
      if (!body.confirmed) {
        return json({ success: false, stage: 'apply', error: 'A director must confirm the proposal before anything is written. Send confirmed: true.', proposal }, 200);
      }
      const { data: inserted, error: insErr } = await sb.from('expenses').insert(proposal.row).select('id').single();
      if (insErr) throw new Error(`Insert failed: ${insErr.message}`);
      return json({ success: true, stage: 'applied', insertedId: inserted?.id, proposal, validation });
    }

    // --- v2.0: the same reading, presented and exported ---
    const slides = validation.blocking ? [] : buildSlides(extracted.data, validation, path.split('/').pop() ?? 'document');

    let spreadsheet: { downloadUrl: string; fileName: string } | null = null;
    if (body.spreadsheet !== false && !validation.blocking) {
      try {
        const bytes = buildWorkbook(extracted.data, validation, path.split('/').pop() ?? 'document');
        const outName = `document_${Date.now()}.xlsx`;
        const outPath = `${businessId}/documents/${outName}`;

        const { error: upErr } = await sb.storage.from('aura-reports').upload(outPath, bytes, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: true,
        });
        if (!upErr) {
          const { data: signed } = await sb.storage.from('aura-reports').createSignedUrl(outPath, 3600);
          if (signed) spreadsheet = { downloadUrl: signed.signedUrl, fileName: outName };
        } else {
          console.warn('[AURA DOC INTAKE] workbook upload failed:', upErr.message);
        }
      } catch (e) {
        // A failed export must not lose the extraction — the figures on the
        // card are the point; the spreadsheet is a convenience.
        console.warn('[AURA DOC INTAKE] workbook build failed:', (e as Error).message);
      }
    }

    return json({
      success: true,
      stage: 'proposed',
      slides,
      boardroom: slides.length > 0 ? {
        presenter_role: 'Auditor',
        meeting_title: `${tenant?.name ?? 'Document'} — ${String(extracted.data.documentType ?? 'document').replace(/_/g, ' ')}`,
        slides,
      } : null,
      spreadsheet,
      businessName: tenant?.name ?? 'Business',
      file: { bucket, path, kind: isImage ? 'image' : isPdf ? 'pdf' : 'other' },
      documentType: extracted.data.documentType,
      extracted: extracted.data,
      validation,
      proposal,
      applyEnabled: APPLY_ENABLED,
      nextStep: APPLY_ENABLED
        ? 'Show the proposal to the director. On approval, call again with action "apply" and confirmed: true.'
        : 'Show the proposal to the director. Writing is switched off, so the figures must be entered through the normal screen for now.',
      durationMs: Date.now() - started,
    });

  } catch (error) {
    console.error('[AURA DOC INTAKE]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});