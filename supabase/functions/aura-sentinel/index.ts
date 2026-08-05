// supabase/functions/aura-sentinel/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA SENTINEL ---
 * v1.1 — finding memory: reports what changed, not the same list every day
 *
 * The half of Aura that does not wait to be asked.
 *
 * Everything else in the system is reactive: a director types a question and
 * gets an answer. That means they learn about 45 overdue invoices only if they
 * happen to think about receivables that morning. The Sentinel runs the same
 * threshold rules on a schedule and reports what changed, which is the actual
 * difference between a chat box and an operations system.
 *
 * It does TWO passes over each business:
 *
 *   OPERATIONAL  — things a director should act on this week. Overdue balances,
 *                  stock at zero, customers over their credit limit, expense
 *                  lines running far above their own average, margin slipping.
 *
 *   INTEGRITY    — things wrong with the books themselves. Invoices that do not
 *                  reconcile, a balance sheet that does not balance, duplicate
 *                  invoices, cost of sales implausibly small against revenue,
 *                  customer records with no usable name.
 *
 * The integrity pass matters more than it looks. Aura reports figures to
 * directors who act on them, and a confidently wrong number is worse than a
 * missing one. This is Aura auditing the ERP rather than only reporting from
 * it — no small-business accounting package tells you its own numbers look
 * suspect, and that is a genuine reason to choose this one.
 *
 * WHAT IT DOES NOT DO
 *
 * It writes nothing. No tables, no triggers, no corrections. It reads the same
 * views the report engine reads and returns findings as JSON. Nothing in the
 * ERP is touched. Persisting findings or alerting on only what is NEW since
 * the last run needs a table; that is noted at the bottom and deliberately not
 * assumed here.
 *
 * CALLING IT
 *   { "action": "scan", "businessId": "<uuid>" }         one business
 *   { "action": "scan", "scope": "all" }                 every business
 *   { "action": "scan", "businessId": "...", "email": ["a@b.com"] }
 *
 * Schedule it by pointing aura-report-schedule or pg_cron at this endpoint.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
const MAX_TENANTS_PER_RUN = 50;

// v1.1 — finding memory. Requires sql/AURA_SENTINEL_MEMORY.sql. If the table
// is absent the Sentinel still runs; it simply reports everything each time,
// exactly as v1.0 did.
const MEMORY = {
  table: 'aura_sentinel_findings',
  emailOnlyNew: true,    // a digest repeating yesterday's list stops being read
  emailWhenQuiet: false, // no findings changed, no email
};

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  pass: 'operational' | 'integrity';
  area: string;
  finding: string;
  action: string;
  value?: number;
  // Filled by reconcileMemory once the finding has been matched against
  // what was already known.
  fingerprint?: string;
  isNew?: boolean;
  firstSeen?: string;
  seenCount?: number;
  daysOpen?: number;
}

// ---------------------------------------------------------------------------
// UTILITIES
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
  return v ? String(v).slice(0, 10) : '';
}

