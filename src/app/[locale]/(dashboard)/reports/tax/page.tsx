import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import TaxReportClient, { TaxLineItem, TaxSummary } from '@/components/reports/TaxReport';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Global Compliance Tax Reports',
  description: 'IFRS & VAT compliant multi-jurisdictional tax reporting engine.',
};

export default async function TaxReportsPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const startDate = searchParams.from || startOfMonth(new Date()).toISOString();
  const endDate = searchParams.to || endOfMonth(new Date()).toISOString();

  // UNIVERSAL COMPLIANCE FETCH
  const { data: taxRecords, error } = await supabase
    .from('view_global_tax_report')
    .select('*')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) throw new Error(`Global Tax Hub Error: ${error.message}`);

  const aggregationMap = new Map<string, TaxLineItem>();
  const summaryMap = new Map<string, TaxSummary>();

  taxRecords?.forEach((item) => {
    // Unique key per Jurisdiction + Tax Name + Currency
    const key = `${item.jurisdiction}-${item.tax_name}-${item.tax_type}-${item.currency}`;

    if (!aggregationMap.has(key)) {
      aggregationMap.set(key, {
        id: key,
        jurisdiction_code: item.jurisdiction,
        tax_name: item.tax_name,
        type: item.tax_type as 'Output' | 'Input',
        currency: item.currency,
        rate_percentage: Number(item.applied_rate),
        taxable_base: 0,
        tax_amount: 0,
        gross_amount: 0,
        transaction_count: 0,
      });
    }

    const entry = aggregationMap.get(key)!;
    entry.tax_amount += Number(item.tax_amount);
    entry.taxable_base += Number(item.taxable_base);
    entry.gross_amount += Number(item.gross_total);
    entry.transaction_count += 1;

    // Multi-Currency and Multi-Jurisdiction Summary
    const summaryKey = `${item.currency}-${item.jurisdiction}`;
    if (!summaryMap.has(summaryKey)) {
      summaryMap.set(summaryKey, {
        currency: `${item.currency} (${item.jurisdiction})`,
        total_output_tax: 0,
        total_input_tax: 0,
        net_liability: 0
      });
    }
    const summary = summaryMap.get(summaryKey)!;
    if (item.tax_type === 'Output') summary.total_output_tax += Number(item.tax_amount);
    else summary.total_input_tax += Number(item.tax_amount);
    summary.net_liability = summary.total_output_tax - summary.total_input_tax;
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
      <TaxReportClient 
        data={Array.from(aggregationMap.values())} 
        summaries={Array.from(summaryMap.values())} 
        dateRange={{ from: new Date(startDate), to: new Date(endDate) }} 
      />
    </div>
  );
}