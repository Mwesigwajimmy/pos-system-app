// supabase/functions/aura-generate-report/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1"
import * as XLSX from "https://esm.sh/xlsx@0.18.5"

/**
 * --- AURA REPORT ENGINE ---
 * v2.0
 *
 * Generates real, downloadable PDF / Excel (.xlsx) / CSV reports directly from
 * live tenant data, scoped by business_id (or tenant_id where that is the
 * scoping column, e.g. payroll_runs).
 *
 * WHAT CHANGED FROM v1.0
 *  1. 20+ report types instead of 5, plus multi-section "packs"
 *     (executive_pack, financial_pack, operations_pack) that render every
 *     section into one PDF or one multi-sheet workbook.
 *  2. CSV added alongside PDF and XLSX.
 *  3. Date range support (dateFrom / dateTo) on every time-based report.
 *  4. Pagination — v1.0 capped at 1000 rows because that is PostgREST's
 *     default page size, so totals on large tenants were silently wrong.
 *     Now pages through in 1000-row batches up to maxRows.
 *  5. Text sanitisation for PDF. pdf-lib's standard fonts are WinAnsi-only
 *     and THROW on any character outside that set. v1.0's inventory summary
 *     contained a literal U+2264 ("<=" as one glyph), which means every
 *     inventory PDF crashed. Product names with non-Latin characters would
 *     have done the same.
 *  6. Tenant access check — v1.0 accepted any businessId from any caller and
 *     handed back a signed URL to that tenant's financials.
 *  7. Real PDF layout: measured column truncation, right-aligned money,
 *     repeating headers, zebra rows, page numbers, landscape for wide tables.
 *  8. Missing sources degrade instead of crashing: a report whose view does
 *     not exist comes back as a section with a note, and the response carries
 *     a `warnings` array so Aura can tell the director what was unavailable.
 *
 * v2.1 — corrections driven by what the live schema audit actually found,
 * rather than by what I had assumed:
 *
 *  A. Cash flow no longer reports zero income. The `payments` and
 *     `transactions` tables are empty in this project; collections are
 *     recorded on the invoice itself. Inflow now falls back to invoices
 *     (total_amount - balance_due) when the dedicated tables have no rows,
 *     and the report states which source it used so nobody has to guess.
 *
 *  B. Collected is computed as total_amount - balance_due, not as
 *     amount_paid. On direct (DIR-) invoices amount_paid is written with the
 *     VAT-exclusive subtotal, so summing it understates real collections —
 *     6,775,200 UGX across 36 invoices on the live tenant. balance_due
 *     agrees with the aging view; amount_paid is the field that disagrees
 *     with everything else.
 *
 *  C. The invoice report now carries a reconciliation line. Where
 *     total_amount - amount_paid - balance_due is non-zero, it shows both
 *     figures and the size of the gap instead of silently picking one. A
 *     financial report that quietly resolves a contradiction is worse than
 *     one that surfaces it.
 *
 *  D. Numeric customer names are labelled, not printed raw. customer_id is
 *     null on every invoice and customer_name holds bare numbers ("156"),
 *     so the join to customers returns nothing. Rendering that verbatim
 *     would put "Customer: 156" in front of a director.
 *
 *  E. Duplicate detection. Invoices sharing customer, amount and calendar
 *     day are counted and flagged in the summary.
 *
 *  F. Status comparisons are case-insensitive. The data carries ISSUED,
 *     paid, Paid, PAID, UNPAID and nulls in the same two columns, so an
 *     exact-match check on 'paid' misclassifies most of the table.
 *
 * REQUIRES: a private Supabase Storage bucket named 'aura-reports'.
 * See sql/aura_reports_setup.sql.
 */

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const MAX_ROWS_DEFAULT = 20000;   // hard ceiling per section for xlsx/csv
const PDF_MAX_ROWS = 1200;        // per section; PDFs beyond this get unusable
const PAGE_SIZE = 1000;           // PostgREST page size
const SIGNED_URL_TTL_DEFAULT = 3600;

// When true, a caller presenting a user JWT (not the service role key) must be
// provably a member of the business. Turn on once you confirm which membership
// table your project uses — see MEMBERSHIP_SOURCES below.
const STRICT_TENANT_CHECK = (Deno.env.get('AURA_STRICT_TENANT_CHECK') ?? 'false') === 'true';

