import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
// FIX 2: Imported the types from the component instead of defining them locally
import TaxReportClient, { TaxLineItem, TaxSummary } from '@/components/reports/TaxReport';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tax Liability Reports',
  description: 'Detailed breakdown of Input and Output taxes by jurisdiction.',
};

export default async function TaxReportsPage({ searchParams }: { searchParams: { date?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  // Handle Date Params (YYYY-MM)
  const dateStr = searchParams.date || new Date().toISOString();
  const reportDate = new Date(dateStr);
  const startDate = startOfMonth(reportDate).toISOString();
  const endDate = endOfMonth(reportDate).toISOString();

  // 1. Fetch Sales (Output Tax)
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`total_amount, tax_amount, currency_code, tax_rates(name, country_code, rate)`)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (salesError) {
    console.error("Sales Fetch Error:", salesError);
  }

  // 2. Fetch Expenses (Input Tax)
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select(`amount, tax_amount, currency_code, tax_rates(name, country_code, rate)`)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (expensesError) {
    console.error("Expenses Fetch Error:", expensesError);
  }

  // 3. Data Aggregation Logic
  const aggregationMap = new Map<string, TaxLineItem>();

  const processTransaction = (
    items: any[] | null, 
    type: 'Output' | 'Input', 
    amountKey: string // 'total_amount' for sales, 'amount' for expenses
  ) => {
    items?.forEach((item) => {
      if (!item.tax_amount || Number(item.tax_amount) === 0) return;

      const currency = item.currency_code || 'UGX';
      const taxName = item.tax_rates?.name || 'Standard Tax';
      const jurisdiction = item.tax_rates?.country_code || 'Global';
      const rate = item.tax_rates?.rate || 0;

      // Create a unique key for grouping
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

  // 4. Calculate Summaries per Currency
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
    
    // Net Liability = Output (Owed) - Input (Recoverable)
    summary.net_liability = summary.total_output_tax - summary.total_input_tax;
  });

  const summaries = Array.from(summaryMap.values());

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <TaxReportClient 
        data={taxData} 
        summaries={summaries} 
        currentPeriod={dateStr} 
      />
    </div>
  );
}