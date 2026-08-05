// supabase/functions/aura-quantum-audit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- BBU1 AURA QUANTUM EDGE MOTHERBOARD ---
 * VERSION: v31.0 OMEGA-ULTIMATUM (REPORT INTENT + STRUCTURED FILE DELIVERY)
 *
 * Wire format verified against installed ai@6.0.190 source
 * (uiMessageChunkSchema, process-ui-message-stream, JsonToSseTransformStream).
 *
 * v29.0: Added per-user rate limiting via check_and_increment_aura_usage(),
 * an atomic Postgres function (row-locked per user) that enforces a daily
 * request cap and a short cooldown between consecutive requests. This runs
 * before any paid API call (Jina, SambaNova), so a limited user never
 * consumes budget. Limit-exceeded responses are surfaced as a normal
 * `error` chunk through the existing SSE stream, so they render in the
 * chat UI exactly like any other error — no separate handling needed
 * on the frontend.
 *
 * v29.1: Fixed SSE stream parsing. Previously each network read from the
 * SambaNova stream was decoded and split on '\n' in isolation — but a
 * single upstream `data: {...}` event can span multiple reads, so a chunk
 * boundary landing mid-JSON silently threw inside an empty catch block and
 * dropped that fragment of text entirely (visible in the UI as words
 * fusing together mid-sentence). Fixed by carrying an incomplete trailing
 * line forward across reads (sseBuffer) so every `data: ` line is only
 * parsed once it's complete. Also softened system prompt directive #4 so
 * plain greetings ("good morning") get a greeting back instead of being
 * forced into full forensic/strategic output every time.
 *
 * v30.0: Report intent resolution rebuilt. The previous detector recognised
 * five report types and required a format word AND a type word in the same
 * message, so "email me my accounts" or "export the aging report" produced
 * nothing and the model had to explain it couldn't help. It now resolves all
 * 21 report types the report engine supports, three multi-section packs
 * (executive / financial / operations), three formats (pdf, xlsx, csv), and
 * natural-language reporting periods ("last quarter", "in March", "past 6
 * months", "2025-01-01 to 2025-06-30"). Generation is still fully
 * deterministic — the model never decides to produce a link, and a file is
 * only made when the director's own words ask for one.
 *
 * Also passes the generated file's key figures back into the system prompt so
 * Aura can summarise what is inside the report instead of only handing over a
 * URL, and surfaces any sections the engine could not fill.
 *
 * v31.0: The download link is no longer dumped into the chat as raw text.
 * A signed Supabase URL carries an embedded JWT, so streaming it verbatim put
 * roughly 400 characters of token in front of the director where they expected
 * a button.
 *
 * The file is now emitted as a structured SSE part (`data-reportFile`) that the
 * frontend can render as a download card, and the model is told not to print
 * the URL at all. Behaviour is controlled by REPORT_DELIVERY.mode below:
 *
 *   'card'     - emits the card part only; the model never mentions a URL.
 *                CURRENT SETTING. CopilotContext lifts the part onto the
 *                message as `reportFile`, and CopilotPanel renders it as a
 *                download card inside the assistant bubble.
 *   'both'     - emits the card part AND has the model write a markdown link.
 *   'markdown' - no card part; the model writes a markdown link only. Use this
 *                to roll back without touching any React.
 *
 * The card part is harmless if the frontend ignores it — unknown part types are
 * skipped by the AI SDK, so nothing breaks in any mode.
 *
 * Everything else in v29.1 — the SSE buffering fix, the rate limit gate, the
 * live business data pack, and all six executive directives — is unchanged.
 */

const DAILY_LIMIT = 200;
const COOLDOWN_SECONDS = 3;

// How the finished report is handed to the director.
// 'card' — the file arrives as a data-reportFile part and CopilotPanel draws
// the download card. Set to 'markdown' to fall back to a link in the reply
// text, or 'both' to emit the part and a link together.
type ReportLinkMode = 'both' | 'card' | 'markdown';
const REPORT_DELIVERY: { mode: ReportLinkMode } = { mode: 'card' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bbu1-vault-id, x-bbu1-director-id, x-bbu1-path',
  'Access-Control-Expose-Headers': 'x-vercel-ai-ui-message-stream',
}

const streamHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'x-vercel-ai-ui-message-stream': 'v1',
  'x-accel-buffering': 'no',
};

function extractText(message: any): string {
  if (!message) return "";
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  }
  return "";
}

function sseFrame(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/** Emits a minimal, well-formed stream containing only a start/error/finish
 *  sequence — used for early exits (rate limit, missing identity, etc.)
 *  so every failure path still produces a valid UI Message Stream. */
function earlyErrorStream(encoder: TextEncoder, message: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseFrame({ type: 'start' })));
      controller.enqueue(encoder.encode(sseFrame({ type: 'error', errorText: message })));
      controller.enqueue(encoder.encode(sseFrame({ type: 'finish' })));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
}

// ---------------------------------------------------------------------------
// REPORT INTENT RESOLUTION (v30.0)
// ---------------------------------------------------------------------------
// Deterministic, not LLM-decided. The model never fabricates a download link;
// a real file is only generated when the director's own words ask for one.
// Every type here must exist in aura-generate-report's registry.