const MEMBERSHIP_SOURCES: { table: string; userCol: string; bizCol: string }[] = [
  { table: 'tenant_users', userCol: 'user_id', bizCol: 'tenant_id' },
  { table: 'business_members', userCol: 'user_id', bizCol: 'business_id' },
  { table: 'user_business_roles', userCol: 'user_id', bizCol: 'business_id' },
  { table: 'profiles', userCol: 'id', bizCol: 'business_id' },
  { table: 'employees', userCol: 'user_id', bizCol: 'business_id' },
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// BRANDING
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

interface Theme {
  primary: Rgb;      // banner and section rules
  accent: Rgb;       // summary figures
  panel: Rgb;        // summary block background
  subtle: Rgb;       // cover subtitle
}

const THEMES: Record<string, Theme> = {
  executive: { primary: [0.06, 0.13, 0.25], accent: [0.05, 0.28, 0.16], panel: [0.95, 0.97, 0.99], subtle: [0.78, 0.85, 0.95] },
  slate:     { primary: [0.16, 0.18, 0.22], accent: [0.20, 0.24, 0.30], panel: [0.96, 0.96, 0.97], subtle: [0.80, 0.82, 0.86] },
  emerald:   { primary: [0.03, 0.30, 0.22], accent: [0.05, 0.35, 0.20], panel: [0.94, 0.98, 0.96], subtle: [0.76, 0.90, 0.84] },
  crimson:   { primary: [0.35, 0.06, 0.12], accent: [0.42, 0.10, 0.14], panel: [0.99, 0.95, 0.96], subtle: [0.92, 0.78, 0.80] },
  mono:      { primary: [0.10, 0.10, 0.10], accent: [0.25, 0.25, 0.25], panel: [0.96, 0.96, 0.96], subtle: [0.75, 0.75, 0.75] },
};

const LAYOUTS = ['banner', 'letterhead', 'minimal'] as const;
type Layout = typeof LAYOUTS[number];

interface Branding {
  theme: Theme;
  themeName: string;
  layout: Layout;
  logo: { bytes: Uint8Array; kind: 'png' | 'jpg' } | null;
  footerNote: string | null;
}

function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Fetches a logo and identifies its format from the magic bytes rather than
 *  trusting the file extension or content-type header. */
async function fetchLogo(url: string): Promise<{ bytes: Uint8Array; kind: 'png' | 'jpg' } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 4 || buf.length > 4_000_000) return null;
    if (buf[0] === 0x89 && buf[1] === 0x50) return { bytes: buf, kind: 'png' };
    if (buf[0] === 0xFF && buf[1] === 0xD8) return { bytes: buf, kind: 'jpg' };
    return null;
  } catch (_e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface Column {
  header: string;
  width: number;
  numeric?: boolean;
}

interface Section {
  key: string;
  title: string;
  summary: string[];
  columns: Column[];
  rows: string[][];
  sheet: Record<string, unknown>[];
  note?: string;
  landscape?: boolean;
  totalRows: number;
}

interface Ctx {
  sb: any;
  businessId: string;
  currency: string;
  from: string | null;
  to: string | null;
  maxRows: number;
}

// ---------------------------------------------------------------------------
// REPORT REGISTRY
// ---------------------------------------------------------------------------

const SINGLE_REPORTS = [
  'analysis',
  'estimates', 'pos_sales', 'staff_performance', 'pipeline',
  'pnl', 'balance_sheet', 'trial_balance', 'general_ledger', 'cash_flow',
  'aging', 'receivables', 'payables',
  'invoices', 'payments', 'sales', 'customers',
  'expenses', 'budget',
  'inventory', 'inventory_valuation',
  'purchase_orders', 'suppliers',
  'payroll', 'employees',
  'transactions',
] as const;

const PACKS: Record<string, string[]> = {
  executive_pack: ['analysis', 'pnl', 'balance_sheet', 'cash_flow', 'aging', 'invoices', 'pos_sales', 'estimates', 'payments', 'expenses', 'inventory', 'purchase_orders', 'payroll', 'transactions'],
  financial_pack: ['analysis', 'pnl', 'balance_sheet', 'trial_balance', 'cash_flow', 'aging', 'invoices', 'payments', 'expenses'],
  operations_pack: ['inventory', 'inventory_valuation', 'purchase_orders', 'suppliers', 'employees', 'staff_performance', 'pos_sales', 'payroll'],
};

// Anything a human (or Aura) might say, mapped to a canonical key.
const ALIASES: Record<string, string> = {
  'quote': 'estimates', 'quotes': 'estimates', 'quotation': 'estimates', 'quotations': 'estimates',
  'proforma': 'estimates', 'estimate': 'estimates',
  'pos': 'pos_sales', 'till': 'pos_sales', 'counter_sales': 'pos_sales', 'till_sales': 'pos_sales',
  'point_of_sale': 'pos_sales', 'shop_sales': 'pos_sales',
  'staff_sales': 'staff_performance', 'who_sold': 'staff_performance', 'cashier': 'staff_performance',
  'seller': 'staff_performance', 'sales_by_staff': 'staff_performance', 'performance': 'staff_performance',
  'deals': 'pipeline', 'opportunities': 'pipeline', 'crm': 'pipeline', 'leads': 'pipeline',
  'insights': 'analysis', 'advice': 'analysis', 'recommendations': 'analysis',
  'health': 'analysis', 'health_check': 'analysis', 'diagnostics': 'analysis',
  'review': 'analysis', 'assessment': 'analysis', 'ratios': 'analysis',
  'p&l': 'pnl', 'pl': 'pnl', 'profit_and_loss': 'pnl', 'profit_loss': 'pnl',
  'income_statement': 'pnl', 'profitability': 'pnl',
  'bs': 'balance_sheet', 'balancesheet': 'balance_sheet', 'financial_position': 'balance_sheet',
  'tb': 'trial_balance', 'gl': 'general_ledger', 'ledger': 'general_ledger', 'journal': 'general_ledger',
  'cashflow': 'cash_flow', 'cash': 'cash_flow',
  'ar': 'receivables', 'debtors': 'receivables', 'receivable': 'receivables',
  'ap': 'payables', 'creditors': 'payables', 'payable': 'payables',
  'invoice': 'invoices', 'billing': 'invoices',
  'payment': 'payments', 'receipts': 'payments', 'collections': 'payments',
  'revenue': 'sales', 'turnover': 'sales',
  'expense': 'expenses', 'spending': 'expenses', 'costs': 'expenses',
  'budgets': 'budget', 'budgeting': 'budget', 'variance': 'budget',
  'stock': 'inventory', 'products': 'inventory',
  'valuation': 'inventory_valuation', 'stock_value': 'inventory_valuation',
  'po': 'purchase_orders', 'procurement': 'purchase_orders',
  'vendors': 'suppliers', 'supplier': 'suppliers',
  'salaries': 'payroll', 'wages': 'payroll',
  'staff': 'employees', 'hr': 'employees', 'team': 'employees',
  'transaction': 'transactions', 'ledger_activity': 'transactions',
  'everything': 'executive_pack', 'all': 'executive_pack', 'full': 'executive_pack',
  'full_report': 'executive_pack', 'complete': 'executive_pack', 'pack': 'executive_pack',
  'financials': 'financial_pack', 'accounts': 'financial_pack',
  'operations': 'operations_pack', 'ops': 'operations_pack',
};

function resolveType(raw: string): string | null {
  const k = String(raw || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((SINGLE_REPORTS as readonly string[]).includes(k)) return k;
  if (PACKS[k]) return k;
  if (ALIASES[k]) return ALIASES[k];
  return null;
}

// ---------------------------------------------------------------------------
// TEXT / NUMBER UTILITIES
// ---------------------------------------------------------------------------

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(v: unknown): string {
  return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(v: unknown): string {
  return Math.round(num(v)).toLocaleString('en-US');
}

function day(v: unknown): string {
  if (!v) return '';
  return String(v).slice(0, 10);
}

/**
 * pdf-lib's StandardFonts are WinAnsi encoded and throw on anything outside
 * that range. Everything drawn into a PDF must pass through here first.
 */
const CHAR_MAP: Record<string, string> = {
  '\u2264': '<=', '\u2265': '>=', '\u2260': '!=', '\u00D7': 'x',
  '\u2013': '-', '\u2014': '-', '\u2018': "'", '\u2019': "'",
  '\u201C': '"', '\u201D': '"', '\u2026': '...', '\u2022': '-',
  '\u2192': '->', '\u2190': '<-', '\u2713': 'v', '\u2717': 'x',
  '\u20AC': 'EUR ', '\u20A6': 'NGN ', '\u20B5': 'GHS ', '\u20B9': 'INR ',
  '\u20BD': 'RUB ', '\u20BA': 'TRY ', '\u2122': '(TM)', '\u00A0': ' ',
};

function sanitize(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v).replace(/[\r\n\t]+/g, ' ');
  s = s.replace(/[^\x20-\x7E\u00A1-\u00FF]/g, (ch) => CHAR_MAP[ch] ?? '');
  return s.trim();
}

function fitText(text: string, maxWidth: number, size: number, font: any): string {
  let s = sanitize(text);
  if (!s) return '';
  if (font.widthOfTextAtSize(s, size) <= maxWidth) return s;
  while (s.length > 1 && font.widthOfTextAtSize(s + '...', size) > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '...';
}

function sheetName(name: string): string {
  return sanitize(name).replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31) || 'Sheet';
}

function monthKey(v: unknown): string {
  const s = String(v ?? '');
  return s.length >= 7 ? s.slice(0, 7) : 'Unknown';
}

function ageBucket(v: unknown): string {
  if (!v) return 'Unknown';
  const t = new Date(String(v)).getTime();
  if (!Number.isFinite(t)) return 'Unknown';
  const days = (Date.now() - t) / 86400000;
  if (days <= 30) return '0-30 days';
  if (days <= 60) return '31-60 days';
  if (days <= 90) return '61-90 days';
  return '90+ days';
}

/** Case-insensitive status comparison. The invoice table carries ISSUED,
 *  paid, Paid, PAID, UNPAID and nulls across two columns. */
function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function isPaidStatus(v: unknown): boolean {
  return norm(v) === 'paid';
}

/** customer_id is null on every invoice and customer_name holds bare numbers.
 *  Print that raw and a director reads "Customer: 156". */
function customerLabel(v: unknown): string {
  const s = sanitize(v);
  if (!s) return 'Unidentified customer';
  if (/^\d+$/.test(s)) return `Unidentified (ref ${s})`;
  return s;
}

// ---------------------------------------------------------------------------
// DATA ACCESS
// ---------------------------------------------------------------------------

function applyRange(q: any, col: string, ctx: Ctx) {
  if (ctx.from) q = q.gte(col, ctx.from);
  if (ctx.to) q = q.lte(col, ctx.to);
  return q;
}

/**
 * Pages through PostgREST results. v1.0's `.limit(1000)` was the reason large
 * tenants got wrong totals — PostgREST caps a single response, so a business
 * with 1400 ledger lines had 400 of them silently excluded from the P&L.
 */
async function pullAll(
  ctx: Ctx,
  table: string,
  cols: string,
  filter?: (q: any) => any,
): Promise<{ rows: any[]; error: string | null }> {
  const out: any[] = [];
  let offset = 0;
  try {
    while (out.length < ctx.maxRows) {
      let q = ctx.sb.from(table).select(cols);
      if (filter) q = filter(q);
      const { data, error } = await q.range(offset, offset + PAGE_SIZE - 1);
      if (error) return { rows: out, error: error.message };
      if (!data || data.length === 0) break;
      out.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  } catch (e) {
    return { rows: out, error: (e as Error).message };
  }
  return { rows: out.slice(0, ctx.maxRows), error: null };
}

/** Tries a list of candidate tables/views and returns the first that answers. */
async function pullFirstAvailable(
  ctx: Ctx,
  candidates: { table: string; cols?: string; scope?: string; dateCol?: string }[],
): Promise<{ table: string | null; rows: any[]; error: string | null }> {
  const errors: string[] = [];
  for (const c of candidates) {
    const scope = c.scope ?? 'business_id';
    const { rows, error } = await pullAll(ctx, c.table, c.cols ?? '*', (q) => {
      q = q.eq(scope, ctx.businessId);
      if (c.dateCol) q = applyRange(q, c.dateCol, ctx);
      return q;
    });
    if (!error) return { table: c.table, rows, error: null };
    errors.push(`${c.table}: ${error}`);
  }
  return { table: null, rows: [], error: errors.join(' | ') };
}

// ---------------------------------------------------------------------------
// SECTION HELPERS
// ---------------------------------------------------------------------------

function emptySection(key: string, title: string, note: string): Section {
  return { key, title, summary: [], columns: [{ header: 'Note', width: 500 }], rows: [[note]], sheet: [{ Note: note }], note, totalRows: 0 };
}

/** Builds a section from arbitrary rows when we don't know the schema up front. */
function dynamicSection(key: string, title: string, rows: any[], usable = 515): Section {
  if (rows.length === 0) return emptySection(key, title, 'No records found.');
  const keys = Object.keys(rows[0]).slice(0, 8);
  const width = usable / keys.length;
  const columns: Column[] = keys.map((k) => ({
    header: k.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    width,
    numeric: typeof rows[0][k] === 'number',
  }));
  return {
    key,
    title,
    summary: [`Records: ${fmtInt(rows.length)}`],
    columns,
    rows: rows.map((r) => keys.map((k) => (typeof r[k] === 'number' ? fmt(r[k]) : sanitize(r[k])))),
    sheet: rows,
    landscape: keys.length > 5,
    totalRows: rows.length,
  };
}

// ---------------------------------------------------------------------------
// SECTION BUILDERS
// ---------------------------------------------------------------------------

async function buildSection(ctx: Ctx, key: string): Promise<Section> {
  const cur = ctx.currency;

  switch (key) {
    // ------------------------------------------------------ EXECUTIVE ANALYSIS
    // Every figure and every finding here is computed arithmetically from the
    // tenant's own rows. Nothing is estimated, and no language model is
    // involved in producing them — the model only reads the result.
    case 'analysis': {
      const [pnl, bs, aging, invs, exps, invn] = await Promise.all([
        pullAll(ctx, 'view_financial_hub_pnl', 'category, account_name, amount, report_date',
          (q) => applyRange(q.eq('business_id', ctx.businessId), 'report_date', ctx)),
        pullAll(ctx, 'view_financial_hub_balance_sheet', 'account_category, account_name, final_balance',
          (q) => q.eq('business_id', ctx.businessId)),
        pullAll(ctx, 'view_universal_financial_aging', 'type, amount, created_at',
          (q) => q.eq('business_id', ctx.businessId)),
        pullAll(ctx, 'invoices', 'total_amount, amount_paid, balance_due, customer_name, status, payment_status, due_date, created_at',
          (q) => applyRange(q.eq('business_id', ctx.businessId), 'created_at', ctx)),
        pullAll(ctx, 'expenses', 'amount, category, date',
          (q) => applyRange(q.eq('business_id', ctx.businessId), 'date', ctx)),
        pullAll(ctx, 'view_inventory_master', 'product_name, stock_quantity, unit_cost, display_price',
          (q) => q.eq('business_id', ctx.businessId).eq('is_active', true)),
      ]);

      // --- core figures ---
      const rev = pnl.rows.filter((r) => r.category === 'Revenue').reduce((s, r) => s + num(r.amount), 0);
      const cogs = pnl.rows.filter((r) => r.category === 'Cost of Goods Sold').reduce((s, r) => s + num(r.amount), 0);
      const opex = pnl.rows.filter((r) => r.category === 'Operating Expenses').reduce((s, r) => s + num(r.amount), 0);
      const gross = rev - cogs;
      const net = gross - opex;
      const grossMargin = rev ? (gross / rev) * 100 : 0;
      const netMargin = rev ? (net / rev) * 100 : 0;
      const opexRatio = rev ? (opex / rev) * 100 : 0;

      const assets = bs.rows.filter((r) => r.account_category === 'Asset').reduce((s, r) => s + num(r.final_balance), 0);
      const liabs = bs.rows.filter((r) => r.account_category === 'Liability').reduce((s, r) => s + num(r.final_balance), 0);
      const equity = bs.rows.filter((r) => r.account_category === 'Equity').reduce((s, r) => s + num(r.final_balance), 0);
      const currentRatio = liabs ? assets / liabs : 0;

      const recv = aging.rows.filter((r) => r.type === 'Receivable').reduce((s, r) => s + num(r.amount), 0);
      const payb = aging.rows.filter((r) => r.type === 'Payable').reduce((s, r) => s + num(r.amount), 0);

      const invoiced = invs.rows.reduce((s, r) => s + num(r.total_amount), 0);
      const outstanding = invs.rows.reduce((s, r) => s + num(r.balance_due), 0);
      const collected = invoiced - outstanding;
      const recordedPaid = invs.rows.reduce((s, r) => s + num(r.amount_paid), 0);
      const collectionRate = invoiced ? (collected / invoiced) * 100 : 0;

      // --- monthly trend ---
      const revByMonth = new Map<string, number>();
      pnl.rows.filter((r) => r.category === 'Revenue')
        .forEach((r) => revByMonth.set(monthKey(r.report_date), (revByMonth.get(monthKey(r.report_date)) ?? 0) + num(r.amount)));
      const expByMonth = new Map<string, number>();
      pnl.rows.filter((r) => r.category === 'Operating Expenses')
        .forEach((r) => expByMonth.set(monthKey(r.report_date), (expByMonth.get(monthKey(r.report_date)) ?? 0) + num(r.amount)));
      const allMonths = [...new Set([...revByMonth.keys(), ...expByMonth.keys()])].sort();
      const monthsCount = allMonths.length || 1;
      const avgMonthlyRev = rev / monthsCount;
      const avgMonthlyOpex = opex / monthsCount;

      let momRev = 0;
      if (allMonths.length >= 2) {
        const last = revByMonth.get(allMonths[allMonths.length - 1]) ?? 0;
        const prev = revByMonth.get(allMonths[allMonths.length - 2]) ?? 0;
        momRev = prev ? ((last - prev) / prev) * 100 : 0;
      }

      // --- days sales outstanding, on the period actually covered ---
      const dso = rev ? (recv / rev) * (monthsCount * 30) : 0;

      // --- expense concentration ---
      const byCat = new Map<string, number>();
      pnl.rows.filter((r) => r.category === 'Operating Expenses')
        .forEach((r) => {
          const c = sanitize(r.account_name) || 'Unclassified';
          byCat.set(c, (byCat.get(c) ?? 0) + num(r.amount));
        });
      const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
      const topCatShare = opex && topCats.length ? (topCats[0][1] / opex) * 100 : 0;

      // --- inventory ---
      const stockCost = invn.rows.reduce((s, r) => s + num(r.stock_quantity) * num(r.unit_cost), 0);
      const stockRetail = invn.rows.reduce((s, r) => s + num(r.stock_quantity) * num(r.display_price), 0);
      const outOfStock = invn.rows.filter((r) => num(r.stock_quantity) <= 0).length;
      const lowStock = invn.rows.filter((r) => num(r.stock_quantity) > 0 && num(r.stock_quantity) <= 5).length;
      const stockTurnover = stockCost ? cogs / stockCost : 0;
      const monthsOfStock = cogs && monthsCount ? stockCost / (cogs / monthsCount) : 0;

      // --- data integrity ---
      const gapRows = invs.rows.filter((r) => Math.abs(num(r.total_amount) - num(r.amount_paid) - num(r.balance_due)) > 0.5);
      const gapValue = gapRows.reduce((s, r) => s + (num(r.total_amount) - num(r.amount_paid) - num(r.balance_due)), 0);
      const dupMap = new Map<string, number>();
      invs.rows.forEach((r) => {
        const k = `${sanitize(r.customer_name)}|${num(r.total_amount)}|${day(r.created_at)}`;
        dupMap.set(k, (dupMap.get(k) ?? 0) + 1);
      });
      const dupTotal = [...dupMap.values()].filter((n) => n > 1).reduce((s, n) => s + n, 0);
      const unnamedCustomers = invs.rows.filter((r) => /^\d*$/.test(sanitize(r.customer_name))).length;
      const nowMs = Date.now();
      const overdue = invs.rows.filter((r) =>
        norm(r.status) === 'overdue' ||
        (!isPaidStatus(r.payment_status) && !isPaidStatus(r.status) && r.due_date && new Date(r.due_date).getTime() < nowMs));
      const overdueValue = overdue.reduce((s, r) => s + num(r.balance_due), 0);

      // --- findings: rule-driven, each with the number that triggered it ---
      const findings: { severity: string; area: string; finding: string; action: string }[] = [];
      const money = (v: number) => `${cur} ${fmt(v)}`;

      if (rev > 0 && net < 0) {
        findings.push({
          severity: 'CRITICAL', area: 'Profitability',
          finding: `Trading at a loss of ${money(Math.abs(net))} on revenue of ${money(rev)}. Operating expenses are ${opexRatio.toFixed(1)}% of revenue.`,
          action: `Revenue would need to rise to ${money(cogs + opex)} at current cost levels, or operating expenses fall by ${money(Math.abs(net))}, to break even.`,
        });
      } else if (rev > 0 && netMargin < 5) {
        findings.push({
          severity: 'HIGH', area: 'Profitability',
          finding: `Net margin is ${netMargin.toFixed(1)}%, leaving little buffer against cost increases.`,
          action: 'Review pricing and the largest operating expense lines below.',
        });
      }
      if (opex > 0 && topCats.length > 0 && topCatShare > 40) {
        findings.push({
          severity: 'HIGH', area: 'Cost concentration',
          finding: `${topCats[0][0]} accounts for ${topCatShare.toFixed(1)}% of all operating expenses (${money(topCats[0][1])}).`,
          action: 'A single line this dominant is where cost reduction has the most leverage. Verify it is correctly classified before acting.',
        });
      }
      if (rev > 0 && grossMargin < 20 && cogs > 0) {
        findings.push({
          severity: 'HIGH', area: 'Gross margin',
          finding: `Gross margin of ${grossMargin.toFixed(1)}% is thin.`,
          action: 'Check whether cost of goods sold is being posted completely — an unusually high gross margin can also mean COGS is under-recorded.',
        });
      }
      if (cogs > 0 && rev > 0 && (cogs / rev) * 100 < 2) {
        findings.push({
          severity: 'MEDIUM', area: 'Data quality',
          finding: `Cost of goods sold is only ${((cogs / rev) * 100).toFixed(2)}% of revenue (${money(cogs)} against ${money(rev)}).`,
          action: 'For most trading businesses this is implausibly low. Purchases may not be posting to COGS, which would overstate gross profit.',
        });
      }
      if (overdue.length > 0) {
        findings.push({
          severity: overdueValue > rev * 0.1 ? 'HIGH' : 'MEDIUM', area: 'Collections',
          finding: `${fmtInt(overdue.length)} overdue invoice(s) worth ${money(overdueValue)}.`,
          action: 'Chase the largest balances first — they are listed in the Invoice Register section.',
        });
      }
      if (dso > 60) {
        findings.push({
          severity: 'MEDIUM', area: 'Collections',
          finding: `Receivables represent roughly ${dso.toFixed(0)} days of sales.`,
          action: 'Anything beyond 60 days ties up working capital. Consider deposits or shorter payment terms.',
        });
      }
      if (liabs > 0 && currentRatio < 1) {
        findings.push({
          severity: 'CRITICAL', area: 'Liquidity',
          finding: `Assets of ${money(assets)} against liabilities of ${money(liabs)} — a ratio of ${currentRatio.toFixed(2)}.`,
          action: 'Below 1.0 means short-term obligations exceed what is available to meet them.',
        });
      }
      if (equity < 0) {
        findings.push({
          severity: 'CRITICAL', area: 'Solvency',
          finding: `Equity is negative at ${money(equity)}.`,
          action: 'Liabilities exceed assets. This requires attention from the directors, not just management.',
        });
      }
      if (Math.abs(assets - (liabs + equity)) > 1) {
        findings.push({
          severity: 'HIGH', area: 'Data quality',
          finding: `The balance sheet does not balance: assets minus liabilities and equity leaves ${money(assets - (liabs + equity))}.`,
          action: 'Every figure derived from the ledger is suspect until this is resolved. Check for double-posting.',
        });
      }
      if (gapRows.length > 0) {
        findings.push({
          severity: 'HIGH', area: 'Data quality',
          finding: `${fmtInt(gapRows.length)} invoice(s) do not reconcile: recorded payments differ from invoiced minus outstanding by ${money(Math.abs(gapValue))}.`,
          action: 'Collections are understated by this amount. The pattern matches VAT-exclusive amounts being written to the paid field.',
        });
      }
      if (dupTotal > 0) {
        findings.push({
          severity: 'MEDIUM', area: 'Data quality',
          finding: `${fmtInt(dupTotal)} invoice(s) share a customer, amount and date with another invoice.`,
          action: 'Review for double submission before these figures are used externally.',
        });
      }
      if (unnamedCustomers > 0) {
        findings.push({
          severity: 'MEDIUM', area: 'Data quality',
          finding: `${fmtInt(unnamedCustomers)} invoice(s) carry no usable customer name.`,
          action: 'Customer records cannot be linked to these sales, so customer-level analysis is unavailable.',
        });
      }
      if (outOfStock > 0) {
        findings.push({
          severity: 'MEDIUM', area: 'Inventory',
          finding: `${fmtInt(outOfStock)} product(s) are out of stock and ${fmtInt(lowStock)} are at five units or fewer.`,
          action: 'Out-of-stock items cannot sell. Check these against the Purchase Orders section.',
        });
      }
      if (monthsOfStock > 6 && stockCost > 0) {
        findings.push({
          severity: 'MEDIUM', area: 'Inventory',
          finding: `Stock on hand of ${money(stockCost)} equals roughly ${monthsOfStock.toFixed(1)} months of sales at current cost of sales.`,
          action: 'Capital is tied up in slow-moving stock.',
        });
      }
      if (momRev < -20 && allMonths.length >= 2) {
        findings.push({
          severity: 'HIGH', area: 'Trend',
          finding: `Revenue fell ${Math.abs(momRev).toFixed(1)}% in the most recent month against the one before.`,
          action: 'Check whether this is seasonal, a lost customer, or incomplete posting for the current month.',
        });
      }
      if (findings.length === 0) {
        findings.push({ severity: 'INFO', area: 'Overall', finding: 'No threshold-based issues detected in the available data.', action: 'Continue monitoring.' });
      }

      const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 };
      findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

      return {
        key, title: 'Executive Analysis',
        summary: [
          `Revenue: ${money(rev)}   |   Net Profit: ${money(net)}   |   Net Margin: ${netMargin.toFixed(2)}%`,
          `Gross Margin: ${grossMargin.toFixed(2)}%   |   Operating Expenses: ${opexRatio.toFixed(1)}% of revenue`,
          `Average Monthly Revenue: ${money(avgMonthlyRev)}   |   Average Monthly Operating Cost: ${money(avgMonthlyOpex)}`,
          `Month-on-month revenue change: ${momRev >= 0 ? '+' : ''}${momRev.toFixed(1)}%   over ${monthsCount} month(s) of data`,
          `Collection Rate: ${collectionRate.toFixed(1)}%   |   Outstanding: ${money(outstanding)}   |   Days Sales Outstanding: ${dso.toFixed(0)}`,
          `Receivables: ${money(recv)}   |   Payables: ${money(payb)}   |   Net position: ${money(recv - payb)}`,
          `Assets: ${money(assets)}   |   Liabilities: ${money(liabs)}   |   Equity: ${money(equity)}   |   Ratio: ${currentRatio.toFixed(2)}`,
          `Stock at cost: ${money(stockCost)}   |   At retail: ${money(stockRetail)}   |   Turnover: ${stockTurnover.toFixed(2)}x   |   ${monthsOfStock.toFixed(1)} months of cover`,
          `Findings: ${findings.filter((f) => f.severity === 'CRITICAL').length} critical, ${findings.filter((f) => f.severity === 'HIGH').length} high, ${findings.filter((f) => f.severity === 'MEDIUM').length} medium`,
        ],
        note: recordedPaid !== collected
          ? `Collections are calculated as invoiced minus outstanding (${money(collected)}). The amount_paid field totals ${money(recordedPaid)}; the difference is itemised in the findings below.`
          : undefined,
        columns: [
          { header: 'Severity', width: 70 }, { header: 'Area', width: 100 },
          { header: 'Finding', width: 290 }, { header: 'Suggested action', width: 290 },
        ],
        rows: findings.map((f) => [f.severity, f.area, f.finding, f.action]),
        sheet: findings.map((f) => ({ Severity: f.severity, Area: f.area, Finding: f.finding, SuggestedAction: f.action })),
        landscape: true, totalRows: findings.length,
      };
    }

    // ------------------------------------------------------------ ESTIMATES
    // Quote-to-invoice conversion is traceable because invoices carry
    // source_estimate_id. Which quotes convert, which stall, and what the
    // unconverted pipeline is worth.
    case 'estimates': {
      const [est, conv] = await Promise.all([
        pullAll(ctx, 'estimates', 'estimate_uid, title, client_name, status, total_amount, valid_until, currency_code, created_at',
          (q) => applyRange(q.eq('business_id', ctx.businessId).order('created_at', { ascending: false }), 'created_at', ctx)),
        pullAll(ctx, 'invoices', 'source_estimate_id, total_amount', (q) => q.eq('business_id', ctx.businessId).not('source_estimate_id', 'is', null)),
      ]);
      if (est.error) return emptySection(key, 'Estimates & Quotations', `Source estimates unavailable: ${est.error}`);

      const convertedIds = new Set((conv.rows ?? []).map((r: any) => r.source_estimate_id));
      const total = est.rows.reduce((s, r) => s + num(r.total_amount), 0);
      const converted = est.rows.filter((r: any) => convertedIds.has(r.id));
      const nowMs = Date.now();
      const expired = est.rows.filter((r: any) => r.valid_until && new Date(r.valid_until).getTime() < nowMs && !convertedIds.has(r.id));
      const openValue = est.rows.filter((r: any) => !convertedIds.has(r.id)).reduce((s, r) => s + num(r.total_amount), 0);

      return {
        key, title: 'Estimates & Quotations',
        summary: [
          `Estimates Issued: ${fmtInt(est.rows.length)}`,
          `Total Quoted: ${cur} ${fmt(total)}`,
          `Converted To Invoices: ${fmtInt(conv.rows?.length ?? 0)}`,
          `Conversion Rate: ${est.rows.length ? (((conv.rows?.length ?? 0) / est.rows.length) * 100).toFixed(1) : '0.0'}%`,
          `Open (not yet converted): ${cur} ${fmt(openValue)}`,
          `Expired Without Converting: ${fmtInt(expired.length)} worth ${cur} ${fmt(expired.reduce((s, r) => s + num(r.total_amount), 0))}`,
        ],
        note: expired.length > 0
          ? `${expired.length} quote(s) passed their valid-until date without becoming an invoice. Each one is work already done that earned nothing.`
          : undefined,
        columns: [
          { header: 'Reference', width: 95 }, { header: 'Client', width: 130 },
          { header: 'Title', width: 130 }, { header: `Amount (${cur})`, width: 95, numeric: true },
          { header: 'Status', width: 75 }, { header: 'Valid Until', width: 75 },
        ],
        rows: est.rows.map((r: any) => [
          sanitize(r.estimate_uid), customerLabel(r.client_name), sanitize(r.title),
          fmt(r.total_amount), sanitize(r.status), day(r.valid_until),
        ]),
        sheet: est.rows.map((r: any) => ({
          Reference: r.estimate_uid, Client: customerLabel(r.client_name), Title: r.title,
          Amount: num(r.total_amount), Status: r.status, ValidUntil: day(r.valid_until),
          Created: day(r.created_at), Currency: r.currency_code,
        })),
        landscape: true, totalRows: est.rows.length,
      };
    }

    // ------------------------------------------------------------ POS SALES
    case 'pos_sales': {
      const [sales, items] = await Promise.all([
        pullAll(ctx, 'sales', 'id, total_amount, amount_paid, payment_method, payment_status, status, discount_amount, tax_amount, currency_code, location_id, user_id, created_at',
          (q) => applyRange(q.eq('business_id', ctx.businessId).order('created_at', { ascending: false }), 'created_at', ctx)),
        pullAll(ctx, 'sale_items', 'sale_id, quantity, unit_price, cost_price, total_price',
          (q) => q.eq('business_id', ctx.businessId)),
      ]);
      if (sales.error) return emptySection(key, 'Point of Sale', `Source sales unavailable: ${sales.error}`);

      const total = sales.rows.reduce((s, r) => s + num(r.total_amount), 0);
      const collected = sales.rows.reduce((s, r) => s + num(r.amount_paid), 0);
      const discounts = sales.rows.reduce((s, r) => s + num(r.discount_amount), 0);
      const cost = items.rows.reduce((s, r) => s + num(r.cost_price) * num(r.quantity), 0);
      const itemRevenue = items.rows.reduce((s, r) => s + num(r.total_price), 0);
      const margin = itemRevenue - cost;

      const byMethod = new Map<string, { n: number; v: number }>();
      sales.rows.forEach((r) => {
        const m = sanitize(r.payment_method) || 'Unspecified';
        const b = byMethod.get(m) ?? { n: 0, v: 0 };
        b.n += 1; b.v += num(r.total_amount);
        byMethod.set(m, b);
      });

      return {
        key, title: 'Point of Sale',
        summary: [
          `Sales: ${fmtInt(sales.rows.length)}`,
          `Total Rung Up: ${cur} ${fmt(total)}`,
          `Collected At Till: ${cur} ${fmt(collected)}`,
          `Discounts Given: ${cur} ${fmt(discounts)}`,
          `Cost Of Items Sold: ${cur} ${fmt(cost)}`,
          `Gross Margin On Items: ${cur} ${fmt(margin)}${itemRevenue ? ` (${((margin / itemRevenue) * 100).toFixed(1)}%)` : ''}`,
          `Average Sale: ${cur} ${fmt(sales.rows.length ? total / sales.rows.length : 0)}`,
          ...[...byMethod.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 5)
            .map(([m, b]) => `${m}: ${fmtInt(b.n)} sale(s), ${cur} ${fmt(b.v)}`),
        ],
        note: cost === 0 && itemRevenue > 0
          ? 'Cost price is not recorded on the sale lines, so margin cannot be computed from POS data. Until cost_price is captured at the till, gross margin here reads as the full sale value.'
          : undefined,
        columns: [
          { header: 'Date', width: 80 }, { header: 'Method', width: 95 },
          { header: `Total (${cur})`, width: 90, numeric: true },
          { header: `Paid (${cur})`, width: 90, numeric: true },
          { header: `Discount (${cur})`, width: 85, numeric: true },
          { header: 'Status', width: 75 },
        ],
        rows: sales.rows.map((r) => [
          day(r.created_at), sanitize(r.payment_method), fmt(r.total_amount),
          fmt(r.amount_paid), fmt(r.discount_amount), sanitize(r.payment_status ?? r.status),
        ]),
        sheet: sales.rows.map((r) => ({
          SaleId: r.id, Date: day(r.created_at), Method: r.payment_method,
          Total: num(r.total_amount), Paid: num(r.amount_paid), Discount: num(r.discount_amount),
          Tax: num(r.tax_amount), Status: r.payment_status ?? r.status, Currency: r.currency_code,
        })),
        landscape: true, totalRows: sales.rows.length,
      };
    }

    // ---------------------------------------------------- STAFF PERFORMANCE
    // sales.user_id is populated, so POS activity CAN be attributed to a
    // person. invoices carries no user column at all, so anything raised as a
    // direct invoice is unattributable — that limit is stated on the report
    // rather than quietly ignored.
    case 'staff_performance': {
      const sales = await pullAll(ctx, 'sales', 'user_id, total_amount, amount_paid, discount_amount, created_at',
        (q) => applyRange(q.eq('business_id', ctx.businessId), 'created_at', ctx));
      if (sales.error) return emptySection(key, 'Staff Sales Performance', `Source sales unavailable: ${sales.error}`);
      if (sales.rows.length === 0) return emptySection(key, 'Staff Sales Performance', 'No POS sales in this period.');

      const ids = [...new Set(sales.rows.map((r) => r.user_id).filter(Boolean))];
      const names = new Map<string, string>();
      if (ids.length > 0) {
        try {
          const { data } = await ctx.sb.from('profiles').select('id, full_name').in('id', ids);
          (data ?? []).forEach((p: any) => names.set(p.id, p.full_name || 'Unnamed'));
        } catch (_e) { /* fall back to ids */ }
      }

      const byUser = new Map<string, { n: number; total: number; paid: number; disc: number; first: string; last: string }>();
      sales.rows.forEach((r) => {
        const k = r.user_id ?? 'unattributed';
        const b = byUser.get(k) ?? { n: 0, total: 0, paid: 0, disc: 0, first: '9999', last: '0000' };
        b.n += 1;
        b.total += num(r.total_amount);
        b.paid += num(r.amount_paid);
        b.disc += num(r.discount_amount);
        const d = day(r.created_at);
        if (d && d < b.first) b.first = d;
        if (d && d > b.last) b.last = d;
        byUser.set(k, b);
      });

      const ranked = [...byUser.entries()].sort((a, b) => b[1].total - a[1].total);
      const grand = ranked.reduce((s, [, b]) => s + b.total, 0);
      const unattributed = byUser.get('unattributed');

      return {
        key, title: 'Staff Sales Performance',
        summary: [
          `People With Sales: ${fmtInt(ranked.filter(([k]) => k !== 'unattributed').length)}`,
          `Total Attributed: ${cur} ${fmt(grand - (unattributed?.total ?? 0))}`,
          ...ranked.slice(0, 5).map(([k, b], i) =>
            `${i + 1}. ${k === 'unattributed' ? 'Unattributed' : (names.get(k) ?? k.slice(0, 8))}: ${fmtInt(b.n)} sale(s), ${cur} ${fmt(b.total)} (${grand ? ((b.total / grand) * 100).toFixed(1) : '0.0'}%)`),
        ],
        note: 'Covers POS sales only. The invoices table records no user, so anything raised as a direct invoice cannot be attributed to a person until a created_by column is added and populated.',
        columns: [
          { header: 'Person', width: 150 }, { header: 'Sales', width: 60, numeric: true },
          { header: `Total (${cur})`, width: 105, numeric: true },
          { header: `Collected (${cur})`, width: 105, numeric: true },
          { header: `Discounts (${cur})`, width: 95, numeric: true },
          { header: 'Share', width: 60 }, { header: 'Last Sale', width: 75 },
        ],
        rows: ranked.map(([k, b]) => [
          k === 'unattributed' ? 'Unattributed' : (names.get(k) ?? k.slice(0, 8)),
          fmtInt(b.n), fmt(b.total), fmt(b.paid), fmt(b.disc),
          grand ? `${((b.total / grand) * 100).toFixed(1)}%` : '0.0%',
          b.last === '0000' ? '' : b.last,
        ]),
        sheet: ranked.map(([k, b]) => ({
          Person: k === 'unattributed' ? 'Unattributed' : (names.get(k) ?? k),
          Sales: b.n, Total: b.total, Collected: b.paid, Discounts: b.disc,
          FirstSale: b.first === '9999' ? '' : b.first, LastSale: b.last === '0000' ? '' : b.last,
        })),
        landscape: true, totalRows: ranked.length,
      };
    }

    // ------------------------------------------------------------- PIPELINE
    // deals is scoped by tenant_id, not business_id — the only table in this
    // engine that is, so do not "correct" it to match the others.
    case 'pipeline': {
      const [deals, stages] = await Promise.all([
        pullAll(ctx, 'deals', 'title, value, currency_code, stage_id, contact_name, expected_close_date, status, probability, created_at',
          (q) => applyRange(q.eq('tenant_id', ctx.businessId).order('created_at', { ascending: false }), 'created_at', ctx)),
        pullAll(ctx, 'pipeline_stages', 'id, name, probability, status', (q) => q.eq('tenant_id', ctx.businessId)),
      ]);
      if (deals.error) return emptySection(key, 'Sales Pipeline', `Source deals unavailable: ${deals.error}`);
      if (deals.rows.length === 0) return emptySection(key, 'Sales Pipeline', 'No deals recorded for this business.');

      const stageName = new Map((stages.rows ?? []).map((r: any) => [r.id, r.name]));
      const total = deals.rows.reduce((s, r) => s + num(r.value), 0);
      const weighted = deals.rows.reduce((s, r) => s + num(r.value) * (num(r.probability) / 100), 0);

      const byStage = new Map<string, { n: number; v: number }>();
      deals.rows.forEach((r) => {
        const st = sanitize(stageName.get(r.stage_id) ?? 'Unassigned');
        const b = byStage.get(st) ?? { n: 0, v: 0 };
        b.n += 1; b.v += num(r.value);
        byStage.set(st, b);
      });

      return {
        key, title: 'Sales Pipeline',
        summary: [
          `Open Deals: ${fmtInt(deals.rows.length)}`,
          `Pipeline Value: ${cur} ${fmt(total)}`,
          `Weighted By Probability: ${cur} ${fmt(weighted)}`,
          ...[...byStage.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 6)
            .map(([st, b]) => `${st}: ${fmtInt(b.n)} deal(s), ${cur} ${fmt(b.v)}`),
        ],
        columns: [
          { header: 'Deal', width: 165 }, { header: 'Contact', width: 120 },
          { header: 'Stage', width: 105 }, { header: `Value (${cur})`, width: 95, numeric: true },
          { header: 'Probability', width: 70 }, { header: 'Expected Close', width: 85 },
        ],
        rows: deals.rows.map((r) => [
          sanitize(r.title), sanitize(r.contact_name), sanitize(stageName.get(r.stage_id) ?? 'Unassigned'),
          fmt(r.value), `${fmtInt(r.probability)}%`, day(r.expected_close_date),
        ]),
        sheet: deals.rows.map((r) => ({
          Deal: r.title, Contact: r.contact_name, Stage: stageName.get(r.stage_id) ?? 'Unassigned',
          Value: num(r.value), Probability: num(r.probability),
          WeightedValue: num(r.value) * (num(r.probability) / 100),
          ExpectedClose: day(r.expected_close_date), Status: r.status, Created: day(r.created_at),
        })),
        landscape: true, totalRows: deals.rows.length,
      };
    }

    // ------------------------------------------------------------------ P&L
    case 'pnl': {
      const { rows, error } = await pullAll(ctx, 'view_financial_hub_pnl',
        'category, account_name, amount, report_date',
        (q) => applyRange(q.eq('business_id', ctx.businessId).order('report_date', { ascending: false }), 'report_date', ctx));
      if (error) return emptySection(key, 'Profit & Loss Statement', `Source view_financial_hub_pnl unavailable: ${error}`);
      const rev = rows.filter((r) => r.category === 'Revenue').reduce((s, r) => s + num(r.amount), 0);
      const cogs = rows.filter((r) => r.category === 'Cost of Goods Sold').reduce((s, r) => s + num(r.amount), 0);
      const opex = rows.filter((r) => r.category === 'Operating Expenses').reduce((s, r) => s + num(r.amount), 0);
      const gross = rev - cogs;
      const net = gross - opex;
      const margin = rev !== 0 ? (net / rev) * 100 : 0;
      return {
        key, title: 'Profit & Loss Statement',
        summary: [
          `Total Revenue: ${cur} ${fmt(rev)}`,
          `Cost of Goods Sold: ${cur} ${fmt(cogs)}`,
          `Gross Profit: ${cur} ${fmt(gross)}`,
          `Operating Expenses: ${cur} ${fmt(opex)}`,
          `Net Profit: ${cur} ${fmt(net)}`,
          `Net Margin: ${margin.toFixed(2)}%`,
        ],
        columns: [
          { header: 'Date', width: 75 }, { header: 'Category', width: 145 },
          { header: 'Account', width: 200 }, { header: `Amount (${cur})`, width: 95, numeric: true },
        ],
        rows: rows.map((r) => [day(r.report_date), sanitize(r.category), sanitize(r.account_name), fmt(r.amount)]),
        sheet: rows.map((r) => ({ Date: day(r.report_date), Category: r.category, Account: r.account_name, Amount: num(r.amount) })),
        totalRows: rows.length,
      };
    }

    // -------------------------------------------------------- BALANCE SHEET
    case 'balance_sheet': {
      const { rows, error } = await pullAll(ctx, 'view_financial_hub_balance_sheet',
        'account_category, account_name, final_balance',
        (q) => q.eq('business_id', ctx.businessId));
      if (error) return emptySection(key, 'Balance Sheet', `Source view_financial_hub_balance_sheet unavailable: ${error}`);
      const assets = rows.filter((r) => r.account_category === 'Asset').reduce((s, r) => s + num(r.final_balance), 0);
      const liab = rows.filter((r) => r.account_category === 'Liability').reduce((s, r) => s + num(r.final_balance), 0);
      const equity = rows.filter((r) => r.account_category === 'Equity').reduce((s, r) => s + num(r.final_balance), 0);
      const drift = assets - (liab + equity);
      return {
        key, title: 'Balance Sheet',
        summary: [
          `Total Assets: ${cur} ${fmt(assets)}`,
          `Total Liabilities: ${cur} ${fmt(liab)}`,
          `Total Equity: ${cur} ${fmt(equity)}`,
          `Assets - (Liabilities + Equity): ${cur} ${fmt(drift)}${Math.abs(drift) > 0.5 ? '  << books do not balance' : ''}`,
        ],
        columns: [
          { header: 'Category', width: 130 }, { header: 'Account', width: 265 },
          { header: `Balance (${cur})`, width: 120, numeric: true },
        ],
        rows: rows.map((r) => [sanitize(r.account_category), sanitize(r.account_name), fmt(r.final_balance)]),
        sheet: rows.map((r) => ({ Category: r.account_category, Account: r.account_name, Balance: num(r.final_balance) })),
        totalRows: rows.length,
      };
    }

    // -------------------------------------------------------- TRIAL BALANCE
    case 'trial_balance': {
      const probe = await pullFirstAvailable(ctx, [
        { table: 'view_financial_hub_trial_balance' },
        { table: 'view_trial_balance' },
        { table: 'vw_trial_balance' },
      ]);
      if (!probe.table) return emptySection(key, 'Trial Balance', 'No trial balance view found in this project. Tell me the view or table name and I will wire it in.');
      return { ...dynamicSection(key, 'Trial Balance', probe.rows), key };
    }

    // ------------------------------------------------------- GENERAL LEDGER
    case 'general_ledger': {
      const probe = await pullFirstAvailable(ctx, [
        { table: 'view_general_ledger', dateCol: 'entry_date' },
        { table: 'vw_general_ledger', dateCol: 'entry_date' },
        { table: 'accounting_journal_entries', dateCol: 'entry_date' },
        { table: 'accounting_journal_entries', dateCol: 'created_at' },
      ]);
      if (!probe.table) return emptySection(key, 'General Ledger', 'No general ledger source resolved. Send me the journal table name and its date/amount columns.');
      return { ...dynamicSection(key, 'General Ledger', probe.rows), key, landscape: true };
    }

    // ------------------------------------------------------------ CASH FLOW
    case 'cash_flow': {
      const [pay, exp, run, txn, inv] = await Promise.all([
        pullAll(ctx, 'payments', 'amount, payment_date', (q) => applyRange(q.eq('business_id', ctx.businessId), 'payment_date', ctx)),
        pullAll(ctx, 'expenses', 'amount, date', (q) => applyRange(q.eq('business_id', ctx.businessId), 'date', ctx)),
        pullAll(ctx, 'payroll_runs', 'total_amount, created_at, status', (q) => applyRange(q.eq('tenant_id', ctx.businessId), 'created_at', ctx)),
        pullAll(ctx, 'transactions', 'amount, type, transaction_date', (q) => applyRange(q.eq('business_id', ctx.businessId), 'transaction_date', ctx)),
        pullAll(ctx, 'invoices', 'total_amount, balance_due, created_at', (q) => applyRange(q.eq('business_id', ctx.businessId), 'created_at', ctx)),
      ]);
      const buckets = new Map<string, { inflow: number; outflow: number }>();
      const bump = (m: string, field: 'inflow' | 'outflow', v: number) => {
        const b = buckets.get(m) ?? { inflow: 0, outflow: 0 };
        b[field] += v;
        buckets.set(m, b);
      };

      const IN_TYPES = ['income', 'sale', 'sales', 'credit', 'receipt', 'deposit'];
      const OUT_TYPES = ['expense', 'debit', 'purchase', 'withdrawal', 'payment'];
      const txnInflows = txn.rows.filter((r) => IN_TYPES.includes(norm(r.type)));

      // Inflow source resolution. Where a business records collections in the
      // dedicated payments/transactions tables, use those. Where those tables
      // are empty but invoices carry settled balances, derive collections from
      // the invoice instead of reporting zero income — a cash flow statement
      // showing only outflows is worse than no cash flow statement at all.
      let inflowSource: string;
      if (pay.rows.length > 0 || txnInflows.length > 0) {
        inflowSource = 'payments and transaction records';
        pay.rows.forEach((r) => bump(monthKey(r.payment_date), 'inflow', num(r.amount)));
        txnInflows.forEach((r) => bump(monthKey(r.transaction_date), 'inflow', num(r.amount)));
      } else if (inv.rows.length > 0) {
        inflowSource = 'invoice settlements (payments table holds no records)';
        // total_amount - balance_due, not amount_paid: on direct invoices
        // amount_paid is written with the VAT-exclusive subtotal.
        inv.rows.forEach((r) => {
          const collected = num(r.total_amount) - num(r.balance_due);
          if (collected > 0) bump(monthKey(r.created_at), 'inflow', collected);
        });
      } else {
        inflowSource = 'no inflow source available';
      }

      exp.rows.forEach((r) => bump(monthKey(r.date), 'outflow', num(r.amount)));
      run.rows.forEach((r) => bump(monthKey(r.created_at), 'outflow', num(r.total_amount)));
      txn.rows.forEach((r) => {
        if (OUT_TYPES.includes(norm(r.type))) bump(monthKey(r.transaction_date), 'outflow', num(r.amount));
      });
      const months = [...buckets.keys()].sort();
      let running = 0;
      const rows: string[][] = [];
      const sheet: Record<string, unknown>[] = [];
      let totIn = 0, totOut = 0;
      for (const m of months) {
        const b = buckets.get(m)!;
        const net = b.inflow - b.outflow;
        running += net;
        totIn += b.inflow; totOut += b.outflow;
        rows.push([m, fmt(b.inflow), fmt(b.outflow), fmt(net), fmt(running)]);
        sheet.push({ Month: m, Inflow: b.inflow, Outflow: b.outflow, Net: net, Cumulative: running });
      }
      return {
        key, title: 'Cash Flow Summary',
        summary: [
          `Total Inflow: ${cur} ${fmt(totIn)}`,
          `Total Outflow: ${cur} ${fmt(totOut)}`,
          `Net Movement: ${cur} ${fmt(totIn - totOut)}`,
          `Months Covered: ${months.length}`,
          `Inflow derived from: ${inflowSource}`,
        ],
        note: inflowSource.startsWith('invoice settlements')
          ? 'Inflow figures are derived from invoice settlements because no payment or transaction records exist for this business. They reflect invoiced amounts marked as settled, which may differ in timing from money actually received into a bank or mobile money account.'
          : undefined,
        columns: [
          { header: 'Month', width: 90 }, { header: `Inflow (${cur})`, width: 105, numeric: true },
          { header: `Outflow (${cur})`, width: 105, numeric: true },
          { header: `Net (${cur})`, width: 105, numeric: true },
          { header: `Cumulative (${cur})`, width: 110, numeric: true },
        ],
        rows, sheet, totalRows: rows.length,
      };
    }

    // ----------------------------------------------------------- AGING / AR / AP
    case 'aging':
    case 'receivables':
    case 'payables': {
      const { rows, error } = await pullAll(ctx, 'view_universal_financial_aging',
        'type, name, reference, currency, amount, created_at',
        (q) => applyRange(q.eq('business_id', ctx.businessId).order('created_at', { ascending: true }), 'created_at', ctx));
      if (error) return emptySection(key, 'Aging Report', `Source view_universal_financial_aging unavailable: ${error}`);
      const filtered = key === 'receivables' ? rows.filter((r) => r.type === 'Receivable')
        : key === 'payables' ? rows.filter((r) => r.type === 'Payable')
        : rows;
      const title = key === 'receivables' ? 'Accounts Receivable Aging'
        : key === 'payables' ? 'Accounts Payable Aging'
        : 'Receivables & Payables Aging';
      const bucketTotals = new Map<string, number>();
      filtered.forEach((r) => bucketTotals.set(ageBucket(r.created_at), (bucketTotals.get(ageBucket(r.created_at)) ?? 0) + num(r.amount)));
      const recv = filtered.filter((r) => r.type === 'Receivable').reduce((s, r) => s + num(r.amount), 0);
      const pay = filtered.filter((r) => r.type === 'Payable').reduce((s, r) => s + num(r.amount), 0);
      const summary = [
        `Total Receivable: ${cur} ${fmt(recv)}`,
        `Total Payable: ${cur} ${fmt(pay)}`,
        `Net Position: ${cur} ${fmt(recv - pay)}`,
        ...['0-30 days', '31-60 days', '61-90 days', '90+ days']
          .filter((b) => bucketTotals.has(b))
          .map((b) => `${b}: ${cur} ${fmt(bucketTotals.get(b))}`),
      ];
      return {
        key, title, summary,
        columns: [
          { header: 'Type', width: 75 }, { header: 'Name', width: 145 },
          { header: 'Reference', width: 90 }, { header: `Amount (${cur})`, width: 95, numeric: true },
          { header: 'Since', width: 65 }, { header: 'Age', width: 75 },
        ],
        rows: filtered.map((r) => [sanitize(r.type), sanitize(r.name), sanitize(r.reference), fmt(r.amount), day(r.created_at), ageBucket(r.created_at)]),
        sheet: filtered.map((r) => ({ Type: r.type, Name: r.name, Reference: r.reference, Currency: r.currency, Amount: num(r.amount), Since: day(r.created_at), Age: ageBucket(r.created_at) })),
        totalRows: filtered.length,
      };
    }

    // ------------------------------------------------------------- INVOICES
    case 'invoices': {
      const { rows, error } = await pullAll(ctx, 'invoices',
        'invoice_number, customer_name, total_amount, amount_paid, balance_due, status, payment_status, due_date, currency, created_at',
        (q) => applyRange(q.eq('business_id', ctx.businessId).order('created_at', { ascending: false }), 'created_at', ctx));
      if (error) return emptySection(key, 'Invoice Register', `Source invoices unavailable: ${error}`);
      const total = rows.reduce((s, r) => s + num(r.total_amount), 0);
      const outstanding = rows.reduce((s, r) => s + num(r.balance_due), 0);

      // Collected is derived, not read from amount_paid. On direct invoices
      // amount_paid carries the VAT-exclusive subtotal, so summing it
      // understates collections. balance_due agrees with the aging view.
      const collected = rows.reduce((s, r) => s + (num(r.total_amount) - num(r.balance_due)), 0);
      const recordedPaid = rows.reduce((s, r) => s + num(r.amount_paid), 0);
      const reconGap = collected - recordedPaid;
      const gapRows = rows.filter((r) => Math.abs(num(r.total_amount) - num(r.amount_paid) - num(r.balance_due)) > 0.5);

      const now = Date.now();
      const overdue = rows.filter((r) =>
        norm(r.status) === 'overdue' ||
        (!isPaidStatus(r.payment_status) && !isPaidStatus(r.status) &&
         r.due_date && new Date(r.due_date).getTime() < now));
      const overdueValue = overdue.reduce((s, r) => s + num(r.balance_due), 0);

      // Same customer, same amount, same calendar day.
      const dupKeys = new Map<string, number>();
      rows.forEach((r) => {
        const k = `${sanitize(r.customer_name)}|${num(r.total_amount)}|${day(r.created_at)}`;
        dupKeys.set(k, (dupKeys.get(k) ?? 0) + 1);
      });
      const dupGroups = [...dupKeys.values()].filter((n) => n > 1);
      const dupCount = dupGroups.reduce((s, n) => s + n, 0);

      const summary = [
        `Invoices: ${fmtInt(rows.length)}`,
        `Total Invoiced: ${cur} ${fmt(total)}`,
        `Total Collected: ${cur} ${fmt(collected)}`,
        `Outstanding Balance: ${cur} ${fmt(outstanding)}`,
        `Overdue: ${fmtInt(overdue.length)} invoice(s) worth ${cur} ${fmt(overdueValue)}`,
        `Collection Rate: ${total !== 0 ? ((collected / total) * 100).toFixed(1) : '0.0'}%`,
      ];
      if (Math.abs(reconGap) > 0.5) {
        summary.push(`RECONCILIATION: the amount_paid field totals ${cur} ${fmt(recordedPaid)}, which is ${cur} ${fmt(Math.abs(reconGap))} ${reconGap > 0 ? 'less' : 'more'} than invoiced minus outstanding. ${fmtInt(gapRows.length)} invoice(s) do not balance.`);
      }
      if (dupGroups.length > 0) {
        summary.push(`POSSIBLE DUPLICATES: ${fmtInt(dupCount)} invoice(s) across ${fmtInt(dupGroups.length)} group(s) share a customer, amount and date.`);
      }

      return {
        key, title: 'Invoice Register',
        summary,
        note: Math.abs(reconGap) > 0.5
          ? 'Collected is calculated as invoiced minus outstanding balance, not from the amount_paid field, because amount_paid does not reconcile on every invoice. Both figures appear in the Excel export for checking.'
          : undefined,
        columns: [
          { header: 'Invoice #', width: 85 }, { header: 'Customer', width: 140 },
          { header: `Total (${cur})`, width: 90, numeric: true }, { header: `Collected (${cur})`, width: 90, numeric: true },
          { header: `Balance (${cur})`, width: 90, numeric: true }, { header: 'Status', width: 70 },
          { header: 'Due', width: 70 },
        ],
        rows: rows.map((r) => [
          sanitize(r.invoice_number), customerLabel(r.customer_name), fmt(r.total_amount),
          fmt(num(r.total_amount) - num(r.balance_due)), fmt(r.balance_due),
          sanitize(r.payment_status ?? r.status), day(r.due_date),
        ]),
        sheet: rows.map((r) => ({
          Invoice: r.invoice_number,
          Customer: customerLabel(r.customer_name),
          Total: num(r.total_amount),
          Collected: num(r.total_amount) - num(r.balance_due),
          RecordedAmountPaid: num(r.amount_paid),
          ReconciliationGap: num(r.total_amount) - num(r.amount_paid) - num(r.balance_due),
          Balance: num(r.balance_due),
          Status: r.status,
          PaymentStatus: r.payment_status,
          DueDate: day(r.due_date),
          Currency: r.currency,
          Created: day(r.created_at),
        })),
        landscape: true, totalRows: rows.length,
      };
    }

    // ------------------------------------------------------------- PAYMENTS
    case 'payments': {
      const { rows, error } = await pullAll(ctx, 'payments',
        'amount, payment_date, method, receipt_number, currency_code',
        (q) => applyRange(q.eq('business_id', ctx.businessId).order('payment_date', { ascending: false }), 'payment_date', ctx));
      if (error) return emptySection(key, 'Payments Received', `Source payments unavailable: ${error}`);
      const total = rows.reduce((s, r) => s + num(r.amount), 0);
      const byMethod = new Map<string, number>();
      rows.forEach((r) => {
        const m = sanitize(r.method) || 'Unspecified';
        byMethod.set(m, (byMethod.get(m) ?? 0) + num(r.amount));
      });
      return {
        key, title: 'Payments Received',
        summary: [
          `Payments: ${fmtInt(rows.length)}`,
          `Total Received: ${cur} ${fmt(total)}`,
          ...[...byMethod.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([m, v]) => `${m}: ${cur} ${fmt(v)}`),
        ],
        note: rows.length === 0
          ? 'No records exist in the payments table for this business. That does not mean nothing was collected — settlements are recorded on the invoices themselves. See the Invoice Register or Cash Flow report for collections.'
          : undefined,
        columns: [
          { header: 'Date', width: 85 }, { header: 'Receipt #', width: 110 },
          { header: 'Method', width: 130 }, { header: `Amount (${cur})`, width: 110, numeric: true },
        ],
        rows: rows.map((r) => [day(r.payment_date), sanitize(r.receipt_number), sanitize(r.method), fmt(r.amount)]),
        sheet: rows.map((r) => ({ Date: day(r.payment_date), Receipt: r.receipt_number, Method: r.method, Amount: num(r.amount), Currency: r.currency_code })),
        totalRows: rows.length,
      };
    }

    // ---------------------------------------------------------------- SALES
    case 'sales': {
      const { rows, error } = await pullAll(ctx, 'invoices',
        'customer_name, total_amount, amount_paid, balance_due, created_at',
        (q) => applyRange(q.eq('business_id', ctx.businessId), 'created_at', ctx));
      if (error) return emptySection(key, 'Sales Summary', `Source invoices unavailable: ${error}`);
      const byMonth = new Map<string, { count: number; total: number; paid: number }>();
      const byCustomer = new Map<string, number>();
      rows.forEach((r) => {
        const m = monthKey(r.created_at);
        const b = byMonth.get(m) ?? { count: 0, total: 0, paid: 0 };
        b.count += 1; b.total += num(r.total_amount); b.paid += num(r.amount_paid);
        byMonth.set(m, b);
        const c = sanitize(r.customer_name) || 'Walk-in';
        byCustomer.set(c, (byCustomer.get(c) ?? 0) + num(r.total_amount));
      });
      const months = [...byMonth.keys()].sort();
      const top = [...byCustomer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      const total = rows.reduce((s, r) => s + num(r.total_amount), 0);
      return {
        key, title: 'Sales Summary',
        summary: [
          `Total Sales: ${cur} ${fmt(total)}`,
          `Invoices Issued: ${fmtInt(rows.length)}`,
          `Average Invoice Value: ${cur} ${fmt(rows.length ? total / rows.length : 0)}`,
          ...top.slice(0, 5).map(([c, v], i) => `Top customer ${i + 1}: ${c} - ${cur} ${fmt(v)}`),
        ],
        columns: [
          { header: 'Month', width: 95 }, { header: 'Invoices', width: 80, numeric: true },
          { header: `Invoiced (${cur})`, width: 120, numeric: true },
          { header: `Collected (${cur})`, width: 120, numeric: true },
          { header: `Outstanding (${cur})`, width: 100, numeric: true },
        ],
        rows: months.map((m) => {
          const b = byMonth.get(m)!;
          return [m, fmtInt(b.count), fmt(b.total), fmt(b.paid), fmt(b.total - b.paid)];
        }),
        sheet: months.map((m) => {
          const b = byMonth.get(m)!;
          return { Month: m, Invoices: b.count, Invoiced: b.total, Collected: b.paid, Outstanding: b.total - b.paid };
        }),
        totalRows: months.length,
      };
    }

    // ------------------------------------------------------------ CUSTOMERS
    case 'customers': {
      const probe = await pullFirstAvailable(ctx, [
        { table: 'customers', cols: 'name, email, phone, created_at' },
        { table: 'view_customer_master' },
        { table: 'clients' },
      ]);
      if (!probe.table) return emptySection(key, 'Customer Directory', 'No customers table resolved for this business.');
      return { ...dynamicSection(key, 'Customer Directory', probe.rows), key };
    }

    // ------------------------------------------------------------- EXPENSES
    case 'expenses': {
      const { rows, error } = await pullAll(ctx, 'expenses',
        'description, amount, category, vendor_name, payment_status, date, currency_code',
        (q) => applyRange(q.eq('business_id', ctx.businessId).order('date', { ascending: false }), 'date', ctx));
      if (error) return emptySection(key, 'Expense Report', `Source expenses unavailable: ${error}`);
      const total = rows.reduce((s, r) => s + num(r.amount), 0);
      const unpaid = rows.filter((r) => String(r.payment_status ?? '').toLowerCase() !== 'paid');
      const byCat = new Map<string, number>();
      rows.forEach((r) => {
        const c = sanitize(r.category) || 'Uncategorised';
        byCat.set(c, (byCat.get(c) ?? 0) + num(r.amount));
      });
      return {
        key, title: 'Expense Report',
        summary: [
          `Records: ${fmtInt(rows.length)}`,
          `Total Expenses: ${cur} ${fmt(total)}`,
          `Unpaid / Pending: ${fmtInt(unpaid.length)} worth ${cur} ${fmt(unpaid.reduce((s, r) => s + num(r.amount), 0))}`,
          ...[...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, v]) => `${c}: ${cur} ${fmt(v)} (${total ? ((v / total) * 100).toFixed(1) : '0.0'}%)`),
        ],
        columns: [
          { header: 'Date', width: 70 }, { header: 'Vendor', width: 120 },
          { header: 'Category', width: 100 }, { header: 'Description', width: 130 },
          { header: 'Status', width: 60 }, { header: `Amount (${cur})`, width: 90, numeric: true },
        ],
        rows: rows.map((r) => [day(r.date), sanitize(r.vendor_name), sanitize(r.category), sanitize(r.description), sanitize(r.payment_status), fmt(r.amount)]),
        sheet: rows.map((r) => ({ Date: day(r.date), Vendor: r.vendor_name, Category: r.category, Description: r.description, Status: r.payment_status, Amount: num(r.amount), Currency: r.currency_code })),
        landscape: true, totalRows: rows.length,
      };
    }

    // --------------------------------------------------------------- BUDGET
    case 'budget': {
      const probe = await pullFirstAvailable(ctx, [
        { table: 'view_budget_vs_actual' },
        { table: 'budget_lines' },
        { table: 'budgets' },
        { table: 'accounting_budgets' },
      ]);
      if (!probe.table) {
        return emptySection(key, 'Budget vs Actual',
          'No budget source found in this project. Create a budgets table (see sql/aura_reports_setup.sql for a starter schema) or tell me the table you already use, and this report will populate automatically.');
      }
      // If the source already exposes budget + actual columns, compute variance.
      const first = probe.rows[0] ?? {};
      const budgetCol = ['budget_amount', 'budgeted', 'amount_budgeted', 'planned_amount', 'amount'].find((c) => c in first);
      const actualCol = ['actual_amount', 'actual', 'amount_spent', 'spent'].find((c) => c in first);
      if (budgetCol && actualCol) {
        const labelCol = ['category', 'account_name', 'name', 'line_item'].find((c) => c in first) ?? Object.keys(first)[0];
        const totB = probe.rows.reduce((s, r) => s + num(r[budgetCol]), 0);
        const totA = probe.rows.reduce((s, r) => s + num(r[actualCol]), 0);
        return {
          key, title: 'Budget vs Actual',
          summary: [
            `Total Budgeted: ${cur} ${fmt(totB)}`,
            `Total Actual: ${cur} ${fmt(totA)}`,
            `Variance: ${cur} ${fmt(totB - totA)} (${totB ? (((totB - totA) / totB) * 100).toFixed(1) : '0.0'}%)`,
          ],
          columns: [
            { header: 'Line', width: 175 }, { header: `Budget (${cur})`, width: 110, numeric: true },
            { header: `Actual (${cur})`, width: 110, numeric: true },
            { header: `Variance (${cur})`, width: 120, numeric: true },
          ],
          rows: probe.rows.map((r) => [sanitize(r[labelCol]), fmt(r[budgetCol]), fmt(r[actualCol]), fmt(num(r[budgetCol]) - num(r[actualCol]))]),
          sheet: probe.rows.map((r) => ({ Line: r[labelCol], Budget: num(r[budgetCol]), Actual: num(r[actualCol]), Variance: num(r[budgetCol]) - num(r[actualCol]) })),
          totalRows: probe.rows.length,
        };
      }
      return { ...dynamicSection(key, 'Budget', probe.rows), key };
    }

    // ------------------------------------------------------------ INVENTORY
    case 'inventory': {
      const { rows, error } = await pullAll(ctx, 'view_inventory_master',
        'product_name, sku, stock_quantity, unit_cost, display_price, category_name',
        (q) => q.eq('business_id', ctx.businessId).eq('is_active', true).order('stock_quantity', { ascending: true }));
      if (error) return emptySection(key, 'Inventory Report', `Source view_inventory_master unavailable: ${error}`);
      const units = rows.reduce((s, r) => s + num(r.stock_quantity), 0);
      const costValue = rows.reduce((s, r) => s + num(r.stock_quantity) * num(r.unit_cost), 0);
      const retailValue = rows.reduce((s, r) => s + num(r.stock_quantity) * num(r.display_price), 0);
      const low = rows.filter((r) => num(r.stock_quantity) <= 5);
      const out = rows.filter((r) => num(r.stock_quantity) <= 0);
      return {
        key, title: 'Inventory Report',
        summary: [
          `Active SKUs: ${fmtInt(rows.length)}`,
          `Total Units On Hand: ${fmtInt(units)}`,
          `Stock Value At Cost: ${cur} ${fmt(costValue)}`,
          `Potential Retail Value: ${cur} ${fmt(retailValue)}`,
          `Projected Gross Margin: ${cur} ${fmt(retailValue - costValue)}`,
          `Out Of Stock: ${fmtInt(out.length)}   |   Low Stock (5 or fewer): ${fmtInt(low.length)}`,
        ],
        columns: [
          { header: 'Product', width: 150 }, { header: 'SKU', width: 80 },
          { header: 'Category', width: 90 }, { header: 'Qty', width: 50, numeric: true },
          { header: `Unit Cost (${cur})`, width: 85, numeric: true },
          { header: `Price (${cur})`, width: 80, numeric: true },
          { header: `Stock Value (${cur})`, width: 95, numeric: true },
        ],
        rows: rows.map((r) => [sanitize(r.product_name), sanitize(r.sku), sanitize(r.category_name), fmtInt(r.stock_quantity), fmt(r.unit_cost), fmt(r.display_price), fmt(num(r.stock_quantity) * num(r.unit_cost))]),
        sheet: rows.map((r) => ({ Product: r.product_name, SKU: r.sku, Category: r.category_name, Quantity: num(r.stock_quantity), UnitCost: num(r.unit_cost), Price: num(r.display_price), StockValue: num(r.stock_quantity) * num(r.unit_cost) })),
        landscape: true, totalRows: rows.length,
      };
    }

    case 'inventory_valuation': {
      const probe = await pullFirstAvailable(ctx, [{ table: 'view_inventory_valuation' }]);
      if (!probe.table) return emptySection(key, 'Inventory Valuation', 'Source view_inventory_valuation unavailable.');
      const total = probe.rows.reduce((s, r) => s + num((r as any).total_value), 0);
      return { ...dynamicSection(key, 'Inventory Valuation', probe.rows), key, summary: [`Total Inventory Value: ${cur} ${fmt(total)}`] };
    }

    // ------------------------------------------------------- PURCHASE ORDERS
    case 'purchase_orders': {
      const [po, sup] = await Promise.all([
        pullAll(ctx, 'purchase_orders', 'supplier_id, status, total_amount, currency_code, order_date, expected_delivery_date',
          (q) => applyRange(q.eq('business_id', ctx.businessId).order('order_date', { ascending: false }), 'order_date', ctx)),
        pullAll(ctx, 'suppliers', 'id, name', (q) => q.eq('business_id', ctx.businessId)),
      ]);
      if (po.error) return emptySection(key, 'Purchase Orders', `Source purchase_orders unavailable: ${po.error}`);
      const map = new Map((sup.rows ?? []).map((s: any) => [s.id, s.name]));
      const total = po.rows.reduce((s, r) => s + num(r.total_amount), 0);
      const pending = po.rows.filter((r) => String(r.status ?? '').toLowerCase() === 'pending');
      return {
        key, title: 'Purchase Orders',
        summary: [
          `Purchase Orders: ${fmtInt(po.rows.length)}`,
          `Total Committed: ${cur} ${fmt(total)}`,
          `Pending: ${fmtInt(pending.length)} worth ${cur} ${fmt(pending.reduce((s, r) => s + num(r.total_amount), 0))}`,
        ],
        columns: [
          { header: 'Order Date', width: 80 }, { header: 'Supplier', width: 160 },
          { header: 'Status', width: 80 }, { header: `Amount (${cur})`, width: 100, numeric: true },
          { header: 'Expected', width: 85 },
        ],
        rows: po.rows.map((r) => [day(r.order_date), sanitize(map.get(r.supplier_id) ?? 'Unknown Supplier'), sanitize(r.status), fmt(r.total_amount), day(r.expected_delivery_date)]),
        sheet: po.rows.map((r) => ({ OrderDate: day(r.order_date), Supplier: map.get(r.supplier_id) ?? 'Unknown Supplier', Status: r.status, Amount: num(r.total_amount), Currency: r.currency_code, Expected: day(r.expected_delivery_date) })),
        totalRows: po.rows.length,
      };
    }

    case 'suppliers': {
      const { rows, error } = await pullAll(ctx, 'suppliers', '*', (q) => q.eq('business_id', ctx.businessId));
      if (error) return emptySection(key, 'Supplier Directory', `Source suppliers unavailable: ${error}`);
      return { ...dynamicSection(key, 'Supplier Directory', rows), key };
    }

    // -------------------------------------------------------------- PAYROLL
    case 'payroll': {
      const { rows, error } = await pullAll(ctx, 'payroll_runs',
        'status, total_amount, processed_at, created_at',
        (q) => applyRange(q.eq('tenant_id', ctx.businessId).order('created_at', { ascending: false }), 'created_at', ctx));
      if (error) return emptySection(key, 'Payroll History', `Source payroll_runs unavailable: ${error}`);
      const total = rows.reduce((s, r) => s + num(r.total_amount), 0);
      const completed = rows.filter((r) => String(r.status ?? '').toLowerCase() === 'completed' || String(r.status ?? '').toLowerCase() === 'processed');
      return {
        key, title: 'Payroll History',
        summary: [
          `Payroll Runs: ${fmtInt(rows.length)}`,
          `Total Disbursed (all listed runs): ${cur} ${fmt(total)}`,
          `Completed Runs: ${fmtInt(completed.length)}`,
          `Average Run: ${cur} ${fmt(rows.length ? total / rows.length : 0)}`,
        ],
        columns: [
          { header: 'Created', width: 95 }, { header: 'Processed', width: 95 },
          { header: 'Status', width: 110 }, { header: `Total (${cur})`, width: 130, numeric: true },
        ],
        rows: rows.map((r) => [day(r.created_at), day(r.processed_at), sanitize(r.status), fmt(r.total_amount)]),
        sheet: rows.map((r) => ({ Created: day(r.created_at), Processed: day(r.processed_at), Status: r.status, Total: num(r.total_amount) })),
        totalRows: rows.length,
      };
    }

    // ------------------------------------------------------------ EMPLOYEES
    case 'employees': {
      const { rows, error } = await pullAll(ctx, 'employees',
        'full_name, name, role, job_title, department, email, is_active, status',
        (q) => q.eq('business_id', ctx.businessId).eq('is_active', true));
      if (error) return emptySection(key, 'Staff Directory', `Source employees unavailable: ${error}`);
      const byDept = new Map<string, number>();
      rows.forEach((r) => {
        const d = sanitize(r.department) || 'Unassigned';
        byDept.set(d, (byDept.get(d) ?? 0) + 1);
      });
      return {
        key, title: 'Staff Directory',
        summary: [
          `Active Employees: ${fmtInt(rows.length)}`,
          ...[...byDept.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([d, c]) => `${d}: ${c}`),
        ],
        columns: [
          { header: 'Name', width: 160 }, { header: 'Role', width: 150 },
          { header: 'Department', width: 110 }, { header: 'Status', width: 80 },
        ],
        rows: rows.map((r) => [sanitize(r.full_name ?? r.name), sanitize(r.job_title ?? r.role), sanitize(r.department), sanitize(r.status ?? 'active')]),
        sheet: rows.map((r) => ({ Name: r.full_name ?? r.name, Role: r.job_title ?? r.role, Department: r.department, Email: r.email, Status: r.status ?? 'active' })),
        totalRows: rows.length,
      };
    }

    // --------------------------------------------------------- TRANSACTIONS
    case 'transactions': {
      const { rows, error } = await pullAll(ctx, 'transactions',
        'transaction_date, description, type, amount, member_name',
        (q) => applyRange(q.eq('business_id', ctx.businessId).order('transaction_date', { ascending: false }), 'transaction_date', ctx));
      if (error) return emptySection(key, 'Transaction Ledger', `Source transactions unavailable: ${error}`);
      const total = rows.reduce((s, r) => s + num(r.amount), 0);
      const byType = new Map<string, number>();
      rows.forEach((r) => {
        const t = sanitize(r.type) || 'Unspecified';
        byType.set(t, (byType.get(t) ?? 0) + num(r.amount));
      });
      return {
        key, title: 'Transaction Ledger',
        summary: [
          `Transactions: ${fmtInt(rows.length)}`,
          `Total Value: ${cur} ${fmt(total)}`,
          ...[...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, v]) => `${t}: ${cur} ${fmt(v)}`),
        ],
        columns: [
          { header: 'Date', width: 75 }, { header: 'Type', width: 90 },
          { header: 'Description', width: 175 }, { header: 'Party', width: 80 },
          { header: `Amount (${cur})`, width: 95, numeric: true },
        ],
        rows: rows.map((r) => [day(r.transaction_date), sanitize(r.type), sanitize(r.description), sanitize(r.member_name), fmt(r.amount)]),
        sheet: rows.map((r) => ({ Date: day(r.transaction_date), Type: r.type, Description: r.description, Party: r.member_name, Amount: num(r.amount) })),
        totalRows: rows.length,
      };
    }

    default:
      return emptySection(key, key, `Unknown report section: ${key}`);
  }
}

