import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AuraVoiceSettings from '@/components/crm/settings/AuraVoiceSettings';

/**
 * --- VOICE SETTINGS ---
 *
 * WHAT CHANGED
 *
 *   `.single()` became `.maybeSingle()`. `.single()` raises an error when it
 *   finds no row — which is the ordinary case for a user with no employee
 *   record. The error was being discarded by the destructure, so the page
 *   happened to work while logging a database error on every load by someone
 *   without a linked profile.
 *
 *   The error state tells the reader what to do. "Identity Anchor Missing"
 *   describes nothing and offers nothing; a manager who sees it has no idea
 *   whether they have done something wrong or the system has. It now says what
 *   is missing, why it matters here, and who can fix it.
 *
 *   The language is plain throughout. This screen is used by office managers,
 *   not read by an audience.
 *
 *   The description is honest about scope. It previously promised control over
 *   "company phone lines" and "receptionist logic". There is no telephony
 *   provider connected, so that was describing something that does not exist —
 *   and a settings page that lists capabilities the product lacks is how trust
 *   in the rest of it goes. It now describes what actually works: the voice
 *   Aura speaks in, and how enquiries reach a person.
 */

export const metadata = {
  title: 'Voice settings',
};

async function getEmployeeRecord(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // maybeSingle, not single: no employee record is a normal state for a new
  // user, not an error worth throwing.
  const { data: employee, error } = await supabase
    .from('employees')
    .select('id, business_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) console.error('[voice settings] employee lookup failed:', error.message);

  return { user, employee };
}

export default async function AuraVoiceSettingsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { user, employee } = await getEmployeeRecord(supabase);

  if (!employee?.business_id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" /><path d="M12 17h.01" />
            </svg>
          </div>

          <h2 className="mt-5 text-[17px] font-semibold text-slate-900">
            Your account is not linked to a business
          </h2>

          {/* Says what is wrong, why it matters here, and who fixes it. The
              previous version said none of those things. */}
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-slate-600">
            Voice settings apply to one business, and we could not find an employee
            record connecting {user?.email ?? 'your account'} to one. An administrator
            can link it from the staff directory.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to dashboard
            </Link>
            <Link
              href="/crm/settings"
              className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
        <header className="mb-8">
          <h1 className="text-[24px] font-semibold tracking-tight text-slate-900">
            Voice settings
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-slate-600">
            Choose how Aura sounds when she speaks, and how enquiries reach a person
            when she cannot answer them.
          </p>
        </header>

        <AuraVoiceSettings businessId={employee.business_id} />
      </div>
    </div>
  );
}