import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UnbilledClients, UnbilledClient } from '@/components/professional-services/billing/UnbilledClients';
import { TimeEntryList, TimeEntry } from '@/components/professional-services/billing/TimeEntryList';
import { AlertCircle } from 'lucide-react';

// Define return type for data fetching
interface BillingData {
  unbilledClients: UnbilledClient[];
  timeEntries: TimeEntry[];
}

async function getBillingData(supabase: any, tenantId: string): Promise<BillingData> {
  // 1. Fetch Unbilled Work (Aggregated via RPC for performance)
  // Ensure your RPC function 'get_unbilled_work_by_client' accepts 'p_tenant_id'
  const { data: unbilled, error: unbilledError } = await supabase
    .rpc('get_unbilled_work_by_client', { p_tenant_id: tenantId });

  // 2. Fetch Recent Time Entries (Raw log)
  // We strictly filter by tenant_id here for RLS compliance
  const { data: entries, error: entriesError } = await supabase
    .from('time_entries')
    .select(`
      *,
      customers ( name ) 
    `) 
    // Note: Adjust 'customers' to 'clients' if your DB schema uses 'clients' table
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (unbilledError) {
    console.error("Error fetching unbilled data:", unbilledError);
  }
  if (entriesError) {
    console.error("Error fetching time entries:", entriesError);
  }

  return {
    unbilledClients: (unbilled as UnbilledClient[]) || [],
    timeEntries: (entries as TimeEntry[]) || []
  };
}

export default async function BillingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Authenticate User
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // 2. Extract Tenant Context
  // In enterprise SaaS, this usually lives in user_metadata
  const tenantId = user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <h3 className="text-lg font-semibold">Configuration Error</h3>
        <p>No Tenant ID found for your user account. Please contact support.</p>
      </div>
    );
  }

  // 3. Fetch Data
  const { unbilledClients, timeEntries } = await getBillingData(supabase, tenantId);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Time & Billing</h2>
          <p className="text-muted-foreground">
            Review billable hours, manage WIP, and generate invoices.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Unbilled Clients (Actionable) */}
        <div className="lg:col-span-1">
          {/* FIX: Passed required tenantId prop here */}
          <UnbilledClients clients={unbilledClients} tenantId={tenantId} />
        </div>

        {/* Right Column: Time Logs (Informational) */}
        <div className="lg:col-span-2">
          <TimeEntryList entries={timeEntries} />
        </div>
      </div>
    </div>
  );
}