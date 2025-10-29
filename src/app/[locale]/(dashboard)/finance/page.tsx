import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format, subMonths, endOfMonth } from 'date-fns';
import { FinanceHub } from '@/components/reports/FinanceHub';
import type { ProfitAndLossRecord, BalanceSheetRecord } from '@/components/reports/FinanceHub';

async function getReportData(supabase: any, from: string, to: string): Promise<{ pnl: ProfitAndLossRecord[], bs: BalanceSheetRecord[] }> {
    const [pnlResult, bsResult] = await Promise.all([
        supabase.rpc('generate_profit_and_loss', { start_date: from, end_date: to }),
        supabase.rpc('generate_balance_sheet', { as_of_date: to })
    ]);

    if (pnlResult.error) {
        console.error("Profit & Loss RPC Error:", pnlResult.error.message);
    }
    if (bsResult.error) {
        console.error("Balance Sheet RPC Error:", bsResult.error.message);
    }

    const pnl: ProfitAndLossRecord[] = pnlResult.data || [];
    const bs: BalanceSheetRecord[] = bsResult.data || [];
    
    return {
        pnl,
        bs
    };
}

export default async function FinancialReportsPage({
    searchParams
}: {
    searchParams: { from?: string, to?: string }
}) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const toDate = searchParams.to ? new Date(searchParams.to) : endOfMonth(new Date());
    const fromDate = searchParams.from ? new Date(searchParams.from) : subMonths(toDate, 1);

    const to = format(toDate, 'yyyy-MM-dd');
    const from = format(fromDate, 'yyyy-MM-dd');

    const { pnl, bs } = await getReportData(supabase, from, to);

    const pnlPeriod = `${format(fromDate, 'PPP')} - ${format(toDate, 'PPP')}`;
    const bsDate = format(toDate, 'PPP');

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <FinanceHub 
                pnl={pnl}
                bs={bs}
                pnlPeriod={pnlPeriod}
                bsDate={bsDate}
            />
        </div>
    );
}