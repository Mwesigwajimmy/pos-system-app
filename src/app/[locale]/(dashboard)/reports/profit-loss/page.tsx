import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { RevolutionaryProfitAndLossStatement } from '@/components/reports/RevolutionaryProfitAndLossStatement';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profit & Loss Statement',
  description: 'Income Statement: Revenue, COGS, and Expenses.',
};

export interface ProfitAndLossRecord {
  category: 'Revenue' | 'Cost of Goods Sold' | 'Operating Expenses';
  account_name: string;
  amount: number;
}

export default async function ProfitLossPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  // FIX: Pass cookies() to createClient
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const today = new Date();
  const from = searchParams.from || startOfMonth(today).toISOString();
  const to = searchParams.to || endOfMonth(today).toISOString();

  // 1. Fetch P&L Transactions (Period Range)
  const { data: rawData, error } = await supabase
    .from('view_general_ledger')
    .select('*')
    .in('account_type', ['Revenue', 'Expense'])
    .gte('transaction_date', from)
    .lte('transaction_date', to);

  if (error) {
    console.error("P&L Fetch Error:", error);
  }

  // 2. Enterprise Aggregation Logic
  const pnlMap = new Map<string, ProfitAndLossRecord>();

  rawData?.forEach((row: any) => {
    // Strict Categorization based on Account Name or Type
    let cat: 'Revenue' | 'Cost of Goods Sold' | 'Operating Expenses' = 'Operating Expenses';
    
    if (row.account_type === 'Revenue') {
      cat = 'Revenue';
    } else if (row.account_name.toLowerCase().includes('cost of goods') || row.account_name.toLowerCase().includes('cogs')) {
      cat = 'Cost of Goods Sold';
    }

    const key = `${cat}-${row.account_name}`;

    if (!pnlMap.has(key)) {
      pnlMap.set(key, {
        category: cat,
        account_name: row.account_name || 'General Expense',
        amount: 0
      });
    }

    // 3. Accounting Logic:
    // Revenue = Credit - Debit
    // Expense = Debit - Credit
    const amount = row.account_type === 'Revenue' 
      ? (Number(row.credit) - Number(row.debit)) 
      : (Number(row.debit) - Number(row.credit));

    pnlMap.get(key)!.amount += amount;
  });

  const pnlData = Array.from(pnlMap.values());
  const periodLabel = `${format(new Date(from), 'MMM dd')} - ${format(new Date(to), 'MMM dd, yyyy')}`;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <RevolutionaryProfitAndLossStatement 
        data={pnlData} 
        reportPeriod={periodLabel} 
      />
    </div>
  );
}