// ---------------------------------------------------------------------------
// PDF RENDERER
// ---------------------------------------------------------------------------

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 36;

class PdfBuilder {
  doc: any;
  font: any;
  bold: any;
  page: any = null;
  y = 0;
  pw = A4.w;
  ph = A4.h;
  landscape = false;
  brand: Branding = { theme: THEMES.executive, themeName: 'executive', layout: 'banner', logo: null, footerNote: null };

  static async create(brand?: Branding): Promise<PdfBuilder> {
    const b = new PdfBuilder();
    b.doc = await PDFDocument.create();
    b.font = await b.doc.embedFont(StandardFonts.Helvetica);
    b.bold = await b.doc.embedFont(StandardFonts.HelveticaBold);
    if (brand) b.brand = brand;
    return b;
  }

  private c(v: Rgb) { return rgb(v[0], v[1], v[2]); }

  newPage(landscape = this.landscape) {
    this.landscape = landscape;
    this.pw = landscape ? A4.h : A4.w;
    this.ph = landscape ? A4.w : A4.h;
    this.page = this.doc.addPage([this.pw, this.ph]);
    this.y = this.ph - MARGIN;
  }

  get usable(): number {
    return this.pw - MARGIN * 2;
  }

  ensure(space: number, landscape = this.landscape) {
    if (!this.page || this.landscape !== landscape) this.newPage(landscape);
    else if (this.y - space < MARGIN + 26) this.newPage(landscape);
  }

