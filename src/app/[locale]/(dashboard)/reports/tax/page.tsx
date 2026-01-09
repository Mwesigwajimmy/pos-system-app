import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import TaxReportClient, { TaxLineItem, TaxSummary } from '@/components/reports/TaxReport';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, formatISO, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Global Compliance Tax Reports',
  description: 'IFRS & VAT compliant multi-jurisdictional tax reporting engine.',
};

export default async function TaxReportsPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // 1. SAFE DATE LOGIC (Serialization Proof)
  const today = new Date();
  const startDate = searchParams.from || formatISO(startOfMonth(today));
  const endDate = searchParams.to || formatISO(endOfMonth(today));

  // 2. UNIVERSAL FETCH
  const { data: taxRecords, error } = await supabase
    .from('view_global_tax_report')
    .select('*')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) {
    console.error("Database Connection Failure:", error);
    throw new Error(`Tax Hub Connection Error: ${error.message}`);
  }

  const aggregationMap = new Map<string, TaxLineItem>();
  const summaryMap = new Map<string, TaxSummary>();

  // 3. ROBUST AGGREGATION
  taxRecords?.forEach((item) => {
    // Enterprise Safety: Ensure keys are strings, never null/undefined
    const jurisdiction = item.jurisdiction || 'Global';
    const taxName = item.tax_name || 'Standard';
    const taxType = item.tax_type || 'Output';
    const currency = item.currency || 'UGX';

    const key = `${jurisdiction}-${taxName}-${taxType}-${currency}`;

    if (!aggregationMap.has(key)) {
      aggregationMap.set(key, {
        id: key,
        jurisdiction_code: jurisdiction,
        tax_name: taxName,
        type: taxType as 'Output' | 'Input',
        currency: currency,
        rate_percentage: Number(item.applied_rate || 0),
        taxable_base: 0,
        tax_amount: 0,
        gross_amount: 0,
        transaction_count: 0,
      });
    }

    const entry = aggregationMap.get(key)!;
    entry.tax_amount += Number(item.tax_amount || 0);
    entry.taxable_base += Number(item.taxable_base || 0);
    entry.gross_amount += Number(item.gross_total || 0);
    entry.transaction_count += 1;

    // 4. MULTI-CURRENCY SUMMARIES
    const summaryKey = `${currency}-${jurisdiction}`;
    if (!summaryMap.has(summaryKey)) {
      summaryMap.set(summaryKey, {
        currency: `${currency} (${jurisdiction})`,
        total_output_tax: 0,
        total_input_tax: 0,
        net_liability: 0
      });
    }
    const summary = summaryMap.get(summaryKey)!;
    if (taxType === 'Output') {
      summary.total_output_tax += Number(item.tax_amount || 0);
    } else {
      summary.total_input_tax += Number(item.tax_amount || 0);
    }
    summary.net_liability = summary.total_output_tax - summary.total_input_tax;
  });

  // 5. SERIALIZE DATES AS STRINGS (This prevents the client-side crash)
  const serializableRange = {
    from: startDate,
    to: endDate
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
      <TaxReportClient 
        data={Array.from(aggregationMap.values())} 
        summaries={Array.from(summaryMap.values())} 
        // @ts-ignore - Range is converted to Date inside the Client
        serializedDateRange={serializableRange} 
      />
    </div>
  );
}