import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import FXGainLossAudit from "@/components/invoicing/FXGainLossAudit";
import { TrendingUp, Landmark, ArrowLeft, RefreshCcw, ShieldCheck, Activity } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Currency Valuation Audit | Enterprise Ledger",
  description: "Operational monitoring of currency variance and unrealized exchange differentials.",
};

interface PageProps { params: { locale: string }; }

export default async function FXAuditPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id, currency, business_name")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (!activeTenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-12 bg-slate-50">
        <div className="bg-white border border-slate-200 p-12 rounded-[2rem] max-w-md shadow-xl text-center space-y-6">
          <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Landmark size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Access Restricted</h2>
            <p className="text-sm text-slate-500 font-medium">Your account profile is not associated with an active business unit. Audit protocols are locked.</p>
          </div>
          <Link href={`/${locale}/dashboard`} className="mt-4 block text-sm font-bold text-blue-600">
            Return to Command Center
          </Link>
        </div>
      </div>
    );
  }

  const { data: auditResults } = await supabase
    .rpc('get_fx_forensic_audit', { p_user_id: user.id });

  const totalGain = auditResults?.reduce((acc: number, curr: any) => acc + Number(curr.unrealized_gain_loss), 0) || 0;
  const lastSync = auditResults?.[0]?.sync_timestamp ? new Date(auditResults[0].sync_timestamp) : new Date();
  const displaySync = lastSync.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700 bg-white">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-100 pb-12">
        <div className="space-y-4">
          <Link 
            href={`/${locale}/invoicing/all-invoices`} 
            className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={14} className="mr-2" /> Return to Registry
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="p-4 bg-emerald-600 rounded-[1.5rem] text-white shadow-xl shadow-emerald-100">
              <TrendingUp size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Currency Variance Audit</h1>
              <p className="text-sm font-medium text-slate-500">Valuation analysis for {profile.business_name || 'Active Entity'}.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900 px-6 py-4 rounded-[2rem] shadow-xl">
           <RefreshCcw size={18} className="text-blue-400" />
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Market Rate Feed</span>
             <span className="text-xs font-bold text-emerald-400 uppercase mt-1">Synchronized: {displaySync}</span>
           </div>
        </div>
      </header>

      <main className="min-h-[600px]">
        <FXGainLossAudit 
          auditData={auditResults || []} 
          totalGain={totalGain} 
          homeCurrency={profile?.currency} 
        />
      </main>

      <footer className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-30">
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
          <ShieldCheck size={14} /> Fiscal Compliance Standard 12-B
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <Activity size={12} /> Valuation Node: {activeTenantId.substring(0,18).toUpperCase()}
        </div>
      </footer>
    </div>
  );
}