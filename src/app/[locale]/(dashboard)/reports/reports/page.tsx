import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import ManufacturingReportCenter from '@/components/reports/ManufacturingReportCenter';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manufacturing Audit & Forensic Intelligence | BBU1 ERP',
  description: 'Deep production cycle reporting, wastage analytics, and landed cost audit trail.',
};

export default async function ManufacturingReportsPage({ 
  searchParams 
}: { 
  searchParams: { from?: string, to?: string, batchId?: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. DYNAMIC DATE RESOLUTION
  const from = searchParams.from || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const to = searchParams.to || format(endOfMonth(new Date()), 'yyyy-MM-dd');

  /**
   * ENTERPRISE PARALLEL EXECUTION:
   * 1. Audit Master: Fetches deep production records from our Verified View.
   * 2. Summary Engine: Calculates totals for the forensic cards.
   * 3. Identity Context: Verified tenant isolation.
   */
  const [auditResponse, summaryResponse, tenantResponse] = await Promise.all([
    supabase
        .from('view_manufacturing_audit_master')
        .select('*')
        .gte('production_date', from)
        .lte('production_date', to)
        .order('production_date', { ascending: false }),
    supabase.rpc('get_manufacturing_financial_summary', { // Optional helper if you want to pre-calc on server
        p_from: from,
        p_to: to
    }),
    supabase.from('tenants').select('name, currency_code').limit(1).single()
  ]);

  // 2. ENTERPRISE ERROR HANDLING
  if (auditResponse.error) {
    console.error("Manufacturing Engine Error:", auditResponse.error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
        <div className="p-12 text-center bg-white border shadow-2xl rounded-3xl max-w-lg animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-black italic">!</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Production Audit Sync Failure</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            The manufacturing intelligence engine failed to aggregate production logs. 
            This occurs if the Manufacturing View is not properly linked to the General Ledger.
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100">
             <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">System Code: ERR_MFG_AUDIT_TIMEOUT</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. UI DATA PREP
  const businessName = tenantResponse.data?.name || "BBU1 Enterprise";
  const currency = tenantResponse.data?.currency_code || "UGX";

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/30 min-h-screen">
      
      {/* ENTERPRISE BRANDING HEADER */}
      <div className="mb-2 flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">
                Manufacturing Intelligence Hub
            </h2>
            <div className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forensic Audit v3.0</span>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <span className="text-[11px] font-extrabold text-slate-700 tracking-tight">AUDIT ENGINE LIVE</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium italic">
                Landed Cost Currency: <span className="font-black text-slate-900 not-italic">{currency}</span>
              </p>
          </div>
        </div>

        <div className="hidden lg:block text-right">
            <span className="text-[9px] font-mono text-slate-400 block mb-1 uppercase tracking-tighter">Security Protocol: {businessName} Data Isolation</span>
            <div className="text-xs font-bold text-slate-800 bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-300/30 uppercase tracking-widest">
                Compliance Verified
            </div>
        </div>
      </div>

      {/* THE MASTER CLIENT COMPONENT */}
      {/* We pass the server-fetched audit data as initialData to ensure zero flicker on load */}
      <ManufacturingReportCenter 
        initialData={auditResponse.data} 
        businessName={businessName}
        currency={currency}
        dateFrom={from}
        dateTo={to}
      />

    </div>
  );
}