  /** Draws the logo right-aligned at x. Returns its width, or 0 on failure —
   *  a broken logo URL must never take down the whole report. */
  private async drawLogo(x: number, y: number, maxH: number): Promise<number> {
    if (!this.brand.logo) return 0;
    try {
      const img = this.brand.logo.kind === 'png'
        ? await this.doc.embedPng(this.brand.logo.bytes)
        : await this.doc.embedJpg(this.brand.logo.bytes);
      const scale = maxH / img.height;
      const w = img.width * scale;
      this.page.drawImage(img, { x: x - w, y, width: w, height: maxH });
      return w;
    } catch (_e) {
      return 0;
    }
  }

  async cover(title: string, businessName: string, subtitle: string) {
    this.newPage(false);
    const t = this.brand.theme;

    if (this.brand.layout === 'letterhead') {
      await this.drawLogo(this.pw - MARGIN, this.ph - 76, 40);
      this.page.drawText(fitText(businessName, this.usable - 130, 18, this.bold), { x: MARGIN, y: this.ph - 58, size: 18, font: this.bold, color: this.c(t.primary) });
      this.page.drawText(fitText(title, this.usable - 130, 12, this.font), { x: MARGIN, y: this.ph - 76, size: 12, font: this.font, color: rgb(0.35, 0.35, 0.4) });
      this.y = this.ph - 90;
      this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: this.pw - MARGIN, y: this.y }, thickness: 2, color: this.c(t.primary) });
      this.y -= 16;
      this.page.drawText(fitText(subtitle, this.usable, 9.5, this.font), { x: MARGIN, y: this.y, size: 9.5, font: this.font, color: rgb(0.45, 0.45, 0.5) });
      this.y -= 24;

    } else if (this.brand.layout === 'minimal') {
      await this.drawLogo(this.pw - MARGIN, this.ph - 62, 30);
      this.page.drawText(fitText(businessName, this.usable - 120, 16, this.bold), { x: MARGIN, y: this.ph - 52, size: 16, font: this.bold, color: rgb(0.1, 0.1, 0.12) });
      this.page.drawText(fitText(title, this.usable - 120, 11, this.font), { x: MARGIN, y: this.ph - 70, size: 11, font: this.font, color: rgb(0.4, 0.4, 0.45) });
      this.page.drawText(fitText(subtitle, this.usable - 120, 9, this.font), { x: MARGIN, y: this.ph - 84, size: 9, font: this.font, color: rgb(0.55, 0.55, 0.6) });
      this.y = this.ph - 108;

    } else {
      this.page.drawRectangle({ x: 0, y: this.ph - 132, width: this.pw, height: 132, color: this.c(t.primary) });
      await this.drawLogo(this.pw - MARGIN, this.ph - 98, 44);
      this.page.drawText(fitText(businessName, this.usable - 130, 20, this.bold), { x: MARGIN, y: this.ph - 56, size: 20, font: this.bold, color: rgb(1, 1, 1) });
      this.page.drawText(fitText(title, this.usable - 130, 14, this.font), { x: MARGIN, y: this.ph - 80, size: 14, font: this.font, color: this.c(t.subtle) });
      this.page.drawText(fitText(subtitle, this.usable - 130, 9.5, this.font), { x: MARGIN, y: this.ph - 104, size: 9.5, font: this.font, color: this.c(t.subtle) });
      this.y = this.ph - 160;
    }
  }

  sectionTitle(title: string, landscape: boolean) {
    this.ensure(60, landscape);
    this.page.drawText(fitText(title, this.usable, 15, this.bold), { x: MARGIN, y: this.y, size: 15, font: this.bold, color: rgb(0.08, 0.12, 0.2) });
    this.y -= 8;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: this.pw - MARGIN, y: this.y }, thickness: 1, color: this.c(this.brand.theme.primary) });
    this.y -= 18;
  }

  summary(lines: string[]) {
    if (!lines.length) return;
    const boxH = lines.length * 15 + 14;
    this.ensure(boxH + 10);
    this.page.drawRectangle({ x: MARGIN, y: this.y - boxH + 10, width: this.usable, height: boxH, color: this.c(this.brand.theme.panel) });
    let ly = this.y;
    for (const line of lines) {
      this.page.drawText(fitText(line, this.usable - 20, 10, this.bold), { x: MARGIN + 10, y: ly - 2, size: 10, font: this.bold, color: this.c(this.brand.theme.accent) });
      ly -= 15;
    }
    this.y = ly - 12;
  }

  note(text: string) {
    this.ensure(24);
    this.page.drawText(fitText(text, this.usable, 9.5, this.font), { x: MARGIN, y: this.y, size: 9.5, font: this.font, color: rgb(0.55, 0.2, 0.1) });
    this.y -= 20;
  }

  private scaledWidths(columns: Column[]): number[] {
    const raw = columns.map((c) => c.width);
    const sum = raw.reduce((a, b) => a + b, 0);
    const scale = sum > 0 ? this.usable / sum : 1;
    return raw.map((w) => w * scale);
  }

  private headerRow(columns: Column[], widths: number[]) {
    let x = MARGIN;
    for (let i = 0; i < columns.length; i++) {
      const c = columns[i];
      const t = fitText(c.header, widths[i] - 6, 8.5, this.bold);
      const tx = c.numeric ? x + widths[i] - 6 - this.bold.widthOfTextAtSize(t, 8.5) : x;
      this.page.drawText(t, { x: tx, y: this.y, size: 8.5, font: this.bold, color: rgb(0.1, 0.1, 0.12) });
      x += widths[i];
    }
    this.y -= 5;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: this.pw - MARGIN, y: this.y }, thickness: 0.7, color: rgb(0.55, 0.6, 0.68) });
    this.y -= 13;
  }

  table(columns: Column[], rows: string[][], landscape: boolean) {
    if (!columns.length) return;
    this.ensure(60, landscape);
    let widths = this.scaledWidths(columns);
    this.headerRow(columns, widths);
    let zebra = false;
    for (const row of rows) {
      if (this.y < MARGIN + 26) {
        this.newPage(landscape);
        widths = this.scaledWidths(columns);
        this.headerRow(columns, widths);
      }
      if (zebra) {
        this.page.drawRectangle({ x: MARGIN, y: this.y - 3.5, width: this.usable, height: 12.5, color: rgb(0.965, 0.972, 0.98) });
      }
      zebra = !zebra;
      let x = MARGIN;
      for (let i = 0; i < columns.length; i++) {
        const t = fitText(row[i] ?? '', widths[i] - 6, 8, this.font);
        const tx = columns[i].numeric ? x + widths[i] - 6 - this.font.widthOfTextAtSize(t, 8) : x;
        this.page.drawText(t, { x: tx, y: this.y, size: 8, font: this.font, color: rgb(0.15, 0.15, 0.18) });
        x += widths[i];
      }
      this.y -= 12.5;
    }
    this.y -= 16;
  }

  async finish(businessName: string): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    const stamp = sanitize(`${businessName}  |  ${this.brand.footerNote ?? 'Generated by Aura'}  |  ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`);
    pages.forEach((p: any, i: number) => {
      const { width } = p.getSize();
      p.drawText(fitText(stamp, width - MARGIN * 2 - 70, 7.5, this.font), { x: MARGIN, y: 20, size: 7.5, font: this.font, color: rgb(0.55, 0.55, 0.6) });
      const label = `Page ${i + 1} of ${pages.length}`;
      p.drawText(label, { x: width - MARGIN - this.font.widthOfTextAtSize(label, 7.5), y: 20, size: 7.5, font: this.font, color: rgb(0.55, 0.55, 0.6) });
    });
    return await this.doc.save();
  }
}

