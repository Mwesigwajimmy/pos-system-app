import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
// FIX 2: Imported the type from the component instead of defining it locally
import CashFlowReportClient, { CashFlowData } from '@/components/reports/CashFlowReport';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Statement of Cash Flows',
  description: 'Analysis of cash inflows and outflows via Indirect Method.',
};

export default async function CashFlowPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const today = new Date();
  const from = searchParams.from || startOfMonth(today).toISOString();
  const to = searchParams.to || endOfMonth(today).toISOString();

  try {
    const { data, error } = await supabase.rpc('get_cash_flow_statement', {
      p_start_date: from,
      p_end_date: to
    });

    if (error) throw new Error(error.message);

    const op = data.operating;
    const inv = data.investing;
    const fin = data.financing;

    const netCashFromOperating = Number(op.net_income) + Number(op.change_ar) + Number(op.change_ap);
    const netCashFromInvesting = Number(inv.net_investing);
    const netCashFromFinancing = Number(fin.net_financing);
    const netChangeInCash = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

    const rows: CashFlowData[] = [
      // Operating
      { section: 'Operating', line_item: 'Net Income', amount: Number(op.net_income), currency: 'UGX' },
      { section: 'Operating', line_item: 'Adjustments for A/R', amount: Number(op.change_ar), currency: 'UGX' },
      { section: 'Operating', line_item: 'Adjustments for A/P', amount: Number(op.change_ap), currency: 'UGX' },
      { section: 'Operating', line_item: 'Net Cash provided by Operating Activities', amount: netCashFromOperating, currency: 'UGX', is_total: true },
      
      // Investing
      { section: 'Investing', line_item: 'Purchase/Sale of Assets', amount: netCashFromInvesting, currency: 'UGX' },
      { section: 'Investing', line_item: 'Net Cash used in Investing Activities', amount: netCashFromInvesting, currency: 'UGX', is_total: true },

      // Financing
      { section: 'Financing', line_item: 'Equity & Debt Movements', amount: netCashFromFinancing, currency: 'UGX' },
      { section: 'Financing', line_item: 'Net Cash used in Financing Activities', amount: netCashFromFinancing, currency: 'UGX', is_total: true },
    ];

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <CashFlowReportClient 
            data={rows} 
            netChange={netChangeInCash}
            period={`${format(new Date(from), 'MMM dd')} - ${format(new Date(to), 'MMM dd, yyyy')}`}
        />
      </div>
    );

  } catch (error: any) {
    return (
        <div className="p-8 border border-red-200 bg-red-50 rounded text-red-700">
            <h3 className="font-bold">Error Generating Cash Flow</h3>
            <p className="mt-2 text-sm">{error.message}</p>
        </div>
    );
  }
}