type ReportFormat = 'pdf' | 'xlsx' | 'csv';

interface ReportIntent {
  type: string;
  format: ReportFormat;
  dateFrom: string | null;
  dateTo: string | null;
}

interface ReportDownload {
  downloadUrl: string;
  fileName: string;
  reportType: string;
  format: string;
  title: string;
  scope: string;
  rowCount: number;
  summary: string[];
  warnings: string[];
}

/** Ordered — first match wins, so specific phrases sit above generic ones. */
const REPORT_MATCHERS: [RegExp, string][] = [
  [/\b(everything|all\s+(the\s+)?reports?|full\s+(report|pack|set)|complete\s+report|executive\s+(pack|summary|report)|whole\s+business)\b/, 'executive_pack'],
  [/\b(financial\s+(pack|reports?|statements?)|full\s+accounts?|the\s+books)\b/, 'financial_pack'],
  [/\b(operations?\s+(pack|reports?)|ops\s+report)\b/, 'operations_pack'],
  [/\b(profit\s*(and|&)?\s*loss|p\s*&\s*l|p&l|income\s+statement|profitability)\b/, 'pnl'],
  [/\b(balance\s*sheet|financial\s+position|statement\s+of\s+position)\b/, 'balance_sheet'],
  [/\btrial\s*balance\b/, 'trial_balance'],
  [/\b(general\s*ledger|journal\s+entries|gl\s+report)\b/, 'general_ledger'],
  [/\b(cash\s*flow|cashflow|liquidity|money\s+(in|movement))\b/, 'cash_flow'],
  [/\b(receivables?|debtors?|money\s+owed\s+to\s+(me|us)|who\s+owes)\b/, 'receivables'],
  [/\b(payables?|creditors?|(what|who)\s+(we|i)\s+owe|bills?\s+to\s+pay)\b/, 'payables'],
  [/\b(aging|ageing|overdue\s+(report|list))\b/, 'aging'],
  [/\b(invoices?|billing|invoice\s+register)\b/, 'invoices'],
  [/\b(payments?\s+received|receipts?|collections?)\b/, 'payments'],
  [/\b(sales|revenue|turnover)\b/, 'sales'],
  [/\b(customers?|clients?)\b/, 'customers'],
  [/\b(budget|budgeting|variance)\b/, 'budget'],
  [/\b(expenses?|spending|costs?|expenditure)\b/, 'expenses'],
  [/\b(stock|inventory)\s+valuation\b/, 'inventory_valuation'],
  [/\b(inventory|stock|products?)\b/, 'inventory'],
  [/\b(purchase\s*orders?|procurement)\b/, 'purchase_orders'],
  [/\b(suppliers?|vendors?)\b/, 'suppliers'],
  [/\b(payroll|salaries|wages)\b/, 'payroll'],
  [/\b(employees?|staff|team|hr)\b/, 'employees'],
  [/\b(transactions?|ledger\s+activity|account\s+activity)\b/, 'transactions'],
];

const REPORT_MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolves a reporting period from natural language. Nulls mean "all time". */
function resolvePeriod(q: string): { dateFrom: string | null; dateTo: string | null } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  const isoDates = q.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoDates && isoDates.length >= 2) return { dateFrom: isoDates[0], dateTo: isoDates[1] };
  if (isoDates && isoDates.length === 1 && /\b(since|from|after)\b/.test(q)) {
    return { dateFrom: isoDates[0], dateTo: null };
  }

  if (/\b(this|current)\s+month\b/.test(q)) {
    return { dateFrom: isoDay(new Date(Date.UTC(y, m, 1))), dateTo: isoDay(new Date(Date.UTC(y, m + 1, 0))) };
  }
  if (/\blast\s+month\b/.test(q)) {
    return { dateFrom: isoDay(new Date(Date.UTC(y, m - 1, 1))), dateTo: isoDay(new Date(Date.UTC(y, m, 0))) };
  }
  if (/\b(this|current)\s+(year|financial\s+year|fy)\b/.test(q)) {
    return { dateFrom: isoDay(new Date(Date.UTC(y, 0, 1))), dateTo: isoDay(new Date(Date.UTC(y, 11, 31))) };
  }
  if (/\blast\s+year\b/.test(q)) {
    return { dateFrom: isoDay(new Date(Date.UTC(y - 1, 0, 1))), dateTo: isoDay(new Date(Date.UTC(y - 1, 11, 31))) };
  }
  if (/\b(this|current)\s+quarter\b/.test(q)) {
    const qs = Math.floor(m / 3) * 3;
    return { dateFrom: isoDay(new Date(Date.UTC(y, qs, 1))), dateTo: isoDay(new Date(Date.UTC(y, qs + 3, 0))) };
  }
  if (/\blast\s+quarter\b/.test(q)) {
    const qs = Math.floor(m / 3) * 3 - 3;
    return { dateFrom: isoDay(new Date(Date.UTC(y, qs, 1))), dateTo: isoDay(new Date(Date.UTC(y, qs + 3, 0))) };
  }

  const rel = q.match(/\b(?:last|past|previous)\s+(\d{1,3})\s+(day|week|month|year)s?\b/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2];
    const start = new Date(now);
    if (unit === 'day') start.setUTCDate(start.getUTCDate() - n);
    else if (unit === 'week') start.setUTCDate(start.getUTCDate() - n * 7);
    else if (unit === 'month') start.setUTCMonth(start.getUTCMonth() - n);
    else start.setUTCFullYear(start.getUTCFullYear() - n);
    return { dateFrom: isoDay(start), dateTo: isoDay(now) };
  }

  const named = q.match(new RegExp(`\\b(${REPORT_MONTHS.join('|')})\\b(?:\\s+(\\d{4}))?`));
  if (named) {
    const mi = REPORT_MONTHS.indexOf(named[1]);
    const yr = named[2] ? parseInt(named[2], 10) : y;
    return { dateFrom: isoDay(new Date(Date.UTC(yr, mi, 1))), dateTo: isoDay(new Date(Date.UTC(yr, mi + 1, 0))) };
  }

  const bareYear = q.match(/\b(?:in|for|during)\s+(20\d{2})\b/);
  if (bareYear) {
    const yr = parseInt(bareYear[1], 10);
    return { dateFrom: isoDay(new Date(Date.UTC(yr, 0, 1))), dateTo: isoDay(new Date(Date.UTC(yr, 11, 31))) };
  }

  return { dateFrom: null, dateTo: null };
}