async function renderPdf(title: string, businessName: string, subtitle: string, sections: Section[], brand?: Branding): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create(brand);
  await pdf.cover(title, businessName, subtitle);
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (i > 0) pdf.newPage(!!s.landscape);
    pdf.sectionTitle(s.title, !!s.landscape);
    pdf.summary(s.summary);
    if (s.note) pdf.note(s.note);
    const shown = s.rows.slice(0, PDF_MAX_ROWS);
    pdf.table(s.columns, shown, !!s.landscape);
    if (s.rows.length > shown.length) {
      pdf.note(`Showing the first ${fmtInt(shown.length)} of ${fmtInt(s.rows.length)} rows. Request this report as Excel or CSV for the complete dataset.`);
    }
  }
  return await pdf.finish(businessName);
}

// ---------------------------------------------------------------------------
// XLSX RENDERER
// ---------------------------------------------------------------------------

function styleSheet(ws: any, sample: Record<string, unknown>) {
  if (!ws['!ref']) return;
  const keys = Object.keys(sample ?? {});
  ws['!cols'] = keys.map((k) => ({ wch: Math.max(12, Math.min(42, k.length + 8)) }));
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = '#,##0.00';
      }
    }
  }
  ws['!autofilter'] = { ref: ws['!ref'] };
}

