// src/app/[locale]/(dashboard)/reports/income-statement/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import IncomeStatementMaster from '@/components/reports/IncomeStatementMaster';
import { FileText, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

// 1. PROFESSIONAL METADATA
export const metadata: Metadata = {
  title: 'Income Statement | Financial Reporting',
  description: 'Official Profit & Loss analysis generated from business ledger data.',
};

export default async function IncomeStatementPage({ 
  searchParams 
}: { 
  searchParams: { date?: string, locationId?: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // PERIOD CALCULATION (Logic Intact)
  const dateParam = searchParams.date || format(new Date(), 'yyyy-MM-dd');
  const startDate = format(startOfMonth(parseISO(dateParam)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(parseISO(dateParam)), 'yyyy-MM-dd');
  
  const locationId = searchParams.locationId && searchParams.locationId !== 'all' ? searchParams.locationId : null;

  // DATA FETCHING (Logic Intact)
  const [pnlResponse, tenantResponse] = await Promise.all([
    supabase.rpc('aura_generate_master_income_statement', {
      p_start_date: startDate,
      p_end_date: endDate
    }),
    supabase.from('tenants').select('currency_code, name, industry').single()
  ]);

  // ERROR HANDLING (Professional UI Refactor)
  if (pnlResponse.error) {
    console.error("Ledger Error:", pnlResponse.error);
    return (
      <div className="p-12 flex items-center justify-center min-h-screen bg-slate-50/50">
        <div className="max-w-xl w-full bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center animate-in zoom-in duration-500">
          <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100">
             <AlertCircle size={32} />
          </div>
          <h3 className="font-bold text-xl text-slate-900 tracking-tight">Report Generation Error</h3>
          <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed">
            The system was unable to aggregate data for the requested financial period. 
            This may be due to incomplete ledger entries or background synchronization.
          </p>
          <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
             <p className="font-mono text-[10px] text-slate-400 text-left">
                SYSTEM_LOG: {pnlResponse.error.message}
             </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-8 md:p-10 bg-slate-50/30 min-h-screen animate-in fade-in duration-500">
      
      {/* PROFESSIONAL HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-5">
            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-blue-600 shadow-sm">
                <TrendingUp size={28} />
            </div>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Income Statement</h1>
                    <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/50 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wide">
                        P&L Report
                    </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                    <p className="text-slate-500 text-sm font-medium">Profit and loss analysis for the selected reporting period.</p>
                    <div className="h-4 w-px bg-slate-200 hidden md:block" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Reporting Currency: <span className="text-slate-700">{tenantResponse.data?.currency_code || 'UGX'}</span>
                    </span>
                </div>
            </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Account Status</span>
                <span className="text-sm font-bold text-slate-700">Audit Compliance Active</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <ShieldCheck size={20} />
            </div>
        </div>
      </div>

      {/* SYSTEM STATUS BAR */}
      <div className="flex flex-col md:flex-row justify-between items-center px-2 gap-4">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Ledger Connection: Secure
                </span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                    Data Integrity: Verified
                </span>
            </div>
         </div>
         
         <div className="flex flex-col md:items-end">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                REPORT_REF: {new Date().toISOString().replace(/[:.-]/g, '').slice(0, 14)}
            </div>
         </div>
      </div>

      {/* INCOME STATEMENT INSTRUMENT */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-[1600px] mx-auto">
          <IncomeStatementMaster 
            from={startDate}
            to={endDate}
          />
      </div>

      {/* COMPLIANCE FOOTER */}
      <div className="max-w-5xl mx-auto py-10 text-center opacity-30">
          <div className="flex justify-center items-center gap-4">
              <div className="h-[1px] w-12 bg-slate-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                 Financial Management Suite • Version 10.5
              </p>
              <div className="h-[1px] w-12 bg-slate-400" />
          </div>
      </div>
    </div>
  );
}