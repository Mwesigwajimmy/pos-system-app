import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
// FIX: Import the component AND the types from the component file location
import AgingReportsClient, { AgingRecord, AgingSummary, AgingBucket } from '@/components/reports/AgingReports';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Aged Receivables & Payables | Enterprise Reports',
  description: 'Financial analysis of outstanding invoices and bills by aging buckets.',
};

export default async function AgingReportsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const today = startOfDay(new Date());

  try {
    // 1. Parallel Data Fetching
    const [salesResult, expensesResult] = await Promise.all([
      supabase
        .from('sales')
        .select('id, customer_name, invoice_number, total_amount, created_at, currency_code')
        .eq('payment_status', 'unpaid')
        .order('created_at', { ascending: true }),
      
      supabase
        .from('expenses')
        .select('id, category, description, amount, created_at, currency_code')
        .eq('payment_status', 'unpaid')
        .order('created_at', { ascending: true })
    ]);

    if (salesResult.error) throw new Error(`Sales fetch failed: ${salesResult.error.message}`);
    if (expensesResult.error) throw new Error(`Expenses fetch failed: ${expensesResult.error.message}`);

    const receivablesRaw = salesResult.data || [];
    const payablesRaw = expensesResult.data || [];

    // 2. Helper to calculate bucket
    const getBucket = (days: number): AgingBucket => {
      if (days <= 30) return '0-30';
      if (days <= 60) return '31-60';
      if (days <= 90) return '61-90';
      return '90+';
    };

    // 3. Transform & Normalize Receivables (Money In)
    const formattedReceivables: AgingRecord[] = receivablesRaw.map((r) => {
      const days = differenceInDays(today, parseISO(r.created_at));
      const saneDays = days < 0 ? 0 : days; 
      
      return {
        id: r.id,
        type: 'Receivable',
        name: r.customer_name || 'Unknown Customer',
        reference: r.invoice_number || `INV-${r.id.substr(0,8)}`,
        currency: r.currency_code || 'UGX',
        total_amount: Number(r.total_amount),
        days_overdue: saneDays,
        bucket: getBucket(saneDays),
        created_at: r.created_at,
      };
    });

    // 4. Transform & Normalize Payables (Money Out)
    const formattedPayables: AgingRecord[] = payablesRaw.map((p) => {
      const days = differenceInDays(today, parseISO(p.created_at));
      const saneDays = days < 0 ? 0 : days;

      return {
        id: p.id,
        type: 'Payable',
        name: p.category || p.description || 'General Vendor', 
        reference: `BILL-${p.id.substr(0,8)}`,
        currency: p.currency_code || 'UGX',
        total_amount: Number(p.amount),
        days_overdue: saneDays,
        bucket: getBucket(saneDays),
        created_at: p.created_at,
      };
    });

    const combinedData = [...formattedReceivables, ...formattedPayables];

    // 5. Calculate Financial Summaries
    const summaryMap = new Map<string, AgingSummary>();

    combinedData.forEach(item => {
      if (!summaryMap.has(item.currency)) {
        summaryMap.set(item.currency, { currency: item.currency, total_receivables: 0, total_payables: 0 });
      }
      const entry = summaryMap.get(item.currency)!;
      if (item.type === 'Receivable') entry.total_receivables += item.total_amount;
      else entry.total_payables += item.total_amount;
    });

    const summaries = Array.from(summaryMap.values());

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Aging Analysis</h2>
        </div>
        
        <AgingReportsClient 
          initialData={combinedData} 
          summaries={summaries} 
        />
      </div>
    );

  } catch (error: any) {
    console.error("Aging Report Error:", error);
    return (
      <div className="p-8 m-4 text-red-600 border border-red-200 bg-red-50 rounded-md">
        <h3 className="font-bold text-lg">Error generating aging report</h3>
        <p className="mt-2 text-sm text-red-800">
          System message: {error.message || String(error)}
        </p>
      </div>
    );
  }
}