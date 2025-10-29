import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format, subMonths } from 'date-fns';
import { ComplianceHub } from '@/components/compliance/ComplianceHub';
import type { TaxSummary, TaxableTransaction, ComplianceTask } from '@/components/compliance/ComplianceHub';

async function getComplianceHubData(supabase: any, from: string, to: string) {
    const getTaxableTransactions = supabase
        .from('invoices')
        .select('id, date, description, invoice_id, total as taxable_amount, tax as tax_collected')
        .gte('date', from)
        .lte('date', to)
        .gt('tax', 0);

    const [taxSummaryResult, taxTransactionsResult, tasksResult] = await Promise.all([
        supabase.rpc('generate_sales_tax_report', { start_date: from, end_date: to }).single(),
        getTaxableTransactions,
        supabase.from('compliance_tasks').select('*').order('due_date', { ascending: true })
    ]);

    if (taxSummaryResult.error) {
        console.error("Tax Summary RPC Error:", taxSummaryResult.error.message);
    }
    if (taxTransactionsResult.error) {
        console.error("Tax Transactions Fetch Error:", taxTransactionsResult.error.message);
    }
    if (tasksResult.error) {
        console.error("Compliance Tasks Fetch Error:", tasksResult.error.message);
    }

    const taxSummary: TaxSummary = taxSummaryResult.data || { total_revenue: 0, total_taxable_revenue: 0, total_tax_collected: 0 };
    const taxTransactions: TaxableTransaction[] = taxTransactionsResult.data || [];
    const tasks: ComplianceTask[] = tasksResult.data || [];

    return {
        taxSummary,
        taxTransactions,
        tasks
    };
}

export default async function CompliancePage({
    searchParams
}: {
    searchParams: { from?: string, to?: string }
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const toDate = searchParams.to ? new Date(searchParams.to) : new Date();
    const fromDate = searchParams.from ? new Date(searchParams.from) : subMonths(toDate, 1);

    const to = format(toDate, 'yyyy-MM-dd');
    const from = format(fromDate, 'yyyy-MM-dd');
    
    const { taxSummary, taxTransactions, tasks } = await getComplianceHubData(supabase, from, to);
    
    const reportPeriod = `${format(fromDate, 'PPP')} - ${format(toDate, 'PPP')}`;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <ComplianceHub
                taxSummary={taxSummary}
                taxTransactions={taxTransactions}
                tasks={tasks}
                reportPeriod={reportPeriod}
            />
        </div>
    );
}