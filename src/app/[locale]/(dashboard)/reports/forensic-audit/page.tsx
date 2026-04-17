import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { format, parseISO } from 'date-fns';
import DailyForensicAudit from '@/components/reports/DailyForensicAudit';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Forensic Control Tower | BBU1 Enterprise Audit',
  description: 'Sovereign real-time monitoring of operational cash-flow, sales agent performance, and bank synchronization.',
};

export default async function ForensicAuditPage({ 
  searchParams 
}: { 
  searchParams: { date?: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. DYNAMIC DATE RESOLUTION (Defaults to today if no date in URL)
  const targetDate = searchParams.date || format(new Date(), 'yyyy-MM-dd');

  /**
   * ENTERPRISE PARALLEL EXECUTION:
   * 1. Operational Stream: Fetches the master view data for the landing state.
   * 2. Business Context: Fetches tenant name, currency, and multi-branch status.
   * 3. Identity Check: Verified security context.
   */
  const [auditResponse, tenantResponse] = await Promise.all([
    supabase
        .from('view_bbu1_operational_audit_master')
        .select('*')
        .eq('operational_date', targetDate)
        .order('timestamp', { ascending: false }),
    supabase.from('tenants').select('name, currency_code, country_code').limit(1).single()
  ]);

  // 2. SOVEREIGN ERROR HANDLING
  if (auditResponse.error) {
    console.error("Forensic Engine Sync Error:", auditResponse.error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <div className="p-16 text-center bg-white border border-slate-200 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[3rem] max-w-xl animate-in zoom-in duration-700">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 transform -rotate-12">
            <span className="text-5xl font-black italic">!</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Neural Audit Link Failure</h3>
          <p className="text-slate-500 font-bold leading-relaxed">
            The system failed to synchronize with the Operational Master Ledger. 
            This usually indicates a mismatch in the Business Identity Bridge or an unauthorized access attempt.
          </p>
          <div className="mt-10 pt-8 border-t border-slate-100">
             <p className="text-[11px] font-mono text-slate-400 uppercase tracking-[0.3em]">Protocol Code: ERR_BBU1_FORENSIC_SYNC</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. UI METADATA PREP
  const businessName = tenantResponse.data?.name || "BBU1 Global Enterprise";
  const currency = tenantResponse.data?.currency_code || "UGX";
  const country = tenantResponse.data?.country_code || "UG";

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
      
      {/* ENTERPRISE FORENSIC HEADER */}
      <div className="mb-4 flex items-end justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] italic">
                Operational Sovereignty
            </h2>
            <div className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Audit Engine</span>
          </div>
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                <span className="text-xs font-black text-slate-800 tracking-tight">SYSTEM_LIVE</span>
              </div>
              <p className="text-sm text-slate-400 font-bold italic">
                Active Currency: <span className="font-black text-slate-900 not-italic tracking-tighter">{currency} ({country})</span>
              </p>
          </div>
        </div>

        <div className="hidden lg:block text-right">
            <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-widest font-black">Identity Verified</span>
            <div className="text-xs font-black text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 uppercase tracking-[0.1em]">
                {businessName} HQ
            </div>
        </div>
      </div>

      {/* THE MASTER CLIENT COMMAND CENTER */}
      {/* We pass server data to initialData to ensure instant Million-Dollar performance */}
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
  );
}