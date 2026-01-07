import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { RevolutionaryBalanceSheet } from '@/components/reports/RevolutionaryBalanceSheet'; 
import { createClient } from '@/lib/supabase/server';
import { endOfMonth, format, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Balance Sheet | Enterprise Financial Position',
  description: 'Consolidated Statement of Position for all tenants and locations.',
};

export default async function BalanceSheetPage({ 
  searchParams 
}: { 
  searchParams: { date?: string, locationId?: string, projectId?: string } 
}) {
  const supabase = createClient(cookies());

  const dateParam = searchParams.date || format(new Date(), 'yyyy-MM-dd');
  const reportDate = format(endOfMonth(parseISO(dateParam)), 'yyyy-MM-dd');
  
  const locationId = searchParams.locationId && searchParams.locationId !== 'all' ? searchParams.locationId : null;
  const projectId = searchParams.projectId && searchParams.projectId !== 'all' ? searchParams.projectId : null;

  const [bsResponse, tenantResponse] = await Promise.all([
    supabase.rpc('get_enterprise_balance_sheet', {
      p_as_of_date: reportDate,
      p_location_id: locationId,
      p_project_id: projectId
    }),
    supabase.from('tenants').select('currency').single()
  ]);

  if (bsResponse.error) {
    return (
      <div className="p-10 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100">
          <h3 className="font-bold text-lg">Statement Generation Error</h3>
          <p className="text-sm opacity-80">The Financial Engine was unable to aggregate ledger balances for this period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/20">
      <div className="flex items-center justify-between px-2">
         <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                Reporting Currency: {tenantResponse.data?.currency || 'USD'}
            </span>
         </div>
         <div className="text-[10px] font-mono text-slate-300">REF_ID: BS_{new Date().getTime()}</div>
      </div>

      <RevolutionaryBalanceSheet 
        data={bsResponse.data} 
        reportDate={format(parseISO(reportDate), 'MMMM dd, yyyy')} 
      />
    </div>
  );
}