function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function isPaid(v: unknown): boolean {
  return norm(v) === 'paid';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Pages past PostgREST's 1000-row default so totals are not silently short. */
async function pullAll(sb: any, table: string, cols: string, filter: (q: any) => any, max = 20000) {
  const out: any[] = [];
  let offset = 0;
  try {
    while (out.length < max) {
      const { data, error } = await filter(sb.from(table).select(cols)).range(offset, offset + 999);
      if (error) return { rows: out, error: error.message };
      if (!data || data.length === 0) break;
      out.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }
  } catch (e) {
    return { rows: out, error: (e as Error).message };
  }
  return { rows: out, error: null };
}

// ---------------------------------------------------------------------------
// THE SCAN
// ---------------------------------------------------------------------------

async function scanBusiness(sb: any, tenant: any): Promise<{ businessId: string; businessName: string; currency: string; findings: Finding[]; sources: Record<string, string | null> }> {
  const businessId = tenant.id;
  const cur = tenant.currency || 'USD';
  const findings: Finding[] = [];
  const money = (v: number) => `${cur} ${fmt(v)}`;
  const push = (f: Finding) => findings.push(f);

  const [pnl, bs, inv, invn, exp, cust] = await Promise.all([
    pullAll(sb, 'view_financial_hub_pnl', 'category, account_name, amount, report_date', (q: any) => q.eq('business_id', businessId)),
    pullAll(sb, 'view_financial_hub_balance_sheet', 'account_category, account_name, final_balance', (q: any) => q.eq('business_id', businessId)),
    pullAll(sb, 'invoices', 'invoice_number, customer_name, total_amount, amount_paid, balance_due, status, payment_status, due_date, created_at', (q: any) => q.eq('business_id', businessId)),
    pullAll(sb, 'view_inventory_master', 'product_name, sku, stock_quantity, unit_cost, display_price', (q: any) => q.eq('business_id', businessId).eq('is_active', true)),
    pullAll(sb, 'expenses', 'description, amount, category, vendor_name, payment_status, date', (q: any) => q.eq('business_id', businessId)),
    pullAll(sb, 'customers', 'name, credit_limit, outstanding_balance, is_active', (q: any) => q.eq('business_id', businessId)),
  ]);

  const sources: Record<string, string | null> = {
    view_financial_hub_pnl: pnl.error,
    view_financial_hub_balance_sheet: bs.error,
    invoices: inv.error,
    view_inventory_master: invn.error,
    expenses: exp.error,
    customers: cust.error,
  };

  // ---------------------------------------------------------------- FIGURES
  const rev = pnl.rows.filter((r) => r.category === 'Revenue').reduce((s, r) => s + num(r.amount), 0);
  const cogs = pnl.rows.filter((r) => r.category === 'Cost of Goods Sold').reduce((s, r) => s + num(r.amount), 0);
  const opex = pnl.rows.filter((r) => r.category === 'Operating Expenses').reduce((s, r) => s + num(r.amount), 0);
  const net = rev - cogs - opex;

  const assets = bs.rows.filter((r) => r.account_category === 'Asset').reduce((s, r) => s + num(r.final_balance), 0);
  const liabs = bs.rows.filter((r) => r.account_category === 'Liability').reduce((s, r) => s + num(r.final_balance), 0);
  const equity = bs.rows.filter((r) => r.account_category === 'Equity').reduce((s, r) => s + num(r.final_balance), 0);

  // ======================================================================
  // PASS 1 — OPERATIONAL
  // ======================================================================

  const nowMs = Date.now();
  const overdue = inv.rows.filter((r) =>
    norm(r.status) === 'overdue' ||
    (!isPaid(r.payment_status) && !isPaid(r.status) && r.due_date && new Date(r.due_date).getTime() < nowMs));
  const overdueValue = overdue.reduce((s, r) => s + num(r.balance_due), 0);

  if (overdue.length > 0) {
    const worst = [...overdue].sort((a, b) => num(b.balance_due) - num(a.balance_due))[0];
    push({
      severity: overdueValue > rev * 0.1 ? 'HIGH' : 'MEDIUM',
      pass: 'operational', area: 'Collections',
      finding: `${fmtInt(overdue.length)} overdue invoice(s) worth ${money(overdueValue)}. Largest: ${worst.invoice_number ?? 'unnumbered'} at ${money(num(worst.balance_due))}, due ${day(worst.due_date)}.`,
      action: 'Chase the largest balances first. The aging report lists them in order.',
      value: overdueValue,
    });
  }

  const aged90 = overdue.filter((r) => r.due_date && (nowMs - new Date(r.due_date).getTime()) / 86400000 > 90);
  if (aged90.length > 0) {
    push({
      severity: 'HIGH', pass: 'operational', area: 'Collections',
      finding: `${fmtInt(aged90.length)} invoice(s) are more than 90 days past due, worth ${money(aged90.reduce((s, r) => s + num(r.balance_due), 0))}.`,
      action: 'Beyond 90 days, recovery rates fall sharply. Decide now whether to escalate or write off.',
    });
  }

  const outOfStock = invn.rows.filter((r) => num(r.stock_quantity) <= 0);
  if (outOfStock.length > 0) {
    const names = outOfStock.slice(0, 3).map((r) => String(r.product_name ?? r.sku ?? 'unnamed')).join(', ');
    push({
      severity: 'HIGH', pass: 'operational', area: 'Inventory',
      finding: `${fmtInt(outOfStock.length)} product(s) are out of stock, including ${names}${outOfStock.length > 3 ? ' and others' : ''}.`,
      action: 'Out-of-stock items cannot sell. Check against open purchase orders before reordering.',
    });
  }

  const lowStock = invn.rows.filter((r) => num(r.stock_quantity) > 0 && num(r.stock_quantity) <= 5);
  if (lowStock.length > 0) {
    push({
      severity: 'MEDIUM', pass: 'operational', area: 'Inventory',
      finding: `${fmtInt(lowStock.length)} product(s) are down to five units or fewer.`,
      action: 'Reorder before these reach zero.',
    });
  }

  const overLimit = cust.rows.filter((r) => num(r.credit_limit) > 0 && num(r.outstanding_balance) > num(r.credit_limit));
  if (overLimit.length > 0) {
    const worst = [...overLimit].sort((a, b) => (num(b.outstanding_balance) - num(b.credit_limit)) - (num(a.outstanding_balance) - num(a.credit_limit)))[0];
    push({
      severity: 'HIGH', pass: 'operational', area: 'Credit control',
      finding: `${fmtInt(overLimit.length)} customer(s) are over their credit limit. Worst: ${worst.name ?? 'unnamed'} at ${money(num(worst.outstanding_balance))} against a limit of ${money(num(worst.credit_limit))}.`,
      action: 'Hold further credit sales to these accounts until the balance comes down.',
    });
  }

  // Expense lines far above their own category average — a crude but effective
  // outlier check that needs no history table.
  const byCat = new Map<string, number[]>();
  exp.rows.forEach((r) => {
    const c = String(r.category ?? 'Uncategorised');
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(num(r.amount));
  });
  for (const [cat, amounts] of byCat) {
    if (amounts.length < 4) continue;
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const spikes = exp.rows.filter((r) => String(r.category ?? 'Uncategorised') === cat && num(r.amount) > avg * 4 && num(r.amount) > 0);
    if (spikes.length > 0) {
      const top = spikes.sort((a, b) => num(b.amount) - num(a.amount))[0];
      push({
        severity: 'MEDIUM', pass: 'operational', area: 'Expense outlier',
        finding: `An expense of ${money(num(top.amount))} in "${cat}" on ${day(top.date)} is more than four times the average for that category (${money(avg)}). Vendor: ${top.vendor_name ?? 'not recorded'}.`,
        action: 'Confirm this is legitimate and correctly categorised.',
      });
    }
  }

  const unpaidExp = exp.rows.filter((r) => !isPaid(r.payment_status));
  if (unpaidExp.length > 0) {
    push({
      severity: 'MEDIUM', pass: 'operational', area: 'Payables',
      finding: `${fmtInt(unpaidExp.length)} expense(s) remain unpaid, worth ${money(unpaidExp.reduce((s, r) => s + num(r.amount), 0))}.`,
      action: 'Check none are past their supplier terms.',
    });
  }

  if (rev > 0 && net < 0) {
    push({
      severity: 'CRITICAL', pass: 'operational', area: 'Profitability',
      finding: `Trading at a loss of ${money(Math.abs(net))} on revenue of ${money(rev)}.`,
      action: `Break-even needs revenue of ${money(cogs + opex)} at current costs, or operating expenses cut by ${money(Math.abs(net))}.`,
      value: net,
    });
  }

  // ======================================================================
  // PASS 2 — INTEGRITY
  // ======================================================================

  const gapRows = inv.rows.filter((r) => Math.abs(num(r.total_amount) - num(r.amount_paid) - num(r.balance_due)) > 0.5);
  if (gapRows.length > 0) {
    const gapValue = gapRows.reduce((s, r) => s + (num(r.total_amount) - num(r.amount_paid) - num(r.balance_due)), 0);
    const ratios = gapRows.map((r) => num(r.amount_paid) > 0 ? num(r.total_amount) / num(r.amount_paid) : 0);
    const allVat = ratios.length > 0 && ratios.every((x) => Math.abs(x - 1.18) < 0.005);
    push({
      severity: 'HIGH', pass: 'integrity', area: 'Invoice reconciliation',
      finding: `${fmtInt(gapRows.length)} invoice(s) do not reconcile — invoiced minus recorded payments minus outstanding leaves ${money(Math.abs(gapValue))}.${allVat ? ' Every one is out by exactly 18%, which means the VAT-exclusive subtotal is being written to the paid field.' : ''}`,
      action: allVat
        ? 'Collections are understated by this amount. Fix the invoice creation code that assigns amount_paid, then correct the existing rows.'
        : 'Review these invoices individually — the cause is not uniform.',
      value: Math.abs(gapValue),
    });
  }

  const drift = assets - (liabs + equity);
  if (bs.rows.length > 0 && Math.abs(drift) > 1) {
    push({
      severity: 'CRITICAL', pass: 'integrity', area: 'Balance sheet',
      finding: `The books do not balance. Assets minus liabilities and equity leaves ${money(drift)}.`,
      action: 'Every figure derived from the ledger is unreliable until this is resolved. Check for double-posting — the same transaction reaching the ledger through two triggers produces exactly this.',
      value: drift,
    });
  }

  if (rev > 0 && cogs > 0 && (cogs / rev) * 100 < 2) {
    push({
      severity: 'HIGH', pass: 'integrity', area: 'Cost of sales',
      finding: `Cost of goods sold is ${((cogs / rev) * 100).toFixed(2)}% of revenue (${money(cogs)} against ${money(rev)}).`,
      action: 'For a trading business this is implausibly low. Purchases are probably not posting to COGS, which overstates gross profit.',
    });
  }

  if (rev > 0 && opex > rev) {
    push({
      severity: 'HIGH', pass: 'integrity', area: 'Operating expenses',
      finding: `Operating expenses of ${money(opex)} exceed revenue of ${money(rev)}.`,
      action: 'Possible, but check for double-posting before treating it as real — the same expense reaching the ledger twice looks exactly like this.',
    });
  }

  if (bs.rows.length > 0 && equity < 0) {
    push({
      severity: 'CRITICAL', pass: 'integrity', area: 'Solvency',
      finding: `Equity is negative at ${money(equity)} — liabilities exceed assets.`,
      action: 'This is a matter for the directors, not only management. Verify the figure is real before acting on it.',
    });
  }

  const dupMap = new Map<string, any[]>();
  inv.rows.forEach((r) => {
    const k = `${r.customer_name}|${num(r.total_amount)}|${day(r.created_at)}`;
    if (!dupMap.has(k)) dupMap.set(k, []);
    dupMap.get(k)!.push(r);
  });
  const dupGroups = [...dupMap.values()].filter((g) => g.length > 1);
  if (dupGroups.length > 0) {
    const total = dupGroups.reduce((s, g) => s + g.length, 0);
    const value = dupGroups.reduce((s, g) => s + g.slice(1).reduce((t, r) => t + num(r.total_amount), 0), 0);
    push({
      severity: 'MEDIUM', pass: 'integrity', area: 'Duplicate invoices',
      finding: `${fmtInt(total)} invoice(s) across ${fmtInt(dupGroups.length)} group(s) share a customer, amount and date. If duplicated, revenue is overstated by up to ${money(value)}.`,
      action: 'Review before these figures go to a bank or a tax authority.',
      value,
    });
  }

  const namelessInv = inv.rows.filter((r) => /^\d*$/.test(String(r.customer_name ?? '').trim()));
  if (namelessInv.length > 0) {
    push({
      severity: 'MEDIUM', pass: 'integrity', area: 'Customer records',
      finding: `${fmtInt(namelessInv.length)} of ${fmtInt(inv.rows.length)} invoice(s) carry no usable customer name.`,
      action: 'These appear on documents as "Unidentified". Customer-level analysis is impossible until the invoice form captures the customer properly.',
    });
  }

  const failedSources = Object.entries(sources).filter(([, e]) => e !== null);
  if (failedSources.length > 0) {
    push({
      severity: 'LOW', pass: 'integrity', area: 'Data sources',
      finding: `${failedSources.length} source(s) could not be read: ${failedSources.map(([t]) => t).join(', ')}.`,
      action: 'Findings above are based on what could be read, so treat this scan as partial.',
    });
  }

  findings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  return { businessId, businessName: tenant.name || 'Business', currency: cur, findings, sources };
}

// ---------------------------------------------------------------------------
// FINDING MEMORY (v1.1)
// ---------------------------------------------------------------------------

/**
 * Numbers are stripped before hashing. An overdue total moving from 3,500,000
 * to 3,620,000 overnight is the SAME problem, not a new one — hashing the raw
 * text would make every finding look new on every scan and put you straight
 * back to a daily email nobody opens.
 */
async function fingerprint(f: Finding): Promise<string> {
  const skeleton = `${f.pass}|${f.area}|${f.severity}|${f.finding.replace(/[\d.,]+/g, '#')}`;
  const bytes = new TextEncoder().encode(skeleton);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/**
 * Matches this scan against what is already on record:
 *   - unseen fingerprint            -> insert, flagged new
 *   - seen and still open           -> touch last_seen and seen_count
 *   - seen but previously resolved  -> reopen, flagged new (it came back)
 *   - on record but absent now      -> stamp resolved_at
 *
 * A missing table is not an error. The Sentinel's job is reporting, and it
 * should not stop doing that because its memory has not been created yet.
 */
async function reconcileMemory(
  sb: any,
  businessId: string,
  findings: Finding[],
): Promise<{ findings: Finding[]; resolved: any[]; memoryError: string | null }> {
  try {
    for (const f of findings) f.fingerprint = await fingerprint(f);

    const { data: known, error: readErr } = await sb
      .from(MEMORY.table)
      .select('id, fingerprint, first_seen, seen_count, resolved_at')
      .eq('business_id', businessId);

    if (readErr) {
      return { findings, resolved: [], memoryError: `${readErr.message} — reporting everything this run.` };
    }

    const byPrint = new Map((known ?? []).map((r: any) => [r.fingerprint, r]));
    const nowIso = new Date().toISOString();
    const currentPrints = new Set(findings.map((f) => f.fingerprint));

    const toInsert: any[] = [];

    for (const f of findings) {
      const prior: any = byPrint.get(f.fingerprint!);

      if (!prior) {
        f.isNew = true;
        f.firstSeen = nowIso;
        f.seenCount = 1;
        f.daysOpen = 0;
        toInsert.push({
          business_id: businessId,
          fingerprint: f.fingerprint,
          severity: f.severity,
          pass: f.pass,
          area: f.area,
          finding: f.finding,
          action: f.action,
          value: f.value ?? null,
          first_seen: nowIso,
          last_seen: nowIso,
          seen_count: 1,
        });
        continue;
      }

      const reopened = prior.resolved_at !== null;
      f.isNew = reopened;
      f.firstSeen = reopened ? nowIso : prior.first_seen;
      f.seenCount = (prior.seen_count ?? 0) + 1;
      f.daysOpen = Math.floor((Date.now() - new Date(f.firstSeen!).getTime()) / 86400000);

      // The text is refreshed each run so the stored copy carries current
      // figures, while the fingerprint keeps it the same finding.
      await sb.from(MEMORY.table).update({
        severity: f.severity,
        finding: f.finding,
        action: f.action,
        value: f.value ?? null,
        last_seen: nowIso,
        seen_count: f.seenCount,
        resolved_at: null,
        ...(reopened ? { first_seen: nowIso } : {}),
      }).eq('id', prior.id);
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await sb.from(MEMORY.table).insert(toInsert);
      if (insErr) return { findings, resolved: [], memoryError: `Could not record new findings: ${insErr.message}` };
    }

    // Anything previously open that this scan did not produce has gone away.
    // This is what lets a fixed problem stop nagging.
    const gone = (known ?? []).filter((r: any) => r.resolved_at === null && !currentPrints.has(r.fingerprint));
    if (gone.length > 0) {
      await sb.from(MEMORY.table)
        .update({ resolved_at: nowIso })
        .in('id', gone.map((r: any) => r.id));
    }

    return { findings, resolved: gone, memoryError: null };

  } catch (e) {
    return { findings, resolved: [], memoryError: `${(e as Error).message} — reporting everything this run.` };
  }
}

// ---------------------------------------------------------------------------
// EMAIL
// ---------------------------------------------------------------------------

function digestHtml(scan: any, list?: Finding[]): string {
  const esc = (s: string) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
  const colour: Record<string, string> = {
    CRITICAL: '#b91c1c', HIGH: '#c2410c', MEDIUM: '#a16207', LOW: '#475569', INFO: '#475569',
  };
  const shown: Finding[] = list ?? scan.findings;

  const rows = shown.map((f: Finding) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top;white-space:nowrap">
        <span style="color:${colour[f.severity]};font-weight:700;font-size:11px">${f.severity}</span>
        ${f.isNew ? '<br><span style="background:#1d4ed8;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px">NEW</span>' : ''}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:13px">
        <strong>${esc(f.area)}</strong>
        ${!f.isNew && typeof f.daysOpen === 'number' && f.daysOpen > 0
          ? `<span style="color:#94a3b8;font-size:11px"> &mdash; open ${f.daysOpen} day${f.daysOpen === 1 ? '' : 's'}</span>` : ''}
        <br>
        <span style="color:#334155">${esc(f.finding)}</span><br>
        <span style="color:#64748b;font-size:12px">${esc(f.action)}</span>
      </td>
    </tr>`).join('');

  const counts = ['CRITICAL', 'HIGH', 'MEDIUM'].map((s) =>
    `${shown.filter((f: Finding) => f.severity === s).length} ${s.toLowerCase()}`).join(', ');

  const resolvedBlock = (scan.resolved?.length ?? 0) > 0
    ? `<p style="margin-top:18px;padding:10px 12px;background:#f0fdf4;border-radius:8px;color:#166534;font-size:12px">
         ${scan.resolved.length} previously reported item${scan.resolved.length === 1 ? '' : 's'} no longer appear${scan.resolved.length === 1 ? 's' : ''} — closed automatically.
       </p>`
    : '';

  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;color:#0f172a">
  <h2 style="margin:0 0 4px;font-size:18px">${esc(scan.businessName)}</h2>
  <p style="margin:0 0 18px;color:#64748b;font-size:13px">
    Aura scan &mdash; ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC &mdash; ${counts}
  </p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0">${rows}</table>
  ${resolvedBlock}
  <p style="margin-top:22px;color:#94a3b8;font-size:11px">
    Findings are computed directly from your records. Nothing was changed.
  </p>
</div>`;
}

async function sendDigest(sb: any, to: string[], scan: any, list: Finding[]): Promise<string | null> {
  const { data } = await sb.from('aura_system_settings')
    .select('key_name, key_value').in('key_name', ['RESEND_API_KEY', 'AURA_FROM_EMAIL']);
  const key = data?.find((k: any) => k.key_name === 'RESEND_API_KEY')?.key_value;
  const from = data?.find((k: any) => k.key_name === 'AURA_FROM_EMAIL')?.key_value ?? 'Aura <alerts@resend.dev>';
  if (!key) return 'No RESEND_API_KEY in aura_system_settings — scan completed but nothing was emailed.';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to,
        subject: `${scan.businessName}: ${list.filter((f) => f.isNew).length > 0 ? `${list.filter((f) => f.isNew).length} new item(s)` : `${list.length} item(s)`} need attention`,
        html: digestHtml(scan, list),
      }),
    });
    if (!res.ok) return `Email failed: ${res.status} ${(await res.text()).slice(0, 160)}`;
    return null;
  } catch (e) {
    return `Email failed: ${(e as Error).message}`;
  }
}

