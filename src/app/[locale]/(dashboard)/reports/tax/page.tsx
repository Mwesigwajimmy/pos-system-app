import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import TaxReportClient, { TaxLineItem, TaxSummary } from '@/components/reports/TaxReport';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tax Liability Reports',
  description: 'Detailed breakdown of Input and Output taxes by jurisdiction.',
};

// FIX: Updated searchParams to accept 'from' and 'to'
export default async function TaxReportsPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Enterprise Date Range Logic
  const today = new Date();
  const defaultFrom = startOfMonth(today).toISOString();
  const defaultTo = endOfMonth(today).toISOString();

  const startDate = searchParams.from || defaultFrom;
  const endDate = searchParams.to || defaultTo;

  // 2. Fetch Sales (Output Tax) - Filtered by Date Range
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`total_amount, tax_amount, currency_code, tax_rates(name, country_code, rate)`)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (salesError) console.error("Sales Fetch Error:", salesError);

  // 3. Fetch Expenses (Input Tax) - Filtered by Date Range
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select(`amount, tax_amount, currency_code, tax_rates(name, country_code, rate)`)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (expensesError) console.error("Expenses Fetch Error:", expensesError);

  // 4. Data Aggregation Logic (Unchanged but robust)
  const aggregationMap = new Map<string, TaxLineItem>();

  const processTransaction = (
    items: any[] | null, 
    type: 'Output' | 'Input', 
    amountKey: string 
  ) => {
    items?.forEach((item) => {
      // Enterprise check: Only process if tax exists
      if (!item.tax_amount || Number(item.tax_amount) === 0) return;

      const currency = item.currency_code || 'UGX'; // Multi-currency fallback
      const taxName = item.tax_rates?.name || 'Standard Tax';
      const jurisdiction = item.tax_rates?.country_code || 'Global';
      const rate = item.tax_rates?.rate || 0;

      const key = `${jurisdiction}-${taxName}-${rate}-${currency}-${type}`;

      if (!aggregationMap.has(key)) {
        aggregationMap.set(key, {
          id: key,
          jurisdiction_code: jurisdiction,
          tax_name: taxName,
          type,
          currency,
          rate_percentage: rate,
          taxable_base: 0,
          tax_amount: 0,
          gross_amount: 0,
          transaction_count: 0,
        });
      }

      const entry = aggregationMap.get(key)!;
      const taxVal = Number(item.tax_amount);
      const totalVal = Number(item[amountKey]);
      const baseVal = totalVal - taxVal;

      entry.tax_amount += taxVal;
      entry.taxable_base += baseVal;
      entry.gross_amount += totalVal;
      entry.transaction_count += 1;
    });
  };

  processTransaction(sales, 'Output', 'total_amount');
  processTransaction(expenses, 'Input', 'amount');

  const taxData = Array.from(aggregationMap.values());

  // 5. Summaries per Currency
  const summaryMap = new Map<string, TaxSummary>();

  taxData.forEach(row => {
    if (!summaryMap.has(row.currency)) {
      summaryMap.set(row.currency, {
        currency: row.currency,
        total_output_tax: 0,
        total_input_tax: 0,
        net_liability: 0
      });
    }
    const summary = summaryMap.get(row.currency)!;

    if (row.type === 'Output') {
      summary.total_output_tax += row.tax_amount;
    } else {
      summary.total_input_tax += row.tax_amount;
    }
    summary.net_liability = summary.total_output_tax - summary.total_input_tax;
  });

  const summaries = Array.from(summaryMap.values());

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
      <TaxReportClient 
        data={taxData} 
        summaries={summaries} 
        dateRange={{ from: new Date(startDate), to: new Date(endDate) }} 
      />
    </div>
  );
}