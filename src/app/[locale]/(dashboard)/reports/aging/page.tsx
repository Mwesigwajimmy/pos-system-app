import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import AgingReportsClient, { AgingRecord, AgingSummary, AgingBucket } from '@/components/reports/AgingReports';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Enterprise Financial Aging | Universal View',
  description: 'Automated real-time aging analysis across all enterprise modules via the General Ledger.',
};

export default async function AgingReportsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const today = startOfDay(new Date());

  try {
    // 1. UNIVERSAL FETCH
    // We query the Universal Ledger View. It doesn't matter where the data
    // originated (Sales, SACCO, Inventory); if it's in the GL, it's here.
    const { data: universalData, error } = await supabase
      .from('view_universal_financial_aging')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Ledger connection failed: ${error.message}`);

    const rawRecords = universalData || [];

    // 2. AGING BUCKET ENGINE
    const getBucket = (days: number): AgingBucket => {
      if (days <= 30) return '0-30';
      if (days <= 60) return '31-60';
      if (days <= 90) return '61-90';
      return '90+';
    };

    // 3. AUTOMATED TRANSFORMATION
    const combinedData: AgingRecord[] = rawRecords.map((r) => {
      const days = differenceInDays(today, parseISO(r.created_at));
      const saneDays = days < 0 ? 0 : days; 
      
      return {
        id: r.id,
        type: r.type as 'Receivable' | 'Payable',
        name: r.name,
        reference: r.reference,
        currency: r.currency,
        total_amount: Number(r.amount),
        days_overdue: saneDays,
        bucket: getBucket(saneDays),
        created_at: r.created_at,
      };
    });

    // 4. MULTI-CURRENCY GLOBAL AGGREGATION
    const summaryMap = new Map<string, AgingSummary>();

    combinedData.forEach(item => {
      if (!summaryMap.has(item.currency)) {
        summaryMap.set(item.currency, { 
          currency: item.currency, 
          total_receivables: 0, 
          total_payables: 0 
        });
      }
      const entry = summaryMap.get(item.currency)!;
      if (item.type === 'Receivable') {
        entry.total_receivables += item.total_amount;
      } else {
        entry.total_payables += item.total_amount;
      }
    });

    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Aging Analysis</h2>
        </div>
        
        <AgingReportsClient 
          initialData={combinedData} 
          summaries={Array.from(summaryMap.values())} 
        />
      </div>
    );

  } catch (error: any) {
    return (
      <div className="p-8 m-4 text-red-600 border border-red-200 bg-red-50 rounded-md">
        <h3 className="font-bold text-lg">Financial Hub Offline</h3>
        <p className="mt-2 text-sm">Error: {error.message}</p>
      </div>
    );
  }
}