// ---------------------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const started = Date.now();
  try {
    const body = await req.json();
    const action = String(body.action ?? 'scan').toLowerCase();
    if (action !== 'scan') throw new Error(`Unknown action "${action}". Use "scan".`);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const scope = String(body.scope ?? (body.businessId ? 'one' : 'all')).toLowerCase();
    let tenants: any[] = [];

    if (scope === 'one') {
      if (!body.businessId) throw new Error('businessId is required when scope is "one".');
      const { data, error } = await sb.from('tenants').select('id, name, currency').eq('id', body.businessId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`No business found for id ${body.businessId}.`);
      tenants = [data];
    } else {
      const { data, error } = await sb.from('tenants').select('id, name, currency').limit(MAX_TENANTS_PER_RUN);
      if (error) throw new Error(error.message);
      tenants = data ?? [];
    }

    const useMemory = body.useMemory !== false;

    const scans: any[] = [];
    for (const t of tenants) {
      const scan: any = await scanBusiness(sb, t);
      if (useMemory) {
        const rec = await reconcileMemory(sb, scan.businessId, scan.findings);
        scan.findings = rec.findings;
        scan.resolved = rec.resolved;
        scan.memoryError = rec.memoryError;
      } else {
        scan.resolved = [];
        scan.memoryError = null;
      }
      scans.push(scan);
    }

    // Email only makes sense for a single business — a digest mixing tenants
    // would put one company's figures in front of another.
    let emailNote: string | null = null;
    if (Array.isArray(body.email) && body.email.length > 0) {
      if (scans.length !== 1) {
        emailNote = 'Email skipped: a digest is only sent for a single-business scan, never across tenants.';
      } else {
        const scan = scans[0];
        const onlyNew = body.emailOnlyNew ?? MEMORY.emailOnlyNew;

        // A digest that repeats yesterday's list stops being read, and once it
        // stops being read the genuinely new item goes unnoticed too. Default
        // is changes only.
        const list: Finding[] = (onlyNew && useMemory && !scan.memoryError)
          ? scan.findings.filter((f: Finding) => f.isNew)
          : scan.findings;

        const quiet = list.length === 0 && (scan.resolved?.length ?? 0) === 0;
        if (quiet && !(body.emailWhenQuiet ?? MEMORY.emailWhenQuiet)) {
          emailNote = 'Nothing changed since the last scan — no email sent.';
        } else {
          emailNote = await sendDigest(sb, body.email, scan, list);
          if (!emailNote) {
            const stamped = list.map((f) => f.fingerprint).filter(Boolean);
            if (stamped.length > 0) {
              await sb.from(MEMORY.table)
                .update({ notified_at: new Date().toISOString() })
                .eq('business_id', scan.businessId)
                .in('fingerprint', stamped);
            }
          }
        }
      }
    }

    const totals = scans.reduce((acc, s) => {
      for (const f of s.findings) acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return json({
      success: true,
      scanned: scans.length,
      totals,
      emailNote,
      durationMs: Date.now() - started,
      results: scans.map((s) => ({
        businessId: s.businessId,
        businessName: s.businessName,
        currency: s.currency,
        counts: {
          critical: s.findings.filter((f: Finding) => f.severity === 'CRITICAL').length,
          high: s.findings.filter((f: Finding) => f.severity === 'HIGH').length,
          medium: s.findings.filter((f: Finding) => f.severity === 'MEDIUM').length,
          new: s.findings.filter((f: Finding) => f.isNew).length,
          resolvedThisRun: s.resolved?.length ?? 0,
        },
        memoryError: s.memoryError ?? null,
        resolvedThisRun: (s.resolved ?? []).map((r: any) => ({ area: r.area, finding: r.finding, openSince: r.first_seen })),
        findings: s.findings,
        unreadableSources: Object.entries(s.sources).filter(([, e]) => e !== null).map(([t, e]) => ({ source: t, error: e })),
      })),
    });

  } catch (error) {
    console.error('[AURA SENTINEL]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});

/**
 * OPTIONS ON THE REQUEST
 *
 *   useMemory       default true   false makes it behave like v1.0 and report
 *                                  everything, without touching the table
 *   emailOnlyNew    default true   digest carries changes only
 *   emailWhenQuiet  default false  send even when nothing changed
 *
 * WHAT THE TABLE GIVES YOU BEYOND ALERTING
 *
 * first_seen to resolved_at is a record of how long each problem stood open.
 * "The books were out of balance for nineteen days before anyone noticed" is a
 * question you could not answer before, and it is the sort of thing an auditor
 * asks. Query it directly:
 *
 *   select area, finding, first_seen, resolved_at,
 *          coalesce(resolved_at, now()) - first_seen as open_for
 *   from aura_sentinel_findings
 *   where business_id = '<uuid>'
 *   order by open_for desc;
 */