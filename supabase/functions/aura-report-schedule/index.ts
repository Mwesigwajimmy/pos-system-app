// supabase/functions/aura-report-schedule/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- AURA REPORT SCHEDULER ---
 * v1.0
 *
 * Two jobs in one function:
 *
 *  1. MANAGEMENT (called from chat or the UI)
 *     action: 'list' | 'create' | 'update' | 'delete' | 'run_now'
 *     Lets a director set up "email me the executive pack every Monday".
 *
 *  2. EXECUTION (called by pg_cron on a timer, or manually)
 *     action: 'run_due'
 *     Finds every schedule whose next_run_at has passed, generates the report
 *     by calling aura-generate-report, emails it, and advances next_run_at.
 *
 * DESIGN NOTES
 *
 *  - The report is always generated fresh at send time, never cached. A
 *    report emailed on Monday must reflect Monday's data.
 *  - The email contains a link, not an attachment. Signed URLs expire after
 *    the configured window, so recipients who open the mail late get a clear
 *    expiry error rather than stale financials presented as current.
 *  - Link validity for scheduled sends defaults to 7 days rather than 1 hour,
 *    because nobody reads a Monday report within the hour.
 *  - A failed send does NOT advance next_run_at past the failure silently —
 *    the error is recorded on the row so it is visible, and the schedule
 *    still moves forward so one bad run does not block every future run.
 *  - Email goes out through Resend by default. If you would rather route
 *    through your existing comms-webhook or sovereign-broadcaster functions,
 *    replace sendEmail() below — everything else stays as is.
 *
 * REQUIRES: sql/AURA_SCHEDULES.sql, and a RESEND_API_KEY row in
 * aura_system_settings (same pattern as your SambaNova and Jina keys).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHEDULED_LINK_TTL = 604800; // 7 days
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly'] as const;
type Frequency = typeof FREQUENCIES[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Next run time from a frequency and an hour of day, in UTC. */
function nextRunAt(freq: Frequency, hourUtc: number, dayOfWeek: number, dayOfMonth: number, from = new Date()): string {
  const d = new Date(from);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(0);
  d.setUTCHours(hourUtc);

  if (freq === 'daily') {
    if (d <= from) d.setUTCDate(d.getUTCDate() + 1);
  } else if (freq === 'weekly') {
    const delta = (dayOfWeek - d.getUTCDay() + 7) % 7;
    d.setUTCDate(d.getUTCDate() + delta);
    if (d <= from) d.setUTCDate(d.getUTCDate() + 7);
  } else if (freq === 'monthly') {
    d.setUTCDate(Math.min(dayOfMonth, 28));
    if (d <= from) d.setUTCMonth(d.getUTCMonth() + 1);
  } else {
    d.setUTCDate(Math.min(dayOfMonth, 28));
    const q = Math.floor(d.getUTCMonth() / 3) * 3;
    d.setUTCMonth(q);
    while (d <= from) d.setUTCMonth(d.getUTCMonth() + 3);
  }
  return d.toISOString();
}

/** The reporting window a scheduled run should cover. Weekly means last week,
 *  monthly means last month — not "everything ever", which is what an
 *  unfiltered report would give and would make the email useless. */
function periodFor(freq: Frequency, now = new Date()): { dateFrom: string; dateTo: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (freq === 'daily') {
    const d = new Date(Date.UTC(y, m, now.getUTCDate() - 1));
    return { dateFrom: iso(d), dateTo: iso(d) };
  }
  if (freq === 'weekly') {
    const end = new Date(Date.UTC(y, m, now.getUTCDate() - 1));
    const start = new Date(Date.UTC(y, m, now.getUTCDate() - 7));
    return { dateFrom: iso(start), dateTo: iso(end) };
  }
  if (freq === 'monthly') {
    return { dateFrom: iso(new Date(Date.UTC(y, m - 1, 1))), dateTo: iso(new Date(Date.UTC(y, m, 0))) };
  }
  const qs = Math.floor(m / 3) * 3 - 3;
  return { dateFrom: iso(new Date(Date.UTC(y, qs, 1))), dateTo: iso(new Date(Date.UTC(y, qs + 3, 0))) };
}

async function sendEmail(
  apiKey: string,
  fromAddress: string,
  to: string[],
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddress, to, subject, html }),
    });
    if (!res.ok) return { ok: false, error: `${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function emailBody(opts: {
  businessName: string; title: string; scope: string; rowCount: number;
  downloadUrl: string; summary: string[]; warnings: string[]; format: string;
}): string {
  const esc = (s: string) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
  const figures = opts.summary.slice(0, 10).map((s) => `<li style="margin:2px 0">${esc(s)}</li>`).join('');
  const warn = opts.warnings.length
    ? `<p style="color:#b45309;font-size:13px">${opts.warnings.length} section(s) could not be filled: ${esc(opts.warnings.slice(0, 3).join('; '))}</p>`
    : '';
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;color:#0f172a">
  <h2 style="margin:0 0 4px;font-size:18px">${esc(opts.businessName)}</h2>
  <p style="margin:0 0 16px;color:#64748b;font-size:14px">${esc(opts.title)} &mdash; ${esc(opts.scope)}</p>
  <a href="${opts.downloadUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">
    Download ${esc(opts.format.toUpperCase())} report
  </a>
  <p style="margin:12px 0 4px;color:#64748b;font-size:12px">${opts.rowCount.toLocaleString()} rows. This link expires in 7 days.</p>
  <h3 style="font-size:14px;margin:20px 0 6px">Key figures</h3>
  <ul style="font-size:13px;padding-left:18px;margin:0">${figures}</ul>
  ${warn}
  <p style="margin-top:24px;color:#94a3b8;font-size:11px">Generated automatically by Aura. Figures are computed directly from your records.</p>
</div>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const body = await req.json();
    const action = String(body.action ?? '').toLowerCase();

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // ---------------------------------------------------------------- LIST
    if (action === 'list') {
      if (!body.businessId) throw new Error('businessId is required.');
      const { data, error } = await sb.from('aura_report_schedules')
        .select('*').eq('business_id', body.businessId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return json({ success: true, schedules: data ?? [] });
    }

    // -------------------------------------------------------------- CREATE
    if (action === 'create') {
      const { businessId, userId, reportType, format = 'pdf', frequency = 'weekly',
              recipients = [], hourUtc = 6, dayOfWeek = 1, dayOfMonth = 1, label = null } = body;
      if (!businessId) throw new Error('businessId is required.');
      if (!reportType) throw new Error('reportType is required.');
      if (!FREQUENCIES.includes(frequency)) throw new Error(`frequency must be one of: ${FREQUENCIES.join(', ')}`);
      if (!Array.isArray(recipients) || recipients.length === 0) throw new Error('At least one recipient email is required.');

      const { data, error } = await sb.from('aura_report_schedules').insert({
        business_id: businessId,
        user_id: userId ?? null,
        label: label ?? `${reportType} (${frequency})`,
        report_type: reportType,
        format,
        frequency,
        recipients,
        hour_utc: hourUtc,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        is_active: true,
        next_run_at: nextRunAt(frequency, hourUtc, dayOfWeek, dayOfMonth),
      }).select().single();
      if (error) throw new Error(error.message);
      return json({ success: true, schedule: data });
    }

    // -------------------------------------------------------- UPDATE/DELETE
    if (action === 'update') {
      const { scheduleId, ...patch } = body;
      if (!scheduleId) throw new Error('scheduleId is required.');
      delete patch.action;
      const { data, error } = await sb.from('aura_report_schedules')
        .update(patch).eq('id', scheduleId).select().single();
      if (error) throw new Error(error.message);
      return json({ success: true, schedule: data });
    }

    if (action === 'delete') {
      if (!body.scheduleId) throw new Error('scheduleId is required.');
      const { error } = await sb.from('aura_report_schedules').delete().eq('id', body.scheduleId);
      if (error) throw new Error(error.message);
      return json({ success: true, deleted: body.scheduleId });
    }

    // ------------------------------------------------------ RUN_DUE / RUN_NOW
    if (action === 'run_due' || action === 'run_now') {
      let query = sb.from('aura_report_schedules').select('*').eq('is_active', true);
      query = action === 'run_now'
        ? query.eq('id', body.scheduleId)
        : query.lte('next_run_at', new Date().toISOString());

      const { data: due, error: dueErr } = await query;
      if (dueErr) throw new Error(dueErr.message);
      if (!due || due.length === 0) return json({ success: true, ran: 0, message: 'Nothing due.' });

      const { data: keys } = await sb.from('aura_system_settings')
        .select('key_name, key_value').in('key_name', ['RESEND_API_KEY', 'AURA_FROM_EMAIL']);
      const resendKey = keys?.find((k: any) => k.key_name === 'RESEND_API_KEY')?.key_value;
      const fromAddress = keys?.find((k: any) => k.key_name === 'AURA_FROM_EMAIL')?.key_value
        ?? 'Aura <reports@resend.dev>';

      const results: any[] = [];

      for (const s of due) {
        const period = periodFor(s.frequency as Frequency);
        let outcome: any = { id: s.id, label: s.label };

        try {
          const genRes = await fetch(`${SUPABASE_URL}/functions/v1/aura-generate-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
            body: JSON.stringify({
              businessId: s.business_id,
              userId: s.user_id ?? '00000000-0000-0000-0000-000000000000',
              reportType: s.report_type,
              format: s.format,
              dateFrom: period.dateFrom,
              dateTo: period.dateTo,
              expiresIn: SCHEDULED_LINK_TTL,
            }),
          });
          const gen = await genRes.json();
          if (!gen.success) throw new Error(gen.error ?? 'Report generation failed.');

          if (!resendKey) throw new Error('No RESEND_API_KEY in aura_system_settings — report generated but not emailed.');

          const mail = await sendEmail(
            resendKey, fromAddress, s.recipients,
            `${gen.businessName}: ${gen.title} (${period.dateFrom} to ${period.dateTo})`,
            emailBody({
              businessName: gen.businessName, title: gen.title, scope: gen.scope,
              rowCount: gen.rowCount, downloadUrl: gen.downloadUrl, format: gen.format,
              summary: (gen.sections ?? []).flatMap((x: any) => x.summary ?? []),
              warnings: gen.warnings ?? [],
            }),
          );
          if (!mail.ok) throw new Error(`Email failed: ${mail.error}`);

          outcome = { ...outcome, status: 'sent', recipients: s.recipients.length, rows: gen.rowCount, file: gen.fileName };
          await sb.from('aura_report_schedules').update({
            last_run_at: new Date().toISOString(),
            last_status: 'sent',
            last_error: null,
            run_count: (s.run_count ?? 0) + 1,
            next_run_at: nextRunAt(s.frequency, s.hour_utc, s.day_of_week, s.day_of_month),
          }).eq('id', s.id);

        } catch (e) {
          const msg = (e as Error).message;
          outcome = { ...outcome, status: 'failed', error: msg };
          // Record the failure but still advance the schedule, so one bad run
          // does not block every future run. The error stays visible on the row.
          await sb.from('aura_report_schedules').update({
            last_run_at: new Date().toISOString(),
            last_status: 'failed',
            last_error: msg.slice(0, 500),
            next_run_at: nextRunAt(s.frequency, s.hour_utc, s.day_of_week, s.day_of_month),
          }).eq('id', s.id);
        }
        results.push(outcome);
      }

      return json({ success: true, ran: results.length, results });
    }

    throw new Error(`Unknown action "${action}". Use list, create, update, delete, run_now or run_due.`);

  } catch (error) {
    console.error('[AURA SCHEDULE]', (error as Error).message);
    return json({ success: false, error: (error as Error).message }, 400);
  }
});