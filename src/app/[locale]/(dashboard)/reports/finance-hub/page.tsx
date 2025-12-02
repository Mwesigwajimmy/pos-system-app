import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { FinanceHub, ProfitAndLossRecord, BalanceSheetRecord } from '@/components/reports/FinanceHub';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Financial Intelligence Hub',
  description: 'Integrated Profit & Loss and Balance Sheet analysis.',
};

export default async function FinanceHubPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const today = new Date();
  
  const from = searchParams.from || startOfMonth(today).toISOString();
  const to = searchParams.to || endOfMonth(today).toISOString();

  // 1. Fetch P&L Data
  const { data: pnlRaw } = await supabase
    .from('view_general_ledger')
    .select('*')
    .in('account_type', ['Revenue', 'Expense'])
    .gte('transaction_date', from)
    .lte('transaction_date', to);

  // 2. Fetch Balance Sheet Data
  const { data: bsRaw } = await supabase
    .from('view_general_ledger')
    .select('*')
    .in('account_type', ['Asset', 'Liability', 'Equity'])
    .lte('transaction_date', to);

  // 3. Process P&L
  const pnlData: ProfitAndLossRecord[] = [];
  const pnlMap = new Map<string, ProfitAndLossRecord>();

  pnlRaw?.forEach((row: any) => {
    let cat: 'Revenue' | 'Cost of Goods Sold' | 'Operating Expenses' = 'Operating Expenses';
    if (row.account_type === 'Revenue') cat = 'Revenue';
    else if (row.account_name.includes('Cost of Goods')) cat = 'Cost of Goods Sold';

    const key = `${cat}-${row.account_name}`;
    if (!pnlMap.has(key)) {
        pnlMap.set(key, { category: cat, account_name: row.account_name, amount: 0 });
    }
    
    const amount = row.account_type === 'Revenue' ? (row.credit - row.debit) : (row.debit - row.credit);
    pnlMap.get(key)!.amount += amount;
  });
  pnlData.push(...Array.from(pnlMap.values()));


  // 4. Process Balance Sheet
  const bsData: BalanceSheetRecord[] = [];
  const bsMap = new Map<string, BalanceSheetRecord>();

  bsRaw?.forEach((row: any) => {
    let cat: 'Assets' | 'Liabilities' | 'Equity' = 'Assets';
    if (row.account_type === 'Liability') cat = 'Liabilities';
    if (row.account_type === 'Equity') cat = 'Equity';

    const key = `${cat}-${row.account_name}`;
    if (!bsMap.has(key)) {
        bsMap.set(key, { category: cat, sub_category: 'General', account_name: row.account_name, balance: 0 });
    }

    const balance = cat === 'Assets' ? (row.debit - row.credit) : (row.credit - row.debit);
    bsMap.get(key)!.balance += balance;
  });
  bsData.push(...Array.from(bsMap.values()));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <FinanceHub 
        pnl={pnlData} 
        bs={bsData} 
        pnlPeriod={`${format(new Date(from), 'MMM dd')} - ${format(new Date(to), 'MMM dd, yyyy')}`}
        bsDate={format(new Date(to), 'MMM dd, yyyy')}
      />
    </div>
  );
}