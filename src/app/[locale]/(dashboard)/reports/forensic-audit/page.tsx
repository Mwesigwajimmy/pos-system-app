import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import DailyForensicAudit from '@/components/reports/DailyForensicAudit';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Financial Control Center | Daily Business Audit',
  description: 'Real-time monitoring of daily cash-flow, staff performance, and bank reconciliation.',
};

export default async function ForensicAuditPage({ 
  searchParams 
}: { 
  searchParams: { date?: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. DYNAMIC DATE RESOLUTION
  const targetDate = searchParams.date || format(new Date(), 'yyyy-MM-dd');

  /**
   * DATA EXECUTION:
   * Fetches the master ledger and business identity in parallel.
   */
  const [auditResponse, tenantResponse] = await Promise.all([
    supabase
        .from('view_bbu1_operational_audit_master')
        .select('*')
        .eq('operational_date', targetDate)
        .order('timestamp', { ascending: false }),
    supabase.from('tenants').select('name, currency_code, country_code').limit(1).single()
  ]);

  // 2. ERROR HANDLING (Cleaned up from tech jargon to business terms)
  if (auditResponse.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="p-12 text-center bg-white border border-slate-100 shadow-2xl rounded-[3rem] max-w-xl animate-in zoom-in duration-700">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <span className="text-4xl font-bold">!</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">System Synchronization Error</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            The system failed to connect with the Daily Ledger. 
            This may be due to an expired session or a temporary connection issue with the central database.
          </p>
          <div className="mt-10 pt-8 border-t border-slate-50">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Code: ERR_DATABASE_SYNC_FAILURE</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. UI METADATA PREP
  const businessName = tenantResponse.data?.name || "Global Enterprise";
  const currency = tenantResponse.data?.currency_code || "UGX";
  const country = tenantResponse.data?.country_code || "UG";

  return (
    <main className="min-h-screen bg-white">
      {/* THE FIX: Centered container prevents the UI from pushing to the far right */}
      <div className="max-w-[1600px] mx-auto py-8 px-6 md:px-10 lg:px-12 space-y-8 animate-in fade-in duration-500">
        
        {/* --- PROFESSIONAL AUDIT HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-50 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em]">
                  Financial Operations Control
              </h2>
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Activity Ledger</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-xs font-bold text-slate-800 tracking-tight uppercase">Register Active</span>
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  Currency Node: <span className="font-bold text-slate-900 tracking-tight">{currency} • {country}</span>
                </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Verified Identity</span>
              <div className="text-xs font-bold text-blue-700 bg-blue-50 px-5 py-2 rounded-full border border-blue-100 uppercase tracking-wider">
                  {businessName}
              </div>
          </div>
        </div>

        {/* --- THE MASTER AUDIT COMPONENT --- */}
        <div className="w-full">
            <DailyForensicAudit 
                initialData={auditResponse.data} 
                serverDate={targetDate}
                businessIdentity={{
                    name: businessName,
                    currency: currency,
                    country: country
                }}
            />
        </div>

        {/* --- SYSTEM FOOTER --- */}
        <footer className="pt-20 pb-12 flex flex-col items-center gap-4 opacity-30">
            <div className="flex items-center gap-4">
                <div className="h-px w-12 bg-slate-200" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em]">
                    Enterprise Integrity Node v10.2
                </p>
                <div className="h-px w-12 bg-slate-200" />
            </div>
        </footer>
      </div>
    </main>
  );
}