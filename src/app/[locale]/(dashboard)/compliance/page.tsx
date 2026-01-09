import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format, subMonths } from 'date-fns';
import { redirect } from 'next/navigation';
import { ComplianceHub } from '@/components/compliance/ComplianceHub';
import type { TaxSummary, TaxableTransaction, ComplianceTask } from '@/components/compliance/ComplianceHub';

async function getComplianceHubData(supabase: any, from: string, to: string, businessId: string) {
    // 1. Fetch Invoices tagged to this Business ID
    const getTaxableTransactions = supabase
        .from('invoices')
        .select('id, date, description, invoice_id, total as taxable_amount, tax as tax_collected')
        .eq('business_id', businessId) 
        .gte('date', from)
        .lte('date', to)
        .gt('tax', 0);

    // 2. Parallel Fetch using the Smart RPC and Task Ledger
    const [taxSummaryResult, taxTransactionsResult, tasksResult] = await Promise.all([
        supabase.rpc('generate_sales_tax_report', { 
            start_date: from, 
            end_date: to,
            p_business_id: businessId 
        }).single(),
        getTaxableTransactions,
        supabase
            .from('compliance_tasks')
            .select('*')
            .eq('business_id', businessId)
            .order('due_date', { ascending: true })
    ]);

    if (taxSummaryResult.error) console.error("Tax Summary RPC Error:", taxSummaryResult.error.message);
    if (taxTransactionsResult.error) console.error("Tax Transactions Fetch Error:", taxTransactionsResult.error.message);
    if (tasksResult.error) console.error("Compliance Tasks Fetch Error:", tasksResult.error.message);

    const taxSummary: TaxSummary = taxSummaryResult.data || { total_revenue: 0, total_taxable_revenue: 0, total_tax_collected: 0 };
    const taxTransactions: TaxableTransaction[] = taxTransactionsResult.data || [];
    const tasks: ComplianceTask[] = tasksResult.data || [];

    return { taxSummary, taxTransactions, tasks };
}

export default async function CompliancePage({
    searchParams
}: {
    searchParams: { from?: string, to?: string }
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // 1. AUTH CHECK
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. SMART BUSINESS RESOLUTION (Using your 'profiles' table)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.business_id) {
        console.error("Critical: Could not resolve Business ID for user", user.id);
        // Fallback or handle appropriately for your enterprise flow
        return <div className="p-8 text-red-500">Error: Your account is not linked to a business.</div>;
    }

    const businessId = profile.business_id;

    // 3. DATE LOGIC
    const toDate = searchParams.to ? new Date(searchParams.to) : new Date();
    const fromDate = searchParams.from ? new Date(searchParams.from) : subMonths(toDate, 1);

    const to = format(toDate, 'yyyy-MM-dd');
    const from = format(fromDate, 'yyyy-MM-dd');
    
    // 4. FETCH HUB DATA
    const { taxSummary, taxTransactions, tasks } = await getComplianceHubData(supabase, from, to, businessId);
    
    const reportPeriod = `${format(fromDate, 'PPP')} - ${format(toDate, 'PPP')}`;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <ComplianceHub
                taxSummary={taxSummary}
                taxTransactions={taxTransactions}
                tasks={tasks}
                reportPeriod={reportPeriod}
                businessId={businessId} 
            />
        </div>
    );
}