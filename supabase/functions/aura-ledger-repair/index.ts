// supabase/functions/aura-ledger-repair/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA LEDGER REPAIR ---
 * v1.0 — finds what is wrong, shows it, and fixes it on approval.
 *
 * FOUR ACTIONS, IN ORDER
 *
 *   diagnose          what is wrong, with counts and examples. Reads only.
 *   plan              every individual change, before and after. Reads only.
 *   apply             executes a plan. Requires confirm and a matching hash.
 *   backfill_payments creates payment records for collections that only ever
 *                     existed on the invoice.
 *
 * WHY IT IS SPLIT THIS WAY
 *
 * Nothing is written until a person has seen the exact list. `plan` returns a
 * hash of its own contents, and `apply` recomputes the plan and refuses if the
 * hash no longer matches — so a plan reviewed twenty minutes ago cannot be
 * applied against data that has moved since. Approving a list is only
 * meaningful if the list cannot change between approval and execution.
 *
 * NO TAX RATE IS ASSUMED
 *
 * The VAT rule does not look for 18%, or any figure. It looks for invoices
 * where amount_paid equals subtotal AND the shortfall equals that invoice's
 * own tax_amount. That holds at 18% in Uganda, 16% in Kenya, 7.5% in Nigeria
 * and 20% in the UK, because it reads the arithmetic already on the document
 * rather than applying a rate. A hardcoded rate would silently corrupt every
 * tenant in a different country.
 *
 * NOTHING IS DELETED
 *
 * Duplicates are voided with a reason, never removed. Three arguments for
 * that, any one of which would be enough: a tax authority can ask for these
 * books years from now; the ledger chain records a deleted row as a
 * permanently broken link; and a duplicate that turns out to be a genuine
 * repeat order cannot be recovered once gone.
 *
 * WHAT IT WILL NOT TOUCH
 *
 * Double-posted ledger entries. Those come from duplicated triggers still
 * firing — fn_master_tax_ledger_connector is bound twice on invoices and on
 * expenses, and both accounting kernels run on ten tables. Cleaning their
 * output while they keep producing it is a fight the cleanup cannot win. Fix
 * the triggers, then reverse what they wrote. This function will say so rather
 * than pretend to help.
 *
 * REQUIRES sql/AURA_LEDGER_CORRECTIONS.sql
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_OPS_PER_PLAN = 500;
const CENT = 0.01;

