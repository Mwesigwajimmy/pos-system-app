import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
// FIX 2: Imported the type from the component instead of defining it locally
import TrialBalanceReportClient, { TrialBalanceRow } from '@/components/reports/TrialBalanceReport';
import { createClient } from '@/lib/supabase/server';
import { endOfMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trial Balance | Enterprise Finance',
  description: 'Full General Ledger account balances validating the accounting equation.',
};

export default async function TrialBalancePage({ searchParams }: { searchParams: { date?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const dateParam = searchParams.date ? new Date(searchParams.date) : new Date();
  const reportDate = format(endOfMonth(dateParam), 'yyyy-MM-dd');

  try {
    const { data, error } = await supabase.rpc('get_trial_balance_full', {
      p_end_date: reportDate
    });

    if (error) {
        console.error("RPC Error:", error);
        throw new Error(`Database Error: ${error.message}`);
    }

    const rows: TrialBalanceRow[] = (data || []).map((item: any) => ({
      account_name: item.account_name,
      account_type: item.account_type,
      currency_code: item.currency_code || 'UGX',
      total_debit: Number(item.total_debit),
      total_credit: Number(item.total_credit),
      net_balance: Number(item.net_balance),
    }));

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen">
        <TrialBalanceReportClient initialData={rows} reportDate={reportDate} />
      </div>
    );

  } catch (err: any) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-8 text-center border-2 border-red-200 bg-red-50 rounded-lg m-8">
        <h2 className="text-2xl text-red-700 font-bold mb-2">Critical System Error</h2>
        <p className="text-red-600 max-w-lg">
            Unable to compile General Ledger. This usually indicates a connection failure or a missing ledger configuration.
        </p>
        <div className="mt-4 p-4 bg-white border border-red-200 rounded text-xs font-mono text-left w-full max-w-lg overflow-auto">
            {err.message || String(err)}
        </div>
      </div>
    );
  }
}