function resolveReportIntent(rawQuery: string): ReportIntent | null {
  const q = (rawQuery || '').toLowerCase();

  // The director must actually be asking for a file, not just discussing a topic.
  const wantsFile = /\b(pdf|excel|xlsx|csv|spreadsheet|download|downloadable|export|generate\s+(a|the|me)?\s*(report|statement|file)|send\s+(me|us)?\s*(the|a)?\s*(report|file|statement)|give\s+me\s+(the|a)?\s*(report|file)|print|attach|hard\s*copy|soft\s*copy)\b/.test(q);
  if (!wantsFile) return null;

  const format: ReportFormat =
    /\b(excel|xlsx|spreadsheet|workbook|sheet)\b/.test(q) ? 'xlsx'
    : /\bcsv\b/.test(q) ? 'csv'
    : 'pdf';

  let type: string | null = null;
  for (const [re, key] of REPORT_MATCHERS) {
    if (re.test(q)) { type = key; break; }
  }

  // "download my report" with no subject named — give the full executive pack
  // rather than nothing, so the director is never left with a dead request.
  if (!type && /\b(report|statement|financials?|figures|numbers|records|data)\b/.test(q)) {
    type = 'executive_pack';
  }
  if (!type) return null;

  const { dateFrom, dateTo } = resolvePeriod(q);
  return { type, format, dateFrom, dateTo };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const encoder = new TextEncoder();

  try {
    const body = await req.json();
    const { messages, businessId, userId } = body;

    if (!businessId || businessId === '' || businessId === 'loading') {
       throw new Error("Neural Link Blocked: Node Identity (Business ID) is physically unanchored.");
    }
    if (!userId) {
       throw new Error("Neural Link Blocked: Director Identity is physically unanchored.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // ✅ RATE LIMIT GATE — runs before any paid API call (Jina, SambaNova).
    // check_and_increment_aura_usage is atomic (row-locked per user), so
    // this is safe under concurrent requests from the same or different
    // users — no race condition, no double-counting.
    const { data: usageResult, error: usageError } = await supabaseAdmin.rpc(
        'check_and_increment_aura_usage',
        { p_user_id: userId, p_daily_limit: DAILY_LIMIT, p_cooldown_seconds: COOLDOWN_SECONDS }
    );

    if (usageError) {
        console.error('[AURA] Rate limit check failed:', usageError.message);
        // Fail open on infra error rather than blocking every user because
        // the usage table itself had an issue — logged for visibility.
    } else if (usageResult && usageResult.allowed === false) {
        console.warn(`[AURA] Request blocked for user ${userId}: ${usageResult.reason}`);
        return new Response(earlyErrorStream(encoder, usageResult.message), { headers: streamHeaders });
    }

    // --- REPORT REQUEST DETECTION (v30.0 — deterministic, not LLM-decided) ---
    // resolveReportIntent covers all 21 report types, three packs, three
    // formats and natural-language periods. It returns null unless the
    // director's own words ask for a file, so ordinary questions about the
    // business never trigger a paid generation call.
    const lastQuery = extractText(messages[messages.length - 1]);
    let reportDownload: ReportDownload | null = null;
    let reportError: string | null = null;

    const reportIntent = resolveReportIntent(lastQuery);
    if (reportIntent) {
        console.log(`[AURA] Report intent: ${reportIntent.type} / ${reportIntent.format} / ${reportIntent.dateFrom ?? 'inception'} -> ${reportIntent.dateTo ?? 'today'}`);
        try {
            const reportRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/aura-generate-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
                body: JSON.stringify({
                    businessId,
                    userId,
                    reportType: reportIntent.type,
                    format: reportIntent.format,
                    dateFrom: reportIntent.dateFrom,
                    dateTo: reportIntent.dateTo
                })
            });
            const reportJson = await reportRes.json();
            if (reportJson.success) {
                reportDownload = {
                    downloadUrl: reportJson.downloadUrl,
                    fileName: reportJson.fileName,
                    reportType: reportJson.reportType,
                    format: reportJson.format,
                    title: reportJson.title || reportJson.reportType,
                    scope: reportJson.scope || 'Period: all available records',
                    rowCount: Number(reportJson.rowCount) || 0,
                    summary: (reportJson.sections || []).flatMap((s: any) => s.summary || []),
                    warnings: reportJson.warnings || []
                };
            } else {
                reportError = reportJson.error || "Report generation failed for an unknown reason.";
            }
        } catch (e) {
            reportError = `Could not reach the report generator: ${(e as Error).message}`;
        }
    }

    const [tenantRes, modulesRes, keysRes, handshakeRes, intelRes, invoicesRes, paymentsRes, payrollRes, transactionsRes, employeesRes,
           pnlRes, balanceSheetRes, agingRes, inventoryRes, inventoryValuationRes, purchaseOrdersRes, suppliersRes, expensesRes, expenseMetricsRes] = await Promise.all([
      supabaseAdmin.from('tenants').select('name, business_type, country, currency, setup_complete').eq('id', businessId).single(),
      supabaseAdmin.from('tenant_modules').select('module_name').eq('tenant_id', businessId).eq('is_active', true),
      supabaseAdmin.from('aura_system_settings').select('key_name, key_value').in('key_name', ['SAMBANOVA_API_KEY', 'JINA_API_KEY']),
      supabaseAdmin.rpc('get_aura_handshake', { p_target_biz_id: businessId, p_user_id: userId }),
      // Aggregate business intelligence view — ledger totals, workforce, payroll disbursed, anomalies
      supabaseAdmin.from('vw_aura_master_intelligence').select('*').eq('business_id', businessId).maybeSingle(),
      // Real invoice data — outstanding balances, recent invoices, payment status
      supabaseAdmin.from('invoices').select('invoice_number, customer_name, total_amount, amount_paid, balance_due, status, payment_status, due_date, currency')
        .eq('business_id', businessId).order('created_at', { ascending: false }).limit(15),
      // Recent payments received
      supabaseAdmin.from('payments').select('amount, payment_date, method, receipt_number, currency_code')
        .eq('business_id', businessId).order('payment_date', { ascending: false }).limit(10),
      // Payroll run history
      supabaseAdmin.from('payroll_runs').select('status, total_amount, processed_at, created_at')
        .eq('tenant_id', businessId).order('created_at', { ascending: false }).limit(6),
      // Recent general transactions (cashflow signal)
      supabaseAdmin.from('transactions').select('transaction_date, description, type, amount, member_name')
        .eq('business_id', businessId).order('transaction_date', { ascending: false }).limit(15),
      // Staff directory — real names/roles, not invented ones
      supabaseAdmin.from('employees').select('full_name, name, role, job_title, department, is_active, status, email')
        .eq('business_id', businessId).eq('is_active', true).limit(50),
      // Profit & Loss — revenue/COGS/opex by account, from the real ledger (accounting_journal_entries + accounting_accounts)
      supabaseAdmin.from('view_financial_hub_pnl').select('category, account_name, amount, report_date').eq('business_id', businessId)
        .order('report_date', { ascending: false }).limit(1000),
      // Balance sheet — asset/liability/equity balances by account
      supabaseAdmin.from('view_financial_hub_balance_sheet').select('account_category, account_name, final_balance').eq('business_id', businessId),
      // AR/AP aging — real receivables (unpaid sales/invoices/loan installments) and payables (unpaid expenses/POs)
      supabaseAdmin.from('view_universal_financial_aging').select('type, name, reference, currency, amount, created_at').eq('business_id', businessId)
        .order('created_at', { ascending: true }).limit(30),
      // Inventory — lowest stock first, most actionable for restocking decisions
      supabaseAdmin.from('view_inventory_master').select('product_name, sku, stock_quantity, display_price, unit_cost, category_name')
        .eq('business_id', businessId).eq('is_active', true).order('stock_quantity', { ascending: true }).limit(20),
      // Inventory valuation — total value on hand
      supabaseAdmin.from('view_inventory_valuation').select('total_value').eq('business_id', businessId),
      // Purchase orders — procurement pipeline
      supabaseAdmin.from('purchase_orders').select('id, supplier_id, status, total_amount, currency_code, order_date, expected_delivery_date')
        .eq('business_id', businessId).order('created_at', { ascending: false }).limit(15),
      // Suppliers — for mapping supplier_id -> name on purchase orders above
      supabaseAdmin.from('suppliers').select('id, name').eq('business_id', businessId).limit(100),
      // Recent expenses
      supabaseAdmin.from('expenses').select('description, amount, category, vendor_name, payment_status, date, currency_code')
        .eq('business_id', businessId).order('date', { ascending: false }).limit(15),
      // Expense health summary — monthly spend, unposted vouchers, ledger health
      supabaseAdmin.from('view_expense_metrics').select('*').eq('business_id', businessId).maybeSingle()
    ]);

    if (tenantRes.error || !tenantRes.data) {
        throw new Error(`Vault Access Denied: Metadata for Node ${businessId} could not be resolved.`);
    }

    const t = tenantRes.data;
    const activeModules = modulesRes.data?.map(m => m.module_name) || [];
    const auraHandshake = handshakeRes.data || {};

    const verifiedName = t.name || auraHandshake.businessName || "Sovereign Entity";
    const verifiedSector = t.business_type || auraHandshake.industry || "General Enterprise";
    const verifiedCountry = t.country || "Global";
    const verifiedDirector = auraHandshake.userName || "Authorized Director";

    const sambaKey = keysRes.data?.find(k => k.key_name === 'SAMBANOVA_API_KEY')?.key_value;
    const jinaKey = keysRes.data?.find(k => k.key_name === 'JINA_API_KEY')?.key_value;

    if (!sambaKey || !jinaKey) throw new Error("Neural Core Failure: AI Keys not seated in system settings.");

    // --- REAL BUSINESS DATA PACK ---
    // This replaces guesswork: actual invoices, payments, payroll, transactions,
    // and staff pulled straight from the tenant's own tables, scoped by
    // business_id/tenant_id. If a query errors or returns nothing, we say so
    // explicitly in the pack rather than silently omitting it — that way the
    // model can tell the difference between "no data exists" and "not fetched."
    const intel = intelRes.data || null;
    const invoiceList = invoicesRes.data || [];
    const paymentList = paymentsRes.data || [];
    const payrollList = payrollRes.data || [];
    const transactionList = transactionsRes.data || [];
    const staffList = (employeesRes.data || []).map(e => ({
        name: e.full_name || e.name || 'Unnamed',
        role: e.job_title || e.role || 'Unspecified',
        department: e.department || 'Unspecified'
    }));

    const outstandingBalance = invoiceList.reduce((sum, inv) => sum + (Number(inv.balance_due) || 0), 0);
    const overdueInvoices = invoiceList.filter(inv => inv.status === 'overdue' || (inv.payment_status && inv.payment_status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date()));

    // --- PROFIT & LOSS (computed in code, not by the model, from real ledger rows) ---
    const pnlRows = pnlRes.data || [];
    const totalRevenue = pnlRows.filter(r => r.category === 'Revenue').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalCOGS = pnlRows.filter(r => r.category === 'Cost of Goods Sold').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalOpEx = pnlRows.filter(r => r.category === 'Operating Expenses').reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalOpEx;
    const pnlHasData = pnlRows.length > 0;

    // --- BALANCE SHEET (computed in code from real account balances) ---
    const bsRows = balanceSheetRes.data || [];
    const totalAssets = bsRows.filter(r => r.account_category === 'Asset').reduce((s, r) => s + (Number(r.final_balance) || 0), 0);
    const totalLiabilities = bsRows.filter(r => r.account_category === 'Liability').reduce((s, r) => s + (Number(r.final_balance) || 0), 0);
    const totalEquity = bsRows.filter(r => r.account_category === 'Equity').reduce((s, r) => s + (Number(r.final_balance) || 0), 0);
    const bsHasData = bsRows.length > 0;

    // --- AR / AP AGING ---
    const agingRows = agingRes.data || [];
    const receivables = agingRows.filter(r => r.type === 'Receivable');
    const payables = agingRows.filter(r => r.type === 'Payable');
    const totalReceivable = receivables.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalPayable = payables.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    // --- INVENTORY ---
    const inventoryList = inventoryRes.data || [];
    const lowStockItems = inventoryList.filter(i => Number(i.stock_quantity) <= 5);
    const totalInventoryValue = (inventoryValuationRes.data || []).reduce((s, v) => s + (Number(v.total_value) || 0), 0);

    // --- PROCUREMENT ---
    const supplierMap = new Map((suppliersRes.data || []).map(s => [s.id, s.name]));
    const purchaseOrderList = (purchaseOrdersRes.data || []).map(po => ({
        supplier: supplierMap.get(po.supplier_id) || 'Unknown Supplier',
        status: po.status,
        total_amount: po.total_amount,
        currency: po.currency_code,
        order_date: po.order_date,
        expected_delivery_date: po.expected_delivery_date
    }));
    const pendingPOValue = purchaseOrderList.filter(po => po.status === 'pending').reduce((s, po) => s + (Number(po.total_amount) || 0), 0);

    // --- EXPENSES ---
    const expenseList = expensesRes.data || [];
    const expenseMetrics = expenseMetricsRes.data || null;

    const businessDataPack = `
--- LIVE BUSINESS DATA (fetched directly from tenant records, business_id=${businessId}) ---
BUSINESS INTELLIGENCE SUMMARY: ${intel ? JSON.stringify(intel) : "No aggregate intelligence record found for this business yet."}

STAFF DIRECTORY (${staffList.length} active employee(s) on record): ${staffList.length > 0 ? JSON.stringify(staffList) : "No active employee records found."}
When asked to identify, invite, or reference any staff member (e.g. auditor, HR, Chief of Staff), ONLY use names from this directory. Never invent a name or role not listed here. If no matching role exists in the directory, say so plainly.

INVOICES (${invoiceList.length} most recent): ${invoiceList.length > 0 ? JSON.stringify(invoiceList) : "No invoices on record."}
TOTAL OUTSTANDING BALANCE ACROSS LISTED INVOICES: ${outstandingBalance}
OVERDUE INVOICES: ${overdueInvoices.length > 0 ? JSON.stringify(overdueInvoices) : "None currently overdue."}

RECENT PAYMENTS RECEIVED (${paymentList.length}): ${paymentList.length > 0 ? JSON.stringify(paymentList) : "No payment records found."}

PAYROLL RUN HISTORY (${payrollList.length} most recent): ${payrollList.length > 0 ? JSON.stringify(payrollList) : "No payroll runs on record."}

RECENT TRANSACTIONS (${transactionList.length}): ${transactionList.length > 0 ? JSON.stringify(transactionList) : "No transaction records found."}

PROFIT & LOSS SUMMARY (computed from the general ledger, not estimated): ${pnlHasData ? JSON.stringify({
    total_revenue: totalRevenue,
    cost_of_goods_sold: totalCOGS,
    gross_profit: grossProfit,
    operating_expenses: totalOpEx,
    net_profit: netProfit
}) : "No ledger entries found — P&L cannot be computed yet. This business likely has no accounting_journal_entries posted."}

BALANCE SHEET SUMMARY (computed from account balances): ${bsHasData ? JSON.stringify({
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    total_equity: totalEquity
}) : "No account balance data found — balance sheet cannot be computed yet."}

ACCOUNTS RECEIVABLE (money owed TO the business, ${receivables.length} items, total ${totalReceivable}): ${receivables.length > 0 ? JSON.stringify(receivables) : "None outstanding."}
ACCOUNTS PAYABLE (money the business owes OTHERS, ${payables.length} items, total ${totalPayable}): ${payables.length > 0 ? JSON.stringify(payables) : "None outstanding."}

INVENTORY (${inventoryList.length} active items, sorted lowest stock first): ${inventoryList.length > 0 ? JSON.stringify(inventoryList) : "No active inventory items found."}
LOW STOCK ALERT (5 or fewer units on hand): ${lowStockItems.length > 0 ? JSON.stringify(lowStockItems) : "No items currently low on stock."}
TOTAL INVENTORY VALUE ON HAND: ${totalInventoryValue}

PURCHASE ORDERS / PROCUREMENT (${purchaseOrderList.length} most recent): ${purchaseOrderList.length > 0 ? JSON.stringify(purchaseOrderList) : "No purchase orders on record."}
TOTAL VALUE OF PENDING PURCHASE ORDERS: ${pendingPOValue}

EXPENSES (${expenseList.length} most recent): ${expenseList.length > 0 ? JSON.stringify(expenseList) : "No expense records found."}
EXPENSE HEALTH: ${expenseMetrics ? JSON.stringify(expenseMetrics) : "No expense metrics available for this business."}

RULE: Every figure above is real data pulled from this business's own tables, or computed directly from that data using plain arithmetic — nothing here is estimated or guessed by you. Use it directly for financial questions, P&L, balance sheet, aging, inventory, procurement, and expense reporting. If something is asked that this data pack does not cover, say plainly that the data isn't available yet rather than estimating or inventing it.
--- END LIVE BUSINESS DATA ---`;

    const { data: auditRecord } = await supabaseAdmin.from('aura_forensic_audit').insert({
        business_id: businessId,
        user_id: userId,
        agent_role: 'EXECUTIVE_AUDITOR',
        action_taken: 'IDENTITY_SEALED',
        raw_input: {
            query: lastQuery,
            tenant_meta: { name: verifiedName, country: verifiedCountry, sector: verifiedSector }
        },
        neural_status: 'SEARCHING',
        created_at: new Date().toISOString()
    }).select('id').single();

    let forensicContext = "";
    let agentSteps = [
        {
          event: 'on_agent_action',
          tool: 'Omniscient_Identity_Scan',
          data: { status: 'FULLY_SEALED', node: businessId, entity: verifiedName, industry: verifiedSector }
        }
    ];

    // Surface report generation as a visible agent step so the director sees
    // the file being produced rather than waiting on a silent pause.
    if (reportDownload) {
        agentSteps.push({
            event: 'on_agent_action',
            tool: 'Report_Engine',
            data: { status: 'FILE_READY', report: reportDownload.reportType, format: reportDownload.format, rows: reportDownload.rowCount }
        } as any);
    } else if (reportError) {
        agentSteps.push({
            event: 'on_agent_action',
            tool: 'Report_Engine',
            data: { status: 'FAILED', reason: reportError.slice(0, 120) }
        } as any);
    }

    try {
        const searchResponse = await fetch("https://api.jina.ai/v1/rerank", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jinaKey}` },
            body: JSON.stringify({
                model: "jina-reranker-v2-base-multilingual",
                query: lastQuery,
                documents: [
                    `Business Entity: ${verifiedName}`,
                    `Business Sector: ${verifiedSector}`,
                    `Operational Region: ${verifiedCountry}`,
                    `Director Identity: ${verifiedDirector}`,
                    `Active ERP Modules: ${activeModules.join(', ')}`,
                    `Local Currency: ${t.currency || 'USD'}`,
                    `Node UUID: ${businessId}`
                ]
            })
        });
        const searchData = await searchResponse.json();
        forensicContext = JSON.stringify(searchData.results || []);

        agentSteps.push({
            event: 'on_agent_action',
            tool: 'Jina_Neural_Vault_Rerank',
            data: { status: 'Context_Fused', results: searchData.results?.length }
        });
    } catch (e) { console.warn("[AURA] Context Retrieval Latency."); }

    const simpleHistory = (messages || []).map((m: any) => ({
      role: m.role,
      content: extractText(m),
    }));

    // --- REPORT PROMPT BLOCKS (v31.0) ---
    // Built here rather than inline in the template so the link instructions
    // can vary with REPORT_DELIVERY.mode without the prompt becoming unreadable.
    let reportBlock = '';
    if (reportDownload) {
      const figures = reportDownload.summary.map((x: string) => `  - ${x}`).join('\n');
      const warnBlock = reportDownload.warnings.length > 0
        ? `SECTIONS THAT COULD NOT BE FILLED:\n${reportDownload.warnings.map((w: string) => `  - ${w}`).join('\n')}\n`
        : '';

      const linkRules = REPORT_DELIVERY.mode === 'card'
        ? `PRESENTATION RULES — follow exactly:
- The file has ALREADY been delivered to the director's screen as a download card.
- Do NOT output the URL, a markdown link, or any part of the token. It is already
  on their screen and repeating it clutters the reply with hundreds of characters.
- Confirm in one short line that the report is ready.`
        : `PRESENTATION RULES — follow exactly:
- Output the link ONCE, as a markdown link on its own line, in this exact form:
  [Download ${reportDownload.title} (${reportDownload.format.toUpperCase()})](${reportDownload.downloadUrl})
- Never paste the raw URL as plain text. Never show the token separately.
- Never repeat the URL anywhere else in the reply.`;

      reportBlock = `
--- REPORT FILE READY ---
A ${reportDownload.format.toUpperCase()} file was just generated for this request.
TITLE: ${reportDownload.title}
SCOPE: ${reportDownload.scope}
ROWS INCLUDED: ${reportDownload.rowCount}
KEY FIGURES CONTAINED IN THE FILE:
${figures}
${warnBlock}${linkRules}
Then summarise the key figures above in one or two short lines so the director
knows what is inside without opening it. If any section could not be filled, say
so plainly in one sentence. Keep the whole reply under six lines.
--- END REPORT FILE READY ---`;
    }

    const reportErrorBlock = reportError ? `
--- REPORT GENERATION FAILED ---
The director asked for a downloadable report but it could not be generated.
Reason: ${reportError}
Apologize briefly and tell them plainly that the report couldn't be generated
right now, giving the reason in simple terms — do not invent a download link.
--- END REPORT GENERATION FAILED ---` : '';

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(sseFrame({ type: 'start' })));
        controller.enqueue(encoder.encode(sseFrame({ type: 'start-step' })));

        for (const step of agentSteps) {
          controller.enqueue(encoder.encode(sseFrame({ type: 'data-agentStep', data: step })));
        }

        // --- STRUCTURED FILE PART (v31.0) ---
        // The frontend renders this as a download card. Sending the file as
        // data rather than as text in the model's reply means the model never
        // handles the URL, so it cannot truncate, reformat or mangle one.
        // Unknown part types are ignored by the AI SDK, so this is inert until
        // the chat component knows what to do with it.
        if (reportDownload && REPORT_DELIVERY.mode !== 'markdown') {
          controller.enqueue(encoder.encode(sseFrame({
            type: 'data-reportFile',
            data: {
              title: reportDownload.title,
              fileName: reportDownload.fileName,
              format: reportDownload.format,
              reportType: reportDownload.reportType,
              scope: reportDownload.scope,
              rowCount: reportDownload.rowCount,
              downloadUrl: reportDownload.downloadUrl,
              expiresInMinutes: 60,
              warnings: reportDownload.warnings,
            }
          })));
        }

        const textId = crypto.randomUUID();
        controller.enqueue(encoder.encode(sseFrame({ type: 'text-start', id: textId })));

        let fullResponse = "";
        try {
          const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${sambaKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "Meta-Llama-3.3-70B-Instruct",
              messages: [
                {
                    role: "system",
                    content: `Aura Mission Control Online. Chief of Staff for Node ${businessId}.

                    --- SOVEREIGN TENANT DATA (DYNAMICALLY RESOLVED) ---
                    - BUSINESS NAME: ${verifiedName}
                    - SECTOR (Industry): ${verifiedSector}
                    - REGION (Country): ${verifiedCountry}
                    - DIRECTOR: ${verifiedDirector}
                    - ACTIVE ERP MODULES: ${activeModules.join(', ')}
                    - VAULT CONTEXT: ${forensicContext}
                    ${businessDataPack}
                    ${reportBlock}
                    ${reportErrorBlock}

                    --- EXECUTIVE DIRECTIVE ---
                    You are Aura, the lead Executive Auditor for this node.
                    1. Acknowledge Director ${verifiedDirector} and confirm the link to ${verifiedName} is secure the first time you address them in a conversation, then don't repeat the full acknowledgement on every subsequent turn.
                    2. Match the register of the user's message. A simple greeting ("good morning", "hello", "thanks") gets a short, warm, natural reply in kind — do not pivot to forensic, strategic, or ERP analysis unless the user actually asked a business question.
                    3. When the user does ask a business, financial, or operational question, use the provided context to offer forensic, strategic, and high-fidelity insights, and ensure your advice is specific to the ${verifiedSector} sector and the ${verifiedCountry} region.
                    4. Use the LIVE BUSINESS DATA block above for any question about invoices, payments, payroll, transactions, staff, profit and loss, balance sheet, accounts receivable/payable, inventory, procurement, or expenses — it is real data from this business's own records, and the P&L and balance sheet figures are computed with plain arithmetic, not estimated. If something is asked that isn't covered there, say plainly that you don't have that information yet rather than inventing figures, names, or people.
                    5. Keep responses concise and well-formed. Avoid conversational filler when answering substantive business questions, but never sacrifice clarity or grammatical correctness for terseness.
                    6. Only ever give a download link that appears in a REPORT FILE READY block above, and only in the form its PRESENTATION RULES specify. Never construct, guess, or invent a URL yourself under any circumstance — an invented link would be broken and misleading. If no REPORT FILE READY block is present, no file exists: say so plainly rather than describing one.`
                },
                ...simpleHistory
              ],
              stream: true,
              temperature: 0.1,
              max_tokens: 4096
            })
          });

          if (!response.ok) {
              const errorBody = await response.text();
              console.error(`[AURA] SambaNova returned ${response.status}:`, errorBody);
              throw new Error(`SambaNova API error (${response.status}): ${errorBody.slice(0, 300)}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("Neural stream collapsed.");

          const decoder = new TextDecoder();
          // Carries any incomplete trailing line across reads so we never
          // attempt to JSON.parse a `data: ` frame that was cut in half by
          // a chunk boundary. This is the fix for mid-word text corruption.
          let sseBuffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });

            const lines = sseBuffer.split('\n');
            // The last element may be an incomplete line — hold it back
            // and prepend it to the next read instead of parsing it now.
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const content = json.choices?.[0]?.delta?.content || "";
                        if (content) {
                            fullResponse += content;
                            controller.enqueue(encoder.encode(sseFrame({ type: 'text-delta', id: textId, delta: content })));
                        }
                    } catch (e) {
                        // Only reachable for genuinely malformed frames now
                        // (not simple chunk-boundary splits) — log instead
                        // of silently dropping, so real issues are visible.
                        console.error('[AURA] SSE frame parse failure:', (e as Error).message, trimmed);
                    }
                }
            }
          }

          // Flush any final partial line left in the decoder/buffer after
          // the stream closes (rare, but keeps the last token from being lost).
          if (sseBuffer.trim().startsWith('data: ') && sseBuffer.trim() !== 'data: [DONE]') {
              try {
                  const json = JSON.parse(sseBuffer.trim().slice(6));
                  const content = json.choices?.[0]?.delta?.content || "";
                  if (content) {
                      fullResponse += content;
                      controller.enqueue(encoder.encode(sseFrame({ type: 'text-delta', id: textId, delta: content })));
                  }
              } catch (e) {
                  console.error('[AURA] Final SSE frame parse failure:', (e as Error).message, sseBuffer);
              }
          }

          controller.enqueue(encoder.encode(sseFrame({ type: 'text-end', id: textId })));
          controller.enqueue(encoder.encode(sseFrame({ type: 'finish-step' })));
          controller.enqueue(encoder.encode(sseFrame({ type: 'finish' })));

          if (auditRecord?.id) {
            await supabaseAdmin.from('aura_forensic_audit').update({
                forensic_output: {
                    response: fullResponse,
                    node_version: 'v31.0_REPORT_CARD',
                    report: reportDownload
                        ? { type: reportDownload.reportType, format: reportDownload.format, file: reportDownload.fileName, rows: reportDownload.rowCount }
                        : (reportError ? { error: reportError } : null)
                },
                neural_status: 'COMPLETED'
            }).eq('id', auditRecord.id);
          }

        } catch (err) {
          controller.enqueue(encoder.encode(sseFrame({ type: 'error', errorText: err.message })));
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: streamHeaders });

  } catch (error) {
    console.error("[CRITICAL MOTHERBOARD CRASH]", error.message);
    return new Response(earlyErrorStream(encoder, error.message), { headers: streamHeaders });
  }
})