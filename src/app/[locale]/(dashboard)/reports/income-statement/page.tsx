// src/app/[locale]/(dashboard)/reports/income-statement/page.tsx

import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import IncomeStatementMaster from '@/components/reports/IncomeStatementMaster';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';

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

  // PERIOD CALCULATION
  const dateParam = searchParams.date || format(new Date(), 'yyyy-MM-dd');
  const startDate = format(startOfMonth(parseISO(dateParam)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(parseISO(dateParam)), 'yyyy-MM-dd');
  
  const locationId = searchParams.locationId && searchParams.locationId !== 'all' ? searchParams.locationId : null;

  // DATA FETCHING (Logic Preserved)
  const [pnlResponse, tenantResponse] = await Promise.all([
    supabase.rpc('aura_generate_master_income_statement', {
      p_start_date: startDate,
      p_end_date: endDate
    }),
    supabase.from('tenants').select('currency_code, name, industry').single()
  ]);

  // ERROR HANDLING
  if (pnlResponse.error) {
    console.error("Ledger Error:", pnlResponse.error);
    return (
      <div className="p-12 flex items-center justify-center min-h-screen bg-slate-50">
        <div className="max-w-xl w-full bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="h-12 w-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
             <AlertCircle size={24} />
          </div>
          <h3 className="font-bold text-xl text-slate-900 uppercase tracking-tight">Data Synchronization Error</h3>
          <p className="text-slate-500 mt-3 text-sm leading-relaxed">
            The system was unable to aggregate data from your business modules. This may occur during scheduled maintenance or system updates.
          </p>
          <div className="mt-8 p-4 bg-slate-50 rounded-lg font-mono text-[10px] text-slate-400 text-left border border-slate-100">
             REF_LOG: {pnlResponse.error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 bg-[#F8FAFC] min-h-screen font-sans antialiased animate-in fade-in duration-500">
      
      {/* --- SYSTEM STATUS BAR --- */}
      <div className="flex flex-col md:flex-row justify-between items-center px-2 gap-4">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Ledger Status: Connected
                </span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-600" />
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Currency: {tenantResponse.data?.currency_code || 'UGX'}
                </span>
            </div>
         </div>
         
         <div className="flex flex-col md:items-end">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tight">
                Ref: {new Date().toISOString().replace(/[:.-]/g, '').slice(0, 14)}
            </div>
            <div className="text-[9px] text-emerald-600 font-bold uppercase mt-1 tracking-widest">
                Data Integrity Verified
            </div>
         </div>
      </div>

      {/* --- INCOME STATEMENT INSTRUMENT --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <IncomeStatementMaster 
            from={startDate}
            to={endDate}
          />
      </div>

      {/* --- FOOTER SIGNATURE --- */}
      <div className="max-w-5xl mx-auto py-8 text-center opacity-40">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">
             Financial Reporting Engine v10.5
          </p>
      </div>
    </div>
  );
}