import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
// FIX: Add curly braces { } around the component name
import { RevolutionaryBalanceSheet } from '@/components/reports/RevolutionaryBalanceSheet'; 
import { createClient } from '@/lib/supabase/server';
import { endOfMonth, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Balance Sheet Statement',
  description: 'Statement of Financial Position: Assets, Liabilities, and Equity.',
};

export interface BalanceSheetRecord {
  category: 'Assets' | 'Liabilities' | 'Equity';
  sub_category: string;
  account_name: string;
  balance: number;
}

export default async function BalanceSheetPage({ searchParams }: { searchParams: { date?: string } }) {
  // ... rest of your code remains exactly the same ...
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const dateParam = searchParams.date ? new Date(searchParams.date) : new Date();
  const reportDate = format(endOfMonth(dateParam), 'yyyy-MM-dd');

  // 1. Fetch Real Data
  const { data: rawData, error } = await supabase
    .from('view_general_ledger')
    .select('*')
    .in('account_type', ['Asset', 'Liability', 'Equity'])
    .lte('transaction_date', reportDate);

  if (error) {
    console.error("Balance Sheet Fetch Error:", error);
  }

  // 2. Aggregation Logic
  const bsMap = new Map<string, BalanceSheetRecord>();

  rawData?.forEach((row: any) => {
    let category: 'Assets' | 'Liabilities' | 'Equity' = 'Assets';
    if (row.account_type === 'Liability') category = 'Liabilities';
    else if (row.account_type === 'Equity') category = 'Equity';

    const key = `${category}-${row.account_name}`;

    if (!bsMap.has(key)) {
      bsMap.set(key, {
        category,
        sub_category: 'General',
        account_name: row.account_name || 'Uncategorized',
        balance: 0
      });
    }

    const currentVal = category === 'Assets' 
      ? (Number(row.debit) - Number(row.credit))
      : (Number(row.credit) - Number(row.debit));

    const entry = bsMap.get(key)!;
    entry.balance += currentVal;
  });

  // 3. Retained Earnings
  const { data: pnlData } = await supabase
    .from('view_general_ledger')
    .select('account_type, debit, credit')
    .in('account_type', ['Revenue', 'Expense'])
    .lte('transaction_date', reportDate);

  let retainedEarnings = 0;
  pnlData?.forEach((row: any) => {
    if (row.account_type === 'Revenue') retainedEarnings += (Number(row.credit) - Number(row.debit));
    else retainedEarnings -= (Number(row.debit) - Number(row.credit));
  });

  const reKey = 'Equity-Retained Earnings';
  if (bsMap.has(reKey)) {
    bsMap.get(reKey)!.balance += retainedEarnings;
  } else {
    bsMap.set(reKey, {
      category: 'Equity',
      sub_category: 'Retained Earnings',
      account_name: 'Retained Earnings',
      balance: retainedEarnings
    });
  }

  const bsData = Array.from(bsMap.values());

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <RevolutionaryBalanceSheet 
        data={bsData} 
        reportDate={format(new Date(reportDate), 'MMMM dd, yyyy')} 
      />
    </div>
  );
}