interface Op {
  op: 'update';
  table: string;
  id: string;
  field: string;
  from: unknown;
  to: unknown;
  rule: string;
  reason: string;
  label: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => round2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (v: unknown) => (v ? String(v).slice(0, 10) : '');

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

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

// ---------------------------------------------------------------------------
// THE RULES
// ---------------------------------------------------------------------------

interface Findings {
  reconciliation: any[];
  unexplained: any[];
  duplicates: any[];
  missingPayments: { count: number; value: number };
}

async function examine(sb: any, businessId: string, currency: string): Promise<{ findings: Findings; invoices: any[]; error?: string }> {
  const { rows: invoices, error } = await pullAll(sb, 'invoices',
    'id, invoice_number, customer_name, total_amount, subtotal, tax_amount, amount_paid, balance_due, discount_amount, adjustment_amount, status, payment_status, due_date, created_at, currency',
    (q: any) => q.eq('business_id', businessId).order('created_at', { ascending: true }));

  if (error) return { findings: { reconciliation: [], unexplained: [], duplicates: [], missingPayments: { count: 0, value: 0 } }, invoices: [], error };

  const reconciliation: any[] = [];
  const unexplained: any[] = [];

  for (const inv of invoices) {
    const total = num(inv.total_amount);
    const paid = num(inv.amount_paid);
    const balance = num(inv.balance_due);
    const gap = round2(total - paid - balance);
    if (Math.abs(gap) <= CENT) continue;

    const subtotal = num(inv.subtotal);
    const tax = num(inv.tax_amount);
    const discount = num(inv.discount_amount);
    const adjustment = num(inv.adjustment_amount);

    // The rule: paid was written with the tax-exclusive figure. Confirmed by
    // the document's own numbers, not by any assumed rate.
    const paidEqualsSubtotal = subtotal > 0 && Math.abs(paid - subtotal) <= CENT;
    const gapEqualsTax = tax > 0 && Math.abs(gap - tax) <= CENT;
    const noDiscountInvolved = Math.abs(discount) <= CENT && Math.abs(adjustment) <= CENT;

    const row = {
      id: inv.id,
      invoice: inv.invoice_number,
      customer: inv.customer_name,
      date: day(inv.created_at),
      total, subtotal, tax, paid, balance, gap,
      impliedRate: subtotal > 0 ? round2((tax / subtotal) * 100) : null,
      correctedPaid: round2(total - balance),
    };

    if (paidEqualsSubtotal && gapEqualsTax && noDiscountInvolved) {
      reconciliation.push(row);
    } else {
      // Anything that does not fit the pattern exactly is left alone. A
      // "close enough" repair on a financial record is how good data becomes
      // bad data.
      unexplained.push({
        ...row,
        why: !noDiscountInvolved
          ? 'A discount or adjustment is present, so the shortfall may be legitimate.'
          : !paidEqualsSubtotal
            ? 'The recorded payment does not equal the subtotal, so the cause is not the tax-exclusive write.'
            : 'The shortfall does not equal the tax on this invoice.',
      });
    }
  }

  // Duplicates: same customer, same amount, same calendar day.
  const groups = new Map<string, any[]>();
  for (const inv of invoices) {
    const key = `${inv.customer_name}|${num(inv.total_amount)}|${day(inv.created_at)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(inv);
  }

  const duplicates = [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => {
      const sorted = [...g].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
      const minutes = Math.round(
        (new Date(sorted[sorted.length - 1].created_at).getTime() - new Date(sorted[0].created_at).getTime()) / 60000,
      );
      return {
        customer: sorted[0].customer_name,
        amount: num(sorted[0].total_amount),
        copies: sorted.length,
        minutesApart: minutes,
        // Minutes apart is the only real signal available. Three minutes is
        // almost certainly a double submission; four hours is almost certainly
        // two genuine orders. Neither is certain, which is why this is never
        // automatic.
        likelihood: minutes <= 10 ? 'likely duplicate' : minutes <= 120 ? 'possible duplicate' : 'probably genuine repeat orders',
        invoices: sorted.map((i: any) => ({
          id: i.id, number: i.invoice_number, at: String(i.created_at).slice(0, 16).replace('T', ' '), status: i.status,
        })),
        valueIfDuplicated: round2(num(sorted[0].total_amount) * (sorted.length - 1)),
      };
    })
    .sort((a, b) => a.minutesApart - b.minutesApart);

  const collected = invoices.reduce((s: number, i: any) => s + (num(i.total_amount) - num(i.balance_due)), 0);
  const { rows: payments } = await pullAll(sb, 'payments', 'id, amount', (q: any) => q.eq('business_id', businessId));
  const recorded = payments.reduce((s: number, p: any) => s + num(p.amount), 0);

  return {
    findings: {
      reconciliation,
      unexplained,
      duplicates,
      missingPayments: {
        count: payments.length === 0 ? invoices.filter((i: any) => num(i.total_amount) - num(i.balance_due) > 0).length : 0,
        value: round2(collected - recorded),
      },
    },
    invoices,
  };
}

/** Turns findings into individual, reviewable changes. */
function buildOps(findings: Findings, currency: string): Op[] {
  const ops: Op[] = [];

  for (const r of findings.reconciliation) {
    ops.push({
      op: 'update',
      table: 'invoices',
      id: r.id,
      field: 'amount_paid',
      from: r.paid,
      to: r.correctedPaid,
      rule: 'tax_exclusive_amount_paid',
      reason: `Recorded payment equalled the subtotal (${currency} ${money(r.subtotal)}) rather than the invoiced total. The shortfall of ${currency} ${money(r.gap)} equals the tax on this invoice (${r.impliedRate}%). Outstanding balance is zero, so the full total was collected.`,
      label: `${r.invoice} — ${currency} ${money(r.paid)} to ${currency} ${money(r.correctedPaid)}`,
    });
  }

  return ops.slice(0, MAX_OPS_PER_PLAN);
}

async function hashPlan(ops: Op[]): Promise<string> {
  const canon = ops
    .map((o) => `${o.table}|${o.id}|${o.field}|${o.from}|${o.to}|${o.rule}`)
    .sort()
    .join('\n');
  return await sha256(canon);
}

// ---------------------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const started = Date.now();
  try {
    const body = await req.json();
    const action = String(body.action ?? 'diagnose').toLowerCase();
    const businessId = String(body.businessId ?? '');
    if (!businessId) throw new Error('businessId is required.');

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: tenant } = await sb.from('tenants').select('name, currency, country').eq('id', businessId).maybeSingle();
    const currency = tenant?.currency ?? '';

    // ----------------------------------------------------------- DIAGNOSE
    if (action === 'diagnose') {
      const { findings, error } = await examine(sb, businessId, currency);
      if (error) throw new Error(error);

      const fixableValue = findings.reconciliation.reduce((s, r) => s + r.gap, 0);

      return json({
        success: true,
        business: tenant?.name ?? 'Business',
        currency,
        summary: {
          repairable: findings.reconciliation.length,
          repairableValue: round2(fixableValue),
          needsHumanJudgement: findings.unexplained.length,
          duplicateGroups: findings.duplicates.length,
          paymentsMissing: findings.missingPayments.count,
          paymentsMissingValue: findings.missingPayments.value,
        },
        repairable: findings.reconciliation.slice(0, 100),
        needsHumanJudgement: findings.unexplained.slice(0, 100),
        duplicates: findings.duplicates.slice(0, 50),
        notHandled: [
          'Double-posted ledger entries are not touched. fn_master_tax_ledger_connector is bound twice on invoices and on expenses, and both accounting kernels fire on ten tables — while those triggers run, anything cleaned up is recreated. Remove the duplicate triggers first.',
          'The balance sheet showing negative total assets is a fault in view_financial_hub_balance_sheet, not in the data. No row-level correction can fix a view definition.',
        ],
        durationMs: Date.now() - started,
      });
    }

    // --------------------------------------------------------------- PLAN
    if (action === 'plan') {
      const { findings, error } = await examine(sb, businessId, currency);
      if (error) throw new Error(error);

      const ops = buildOps(findings, currency);
      const planHash = await hashPlan(ops);

      return json({
        success: true,
        planHash,
        operationCount: ops.length,
        totalValueCorrected: round2(findings.reconciliation.reduce((s, r) => s + r.gap, 0)),
        operations: ops,
        excluded: {
          needsHumanJudgement: findings.unexplained.length,
          duplicates: findings.duplicates.length,
          note: 'Duplicates and unexplained shortfalls are deliberately not in this plan. Both need a person who knows the business to decide.',
        },
        howToApply: 'Review the operations, then call again with action "apply", this planHash, confirm: true, and approvedBy set to the user id of whoever authorised it.',
      });
    }

    // -------------------------------------------------------------- APPLY
    if (action === 'apply') {
      if (body.confirm !== true) {
        return json({ success: false, error: 'Nothing was changed. Send confirm: true once a person has reviewed the plan.' }, 200);
      }

      const { findings, error } = await examine(sb, businessId, currency);
      if (error) throw new Error(error);

      const ops = buildOps(findings, currency);
      const planHash = await hashPlan(ops);

      // The plan must be the one that was approved. If a record changed in
      // between, the approval no longer covers what would be written.
      if (String(body.planHash ?? '') !== planHash) {
        return json({
          success: false,
          error: 'The data has changed since this plan was produced, so the approval no longer applies to it. Run "plan" again and review the new list.',
          expectedPlanHash: planHash,
        }, 200);
      }

      if (ops.length === 0) {
        return json({ success: true, applied: 0, message: 'Nothing to correct — every invoice reconciles.' });
      }

      const approvedBy = body.approvedBy ?? null;
      const applied: any[] = [];
      const failed: any[] = [];

      for (const op of ops) {
        // Re-read immediately before writing. Between the plan and this line,
        // the till may have taken a payment against the same invoice.
        const { data: current, error: readErr } = await sb
          .from(op.table).select(`id, ${op.field}`).eq('id', op.id).maybeSingle();

        if (readErr || !current) {
          failed.push({ id: op.id, label: op.label, reason: readErr?.message ?? 'The record no longer exists.' });
          continue;
        }
        if (round2(num((current as any)[op.field])) !== round2(num(op.from))) {
          failed.push({ id: op.id, label: op.label, reason: `Value changed since the plan was made (now ${(current as any)[op.field]}). Left untouched.` });
          continue;
        }

        const { error: writeErr } = await sb.from(op.table).update({ [op.field]: op.to }).eq('id', op.id);
        if (writeErr) {
          failed.push({ id: op.id, label: op.label, reason: writeErr.message });
          continue;
        }

        // The log is written after the change, never before — a log entry for
        // a change that failed is a lie in the audit trail.
        const { error: logErr } = await sb.from('aura_ledger_corrections').insert({
          business_id: businessId,
          source_table: op.table,
          source_id: String(op.id),
          field_name: op.field,
          value_before: String(op.from),
          value_after: String(op.to),
          rule: op.rule,
          reason: op.reason,
          approved_by: approvedBy,
          plan_hash: planHash,
        });
        if (logErr) console.error('[AURA REPAIR] correction applied but not logged:', logErr.message);

        applied.push({ id: op.id, label: op.label, logged: !logErr });
      }

      return json({
        success: true,
        applied: applied.length,
        failed: failed.length,
        planHash,
        details: { applied, failed },
        note: 'Corrected records will now show as altered when the ledger chain is verified, which is correct — they have been altered. The corrections table records who approved each change and why. Chain plus log is the audit trail; either alone is half of it.',
        durationMs: Date.now() - started,
      });
    }

    // --------------------------------------------------- BACKFILL PAYMENTS
    // Collections that exist only on the invoice never reached the payments
    // register, so the cash flow report shows outgoings and no income.
    if (action === 'backfill_payments') {
      const { rows: invoices, error } = await pullAll(sb, 'invoices',
        'id, invoice_number, total_amount, balance_due, currency, created_at, due_date',
        (q: any) => q.eq('business_id', businessId));
      if (error) throw new Error(error);

      const { rows: existing } = await pullAll(sb, 'payments', 'receipt_number', (q: any) => q.eq('business_id', businessId));
      const seen = new Set((existing ?? []).map((p: any) => String(p.receipt_number)));

      const candidates = invoices
        .filter((i: any) => round2(num(i.total_amount) - num(i.balance_due)) > 0)
        .map((i: any) => ({
          business_id: businessId,
          amount: round2(num(i.total_amount) - num(i.balance_due)),
          payment_date: day(i.created_at),
          method: 'reconstructed',
          receipt_number: `AUTO-${i.invoice_number ?? i.id}`,
          currency_code: i.currency ?? currency,
        }))
        .filter((p: any) => !seen.has(p.receipt_number));

      if (body.confirm !== true) {
        return json({
          success: true,
          dryRun: true,
          wouldCreate: candidates.length,
          totalValue: round2(candidates.reduce((s: number, c: any) => s + c.amount, 0)),
          sample: candidates.slice(0, 20),
          warning: 'Each record is marked method "reconstructed" and given an AUTO- receipt number, so these can always be told apart from payments captured at the time. They carry the invoice date, which is when the invoice was raised — not necessarily when the money arrived.',
          howToApply: 'Send confirm: true to create them.',
        });
      }

      const created: any[] = [];
      const failed: any[] = [];
      for (let i = 0; i < candidates.length; i += 100) {
        const batch = candidates.slice(i, i + 100);
        const { error: insErr } = await sb.from('payments').insert(batch);
        if (insErr) {
          // A NOT NULL column this function does not know about is the most
          // likely cause, and guessing at a value would be worse than stopping.
          failed.push({ from: i, count: batch.length, reason: insErr.message });
          break;
        }
        created.push(...batch);
      }

      return json({
        success: failed.length === 0,
        created: created.length,
        failed,
        totalValue: round2(created.reduce((s, c: any) => s + c.amount, 0)),
        note: failed.length > 0
          ? 'Insertion stopped. The payments table likely requires a column this function does not set — send me the error and I will add it rather than guess at a value.'
          : 'The payments register now reflects invoice collections. Cash flow will show income from the next report.',
      });
    }

    throw new Error(`Unknown action "${action}". Use diagnose, plan, apply or backfill_payments.`);

  } catch (error) {
    console.error('[AURA LEDGER REPAIR]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});