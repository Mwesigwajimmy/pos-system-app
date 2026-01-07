import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format, subMonths, endOfMonth, startOfMonth, parseISO } from 'date-fns';
import { FinanceHub } from '@/components/reports/FinanceHub';

export default async function FinancialReportsPage({
    searchParams
}: {
    searchParams: { from?: string, to?: string, locationId?: string, projectId?: string }
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. Setup Date Ranges
    const from = searchParams.from || format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    const to = searchParams.to || format(endOfMonth(new Date()), 'yyyy-MM-dd');
    
    const locationId = searchParams.locationId && searchParams.locationId !== 'all' ? searchParams.locationId : null;
    const projectId = searchParams.projectId && searchParams.projectId !== 'all' ? searchParams.projectId : null;

    /**
     * 2. ENTERPRISE DATA FETCHING:
     * We fetch everything in parallel to satisfy the FinanceHub requirements 
     * and ensure real-time connectivity to POS and Inventory.
     */
    const [analyticsRes, bsRes, locationsRes, projectsRes] = await Promise.all([
        supabase.rpc('get_enterprise_financial_hub_v2', {
            p_from: from,
            p_to: to,
            p_location_id: locationId,
            p_project_id: projectId
        }),
        supabase.rpc('get_enterprise_balance_sheet', {
            p_as_of_date: to,
            p_location_id: locationId,
            p_project_id: projectId
        }),
        supabase.from('locations').select('id, name').order('name'),
        supabase.from('projects').select('id, name').order('name')
    ]);

    // Error safety for production builds
    if (analyticsRes.error || bsRes.error) {
        console.error("Ledger Fetch Error:", analyticsRes.error || bsRes.error);
        return <div className="p-10 text-red-500 bg-red-50 rounded-xl border border-red-200 font-bold">
            Critical Error: Financial Ledger Synchronization Failed.
        </div>;
    }

    const { current_pnl, prev_pnl, trends } = analyticsRes.data;

    // Formatting for display
    const pnlPeriod = `${format(parseISO(from), 'MMM dd, yyyy')} - ${format(parseISO(to), 'MMM dd, yyyy')}`;
    const bsDate = format(parseISO(to), 'MMMM dd, yyyy');

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <FinanceHub 
                pnl={current_pnl.map((i: any) => ({ category: i.cat, account_name: i.acc, amount: i.val }))}
                prevPnl={prev_pnl.map((i: any) => ({ category: i.cat, amount: i.val }))}
                bs={bsRes.data || []}
                trends={trends || []}
                pnlPeriod={pnlPeriod}
                bsDate={bsDate}
                locations={locationsRes.data || []}
                projects={projectsRes.data || []}
            />
        </div>
    );
}