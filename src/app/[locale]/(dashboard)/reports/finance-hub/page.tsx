import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { FinanceHub } from '@/components/reports/FinanceHub';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Financial Intelligence Hub | Enterprise Dashboard',
  description: 'Consolidated real-time reporting with comparative analytics and trend visualization.',
};

export default async function FinanceHubPage({ 
  searchParams 
}: { 
  searchParams: { from?: string, to?: string, locationId?: string, projectId?: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Set standard ISO date strings for the SQL engine
  const from = searchParams.from || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const to = searchParams.to || format(endOfMonth(new Date()), 'yyyy-MM-dd');
  
  const locationId = searchParams.locationId && searchParams.locationId !== 'all' ? searchParams.locationId : null;
  const projectId = searchParams.projectId && searchParams.projectId !== 'all' ? searchParams.projectId : null;

  /**
   * ENTERPRISE PARALLEL EXECUTION:
   * 1. Hub V2: Fetches Current P&L, Previous P&L (for growth %), and 6-Month Trends.
   * 2. Balance Sheet: Fetches snapshot as of the end date.
   * 3. Metadata: Fetches Locations and Projects for the filter bar.
   */
  const [analyticsResponse, balanceSheetResponse, locationsResponse, projectsResponse] = await Promise.all([
    supabase.rpc('get_enterprise_financial_hub_v2', {
      p_from: from,
      p_to: to,
      p_location_id: locationId,
      p_project_id: projectId
    }),
    supabase.rpc('get_enterprise_balance_sheet', {
      p_as_of_date: to,
      p_location_id: locationId,
      p_project_id: projectId
    }),
    supabase.from('locations').select('id, name').order('name'),
    supabase.from('projects').select('id, name').order('name')
  ]);

  // Comprehensive Error Handling for Financial Systems
  if (analyticsResponse.error || balanceSheetResponse.error) {
    console.error("Ledger Engine Error:", analyticsResponse.error || balanceSheetResponse.error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <div className="p-12 text-center bg-white border shadow-2xl rounded-3xl max-w-lg">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-black italic">!</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Accounting Engine Synchronization Error</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            The multi-tenant ledger failed to aggregate balances. This usually happens if the Chart of Accounts is not fully initialized for this business ID.
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100">
             <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Code: ERR_LEDGER_SYNC_FAILED</p>
          </div>
        </div>
      </div>
    );
  }

  // Data Mapping for UI Components
  const { current_pnl, prev_pnl, trends, currency } = analyticsResponse.data;

  // Formatting display periods
  const displayPnlPeriod = `${format(parseISO(from), 'MMM dd')} - ${format(parseISO(to), 'MMM dd, yyyy')}`;
  const displayBsDate = format(parseISO(to), 'MMMM dd, yyyy');

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
      <div className="mb-2 flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">
                Enterprise Financial Hub
            </h2>
            <div className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v2.0 Analytics</span>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                <span className="text-[11px] font-extrabold text-slate-700 tracking-tight">LEDGER LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium italic">
                Reporting Currency: <span className="font-black text-slate-900 not-italic">{currency}</span>
              </p>
          </div>
        </div>
        <div className="hidden lg:block text-right">
            <span className="text-[9px] font-mono text-slate-400 block mb-1 uppercase tracking-tighter">Tenant Data Isolation Verified</span>
            <div className="text-xs font-bold text-slate-800 bg-slate-200/50 px-3 py-1 rounded-full border border-slate-300/50 uppercase tracking-widest">
                Multi-Branch Active
            </div>
        </div>
      </div>

      <FinanceHub 
        pnl={current_pnl.map((i: any) => ({ category: i.cat, account_name: i.acc, amount: i.val }))} 
        prevPnl={prev_pnl.map((i: any) => ({ category: i.cat, amount: i.val }))}
        bs={balanceSheetResponse.data} 
        trends={trends}
        pnlPeriod={displayPnlPeriod}
        bsDate={displayBsDate}
        locations={locationsResponse.data || []}
        projects={projectsResponse.data || []}
      />
    </div>
  );
}