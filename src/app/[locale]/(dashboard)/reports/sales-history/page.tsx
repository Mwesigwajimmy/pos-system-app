import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers'; // Added
import SalesHistoryDataTable from '@/components/reports/SalesHistoryDataTable';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sales History Log',
  description: 'Detailed audit log of all sales transactions.',
};

export default async function SalesHistoryPage() {
  // Even if we don't fetch data here, initializing the client correctly is good practice
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Sales History</h2>
      </div>
      <SalesHistoryDataTable />
    </div>
  );
}