import React from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import ManufacturingReportCenter from '@/components/reports/ManufacturingReportCenter';
import { Factory, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manufacturing Reports | Business Manager',
  description: 'Production cycle reporting, yield analytics, and landed cost audit trail.',
};

export default async function ManufacturingReportsPage({ 
  searchParams 
}: { 
  searchParams: { from?: string, to?: string, batchId?: string } 
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. DATE RESOLUTION (Logic Intact)
  const from = searchParams.from || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const to = searchParams.to || format(endOfMonth(new Date()), 'yyyy-MM-dd');

  // 2. DATA EXECUTION (Logic Intact)
  const [auditResponse, summaryResponse, tenantResponse] = await Promise.all([
    supabase
        .from('view_manufacturing_audit_master')
        .select('*')
        .gte('production_date', from)
        .lte('production_date', to)
        .order('production_date', { ascending: false }),
    supabase.rpc('get_manufacturing_financial_summary', {
        p_from: from,
        p_to: to
    }),
    supabase.from('tenants').select('name, currency_code').limit(1).single()
  ]);

  // 3. ERROR HANDLING (Refactored for Professional UI)
  if (auditResponse.error) {
    console.error("Manufacturing Engine Error:", auditResponse.error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50 p-6">
        <div className="p-10 text-center bg-white border border-slate-200 shadow-sm rounded-xl max-w-lg animate-in zoom-in duration-500">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Report Generation Failed</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            The system was unable to aggregate production logs for this period. 
            Please ensure your production modules are correctly synchronized with the general ledger.
          </p>
          <div className="mt-8 pt-6 border-t border-slate-100">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Error Reference: ERR_MFG_REPORT_SYNC</p>
          </div>
        </div>
      </div>
    );
  }

  const businessName = tenantResponse.data?.name || "Organization";
  const currency = tenantResponse.data?.currency_code || "UGX";

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      
      {/* PROFESSIONAL HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-5">
            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-blue-600 shadow-sm">
                <Factory size={28} />
            </div>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manufacturing Report Center</h1>
                    <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/50 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wide">
                        Audit Trail
                    </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                    <p className="text-slate-500 text-sm font-medium">Production metrics and landed cost analysis.</p>
                    <div className="h-4 w-px bg-slate-200" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Reporting Currency: <span className="text-slate-700">{currency}</span>
                    </span>
                </div>
            </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Account Context</span>
                <span className="text-sm font-bold text-slate-700">{businessName}</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <ShieldCheck size={20} />
            </div>
        </div>
      </div>

      {/* MASTER CONTENT AREA */}
      <div className="max-w-[1600px] mx-auto">
          <ManufacturingReportCenter 
            initialData={auditResponse.data} 
            businessName={businessName}
            currency={currency}
            dateFrom={from}
            dateTo={to}
          />
      </div>

      {/* COMPLIANCE FOOTER */}
      <div className="flex justify-center items-center gap-4 pt-12 opacity-30">
          <div className="h-[1px] w-12 bg-slate-400" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Standard Compliance Verified • Production Engine v3.0
          </p>
          <div className="h-[1px] w-12 bg-slate-400" />
      </div>
    </div>
  );
}