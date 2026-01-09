import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import TaxReportClient, { TaxLineItem, TaxSummary } from '@/components/reports/TaxReport';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, formatISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Enterprise Global Tax Reports',
  description: 'IFRS & VAT compliant multi-jurisdictional reporting hub.',
};

export default async function TaxReportsPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const today = new Date();
  const startDate = searchParams.from || formatISO(startOfMonth(today));
  const endDate = searchParams.to || formatISO(endOfMonth(today));

  // 1. ENTERPRISE PARALLEL FETCH
  const [taxRes, locRes] = await Promise.all([
    supabase.from('view_global_tax_report').select('*').gte('transaction_date', startDate).lte('transaction_date', endDate),
    supabase.from('locations').select('id, country, name')
  ]);

  if (taxRes.error) throw new Error(`Tax Hub Failure: ${taxRes.error.message}`);

  // 2. CREATE JURISDICTION LOOKUP MAP
  const locationMap = new Map(locRes.data?.map(l => [l.id, l.country || l.name]) || []);

  const aggregationMap = new Map<string, TaxLineItem>();
  const summaryMap = new Map<string, TaxSummary>();

  taxRes.data?.forEach((item) => {
    // RESOLVE JURISDICTION: Convert UUID to real Name
    const jurisdictionName = locationMap.get(item.location_id) || 'Global';
    const taxName = String(item.tax_category || 'Standard');
    const taxType = String(item.tax_type || 'Output');
    const currency = String(item.currency || 'UGX');

    const key = `${jurisdictionName}-${taxName}-${taxType}-${currency}`;

    if (!aggregationMap.has(key)) {
      aggregationMap.set(key, {
        id: key,
        jurisdiction_code: jurisdictionName, 
        tax_name: taxName,
        type: taxType as 'Output' | 'Input',
        currency: currency,
        rate_percentage: 0, 
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

    // 3. MULTI-CURRENCY SUMMARIES
    // FIX: Keep 'currency' clean for the formatter, use 'displayLabel' for the UI text
    const summaryKey = `${currency}-${jurisdictionName}`;
    if (!summaryMap.has(summaryKey)) {
      summaryMap.set(summaryKey, {
        currency: currency, // Clean code (e.g., "UGX")
        displayLabel: `${currency} (${jurisdictionName})`, // UI string (e.g., "UGX (Uganda)")
        total_output_tax: 0,
        total_input_tax: 0,
        net_liability: 0
      });
    }
    const summary = summaryMap.get(summaryKey)!;
    if (taxType === 'Output') summary.total_output_tax += Number(item.tax_amount || 0);
    else summary.total_input_tax += Number(item.tax_amount || 0);
    summary.net_liability = summary.total_output_tax - summary.total_input_tax;
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
      <TaxReportClient 
        data={Array.from(aggregationMap.values())} 
        summaries={Array.from(summaryMap.values())} 
        // SERIALIZATION SHIELD: Prevents Client-side exception crash
        serializedDateRange={{ from: startDate, to: endDate }} 
      />
    </div>
  );
}