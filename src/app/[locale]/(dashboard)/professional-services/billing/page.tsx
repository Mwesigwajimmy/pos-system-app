import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { UnbilledClients, UnbilledClient } from '@/components/professional-services/billing/UnbilledClients';
import { TimeEntryList, TimeEntry } from '@/components/professional-services/billing/TimeEntryList';

async function getBillingData(supabase: any) {
    // This RPC function now exists permanently in your database, so we can call it directly.
    const { data: unbilled, error: unbilledError } = await supabase.rpc('get_unbilled_work_by_client');
    
    const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select(`*, customers ( name )`)
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
    
    // The data fetching now works perfectly without the temporary function.
    const { unbilledClients, timeEntries } = await getBillingData(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Time & Billing</h2>
                <p className="text-muted-foreground">Manage billable hours and generate client invoices.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <UnbilledClients clients={unbilledClients} />
                </div>
                <div className="lg:col-span-2">
                    <TimeEntryList entries={timeEntries} />
                </div>
            </div>
        </div>
    );
}