function renderXlsx(title: string, businessName: string, subtitle: string, sections: Section[]): Uint8Array {
  const wb = XLSX.utils.book_new();

  const overview: Record<string, unknown>[] = [
    { Section: 'Report', Metric: title, Value: '' },
    { Section: 'Business', Metric: businessName, Value: '' },
    { Section: 'Generated', Metric: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC', Value: '' },
    { Section: 'Scope', Metric: subtitle, Value: '' },
    { Section: '', Metric: '', Value: '' },
  ];
  for (const s of sections) {
    for (const line of s.summary) {
      const idx = line.indexOf(':');
      overview.push({
        Section: s.title,
        Metric: idx > -1 ? line.slice(0, idx).trim() : line,
        Value: idx > -1 ? line.slice(idx + 1).trim() : '',
      });
    }
    if (s.note) overview.push({ Section: s.title, Metric: 'Note', Value: s.note });
  }
  const overviewWs = XLSX.utils.json_to_sheet(overview);
  overviewWs['!cols'] = [{ wch: 30 }, { wch: 38 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, overviewWs, 'Summary');

  const used = new Set<string>(['Summary']);
  for (const s of sections) {
    const data = s.sheet.length > 0 ? s.sheet : [{ Note: s.note ?? 'No data available for this section yet.' }];
    const ws = XLSX.utils.json_to_sheet(data);
    styleSheet(ws, data[0] as Record<string, unknown>);
    let name = sheetName(s.title);
    let n = 2;
    while (used.has(name)) name = sheetName(`${s.title} ${n++}`);
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buf);
}

// ---------------------------------------------------------------------------
// CSV RENDERER
// ---------------------------------------------------------------------------

function renderCsv(title: string, businessName: string, subtitle: string, sections: Section[]): Uint8Array {
  const parts: string[] = [
    `"${title.replace(/"/g, '""')}"`,
    `"${businessName.replace(/"/g, '""')}"`,
    `"${subtitle.replace(/"/g, '""')}"`,
    '',
  ];
  for (const s of sections) {
    parts.push(`"== ${s.title.replace(/"/g, '""')} =="`);
    for (const line of s.summary) parts.push(`"${line.replace(/"/g, '""')}"`);
    if (s.note) parts.push(`"${s.note.replace(/"/g, '""')}"`);
    const data = s.sheet.length > 0 ? s.sheet : [{ Note: s.note ?? 'No data available.' }];
    const ws = XLSX.utils.json_to_sheet(data);
    parts.push(XLSX.utils.sheet_to_csv(ws).trimEnd());
    parts.push('');
  }
  return new TextEncoder().encode(parts.join('\n'));
}

// ---------------------------------------------------------------------------
// ACCESS CONTROL
// ---------------------------------------------------------------------------

/**
 * v1.0 handed a signed URL of any tenant's financials to any caller who knew
 * a businessId. Internal calls (from aura-quantum-audit) present the service
 * role key and are trusted; anything else must prove membership.
 */
async function assertAccess(sb: any, req: Request, businessId: string, userId: string): Promise<{ ok: boolean; reason?: string }> {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (serviceKey && token === serviceKey) return { ok: true };

  // User-token path: verify the token, then confirm membership.
  if (token) {
    const { data: userData } = await sb.auth.getUser(token);
    const uid = userData?.user?.id;
    if (uid && uid !== userId) return { ok: false, reason: 'Token identity does not match the requested user.' };
    if (uid) {
      for (const src of MEMBERSHIP_SOURCES) {
        try {
          const { data, error } = await sb.from(src.table).select(src.userCol).eq(src.userCol, uid).eq(src.bizCol, businessId).limit(1);
          if (!error && data && data.length > 0) return { ok: true };
        } catch (_e) { /* table absent — try the next candidate */ }
      }
    }
  }

  if (STRICT_TENANT_CHECK) {
    return { ok: false, reason: 'Caller could not be verified as a member of this business.' };
  }
  console.warn(`[AURA REPORT] Unverified caller for business ${businessId} (user ${userId}). Set AURA_STRICT_TENANT_CHECK=true once your membership table is confirmed.`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const started = Date.now();
  try {
    const body = await req.json();
    const {
      businessId,
      userId,
      reportType,
      format = 'pdf',
      dateFrom = null,
      dateTo = null,
      maxRows = MAX_ROWS_DEFAULT,
      expiresIn = SIGNED_URL_TTL_DEFAULT,
      theme: themeInput = null,
      layout: layoutInput = null,
      logoUrl: logoInput = null,
      footerNote: footerInput = null,
    } = body as Record<string, any>;

    if (!businessId) throw new Error('businessId is required.');
    if (!userId) throw new Error('userId is required.');

    const type = resolveType(reportType);
    if (!type) {
      throw new Error(`Unknown reportType "${reportType}". Supported: ${[...SINGLE_REPORTS, ...Object.keys(PACKS)].join(', ')}`);
    }
    if (!['pdf', 'xlsx', 'csv'].includes(format)) {
      throw new Error("format must be 'pdf', 'xlsx' or 'csv'.");
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const access = await assertAccess(sb, req, businessId, userId);
    if (!access.ok) {
      return new Response(JSON.stringify({ success: false, error: `Access denied: ${access.reason}` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tenant } = await sb.from('tenants').select('*').eq('id', businessId).maybeSingle();
    const businessName = tenant?.name || 'Business';
    const currency = tenant?.currency || 'USD';

    const ctx: Ctx = {
      sb,
      businessId,
      currency,
      from: dateFrom ? String(dateFrom).slice(0, 10) : null,
      to: dateTo ? String(dateTo).slice(0, 10) : null,
      maxRows: Math.max(100, Math.min(Number(maxRows) || MAX_ROWS_DEFAULT, 100000)),
    };

    const keys = PACKS[type] ?? [type];
    const sections: Section[] = [];
    for (const k of keys) {
      sections.push(await buildSection(ctx, k));
    }

    const warnings = sections.filter((s) => s.note).map((s) => `${s.title}: ${s.note}`);
    const scope = ctx.from || ctx.to
      ? `Period: ${ctx.from ?? 'inception'} to ${ctx.to ?? 'today'}`
      : 'Period: all available records';
    const title = PACKS[type]
      ? type.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
      : sections[0].title;

    // --- BRANDING ---
    // Request body wins, then whatever the tenant record happens to carry. The
    // column names differ across projects, so probe rather than assume one.
    const tenantAny = (tenant ?? {}) as Record<string, any>;
    const themeKey = String(themeInput ?? tenantAny.report_theme ?? tenantAny.brand_theme ?? 'executive').toLowerCase();
    const customPrimary = hexToRgb(String(themeInput ?? tenantAny.brand_color ?? tenantAny.primary_color ?? ''));
    const baseTheme = THEMES[themeKey] ?? THEMES.executive;
    const theme: Theme = customPrimary
      ? { ...baseTheme, primary: customPrimary, subtle: [0.85, 0.88, 0.93] }
      : baseTheme;
    const layout: Layout = (LAYOUTS as readonly string[]).includes(String(layoutInput))
      ? layoutInput as Layout
      : 'banner';
    const logoSource = logoInput ?? tenantAny.logo_url ?? tenantAny.logo ?? tenantAny.brand_logo_url ?? tenantAny.company_logo ?? null;
    const branding: Branding = {
      theme,
      themeName: customPrimary ? 'custom' : (THEMES[themeKey] ? themeKey : 'executive'),
      layout,
      logo: logoSource ? await fetchLogo(String(logoSource)) : null,
      footerNote: footerInput ? sanitize(footerInput) : null,
    };

    let fileBytes: Uint8Array;
    let contentType: string;
    if (format === 'pdf') {
      fileBytes = await renderPdf(title, businessName, scope, sections, branding);
      contentType = 'application/pdf';
    } else if (format === 'xlsx') {
      fileBytes = renderXlsx(title, businessName, scope, sections);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      fileBytes = renderCsv(title, businessName, scope, sections);
      contentType = 'text/csv';
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const fileName = `${type}_${stamp}.${format}`;
    const storagePath = `${businessId}/${new Date().getUTCFullYear()}/${fileName}`;

    const { error: uploadError } = await sb.storage
      .from('aura-reports')
      .upload(storagePath, fileBytes, { contentType, upsert: true });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}. Has the private 'aura-reports' bucket been created? See sql/aura_reports_setup.sql.`);
    }

    const ttl = Math.max(60, Math.min(Number(expiresIn) || SIGNED_URL_TTL_DEFAULT, 86400));
    const { data: signed, error: signError } = await sb.storage
      .from('aura-reports')
      .createSignedUrl(storagePath, ttl);

    if (signError || !signed) throw new Error(`Could not create download link: ${signError?.message ?? 'unknown error'}`);

    const rowCount = sections.reduce((s, x) => s + x.totalRows, 0);

    // Best-effort audit trail. Never fails the request.
    try {
      await sb.from('aura_generated_reports').insert({
        business_id: businessId,
        user_id: userId,
        report_type: type,
        format,
        file_name: fileName,
        storage_path: storagePath,
        row_count: rowCount,
        date_from: ctx.from,
        date_to: ctx.to,
        warnings: warnings.length ? warnings : null,
        duration_ms: Date.now() - started,
      });
    } catch (_e) { /* table optional */ }

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signed.signedUrl,
      fileName,
      reportType: type,
      format,
      title,
      businessName,
      currency,
      scope,
      theme: branding.themeName,
      layout: branding.layout,
      logoApplied: branding.logo !== null,
      rowCount,
      sections: sections.map((s) => ({ key: s.key, title: s.title, rows: s.totalRows, summary: s.summary, note: s.note ?? null })),
      warnings,
      expiresInSeconds: ttl,
      durationMs: Date.now() - started,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[AURA REPORT] Generation failed:', (error as Error).message);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});