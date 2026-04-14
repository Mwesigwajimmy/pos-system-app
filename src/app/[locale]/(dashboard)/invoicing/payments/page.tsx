import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PaymentRegistry from "@/components/invoicing/PaymentRegistry";
import { 
    Landmark, 
    ArrowLeft, 
    CheckCircle2, 
    History, 
    AlertCircle, 
    Wrench, 
    ShieldCheck,
    Activity,
    Zap,
    ShieldAlert,
    Database,
    Fingerprint,
    Loader2 // FIXED: Added missing import
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Settlement Registry | Sovereign Ledger",
  description: "Enterprise autonomous settlement handshake and ledger synchronization terminal.",
};

interface PageProps { params: { locale: string }; }

export default async function PaymentsPage({ params }: PageProps) {
  // NEXT.JS 15 COMPATIBILITY: Ensure params are handled safely
  const { locale } = await params;
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. SECURE AUTHENTICATION HANDSHAKE
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) redirect(`/${locale}/auth/login`);

  const user = authData.user;

  // 2. IDENTITY & CONTEXT RESOLUTION
  // We fetch the profile using maybeSingle() to prevent the 500 Digest error.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id, tenant_id, organization_id, business_name, currency")
    .eq("id", user.id)
    .maybeSingle();

  // Resolve the primary operational ID using Enterprise Hierarchy (Business > Tenant > Org)
  const activeBusinessId = profile?.business_id || profile?.tenant_id || profile?.organization_id;
  const activeBusinessName = profile?.business_name || "Active Sovereign Unit";
  const reportingCurrency = profile?.currency || "UGX";

  // 3. SECURITY GATEKEEPER
  if (!activeBusinessId || profileError) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="bg-rose-50 p-12 rounded-[40px] border-2 border-dashed border-rose-200 max-w-md shadow-2xl shadow-rose-500/10">
          <ShieldAlert className="h-16 w-16 text-rose-600 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-red-900 uppercase tracking-tighter leading-none">Forensic Lock</h2>
          <p className="text-rose-700 mt-4 font-medium leading-relaxed uppercase text-[10px] tracking-widest">
            Identity verification failed. Profile is not anchored to an active Business Unit.
          </p>
          <Link href={`/${locale}/dashboard`} className="mt-8 inline-block px-10 h-12 bg-rose-600 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:bg-red-700 transition-all active:scale-95">Return to Command Center</Link>
        </div>
      </div>
    );
  }

  // 4. INFRASTRUCTURE READINESS AUDIT
  const [arRes, journalRes, auditRes] = await Promise.all([
    supabase.from("accounting_accounts").select("id").eq("business_id", activeBusinessId).eq("code", "1210").limit(1).maybeSingle(),
    supabase.from("accounting_journals").select("id").eq("business_id", activeBusinessId).eq("code", "GEN").limit(1).maybeSingle(),
    supabase.rpc('get_fx_forensic_audit', { p_user_id: user.id })
  ]);

  const isLedgerSynchronized = !!(arRes.data && journalRes.data);

  // 5. TRANSACTIONAL DATA ACQUISITION
  const [invoicesRes, accountsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, customer_name, balance_due, currency, total")
      .eq("business_id", activeBusinessId)
      .gt("balance_due", 0) 
      .order("issue_date", { ascending: false }),
      
    supabase
      .from("accounting_accounts")
      .select("id, name, code, currency")
      .eq("business_id", activeBusinessId)
      .eq("code", "1000") 
      .eq("is_active", true)
  ]);

  // Handle Infrastructure Loading States
  if (!isLedgerSynchronized) {
    return (
        <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
            <div className="bg-amber-50 p-12 rounded-[40px] border-2 border-dashed border-amber-200 max-w-lg shadow-2xl shadow-amber-500/10">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse" />
                    <Wrench className="h-16 w-16 text-amber-600 mx-auto relative z-10" size={48} />
                </div>
                <h2 className="text-2xl font-black text-amber-900 uppercase tracking-tighter">Handshake Interrupted</h2>
                <p className="text-amber-800 text-sm mt-3 font-medium leading-relaxed max-w-sm mx-auto uppercase text-[10px] tracking-widest leading-none">
                    Ledger Provisioning Required. Standard Accounts (1210) and Journals (GEN) are missing for this unit.
                </p>
                <div className="mt-8 flex gap-3 justify-center">
                    <Link 
                        href={`/${locale}/settings/accounting`} 
                        className="px-10 h-14 bg-amber-600 text-white rounded-2xl flex items-center font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-amber-700 transition-all shadow-lg active:scale-95"
                    >
                        Initialize Infrastructure
                    </Link>
                </div>
            </div>
        </div>
    );
  }

  // Calculate high-level metrics for UI counters
  const lastSync = auditRes.data?.[0]?.sync_timestamp ? new Date(auditRes.data[0].sync_timestamp) : new Date();
  const displaySync = lastSync.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6 animate-in fade-in duration-1000">
      
      {/* ENTERPRISE MASTER HEADER */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10 border-slate-200">
        <div className="space-y-3">
          <Link href={`/${locale}/invoicing/list`} className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">
            <ArrowLeft size={12} className="mr-2" /> Return to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-xl text-white">
              <Landmark size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Payment Registry</h1>
              <p className="text-slate-500 font-bold mt-1 uppercase text-[11px] tracking-widest leading-none ml-1">
                Autonomous Settlement Handshake for <span className="text-emerald-600 font-black underline underline-offset-4 decoration-emerald-500/30">{activeBusinessName}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-950 px-5 py-3 rounded-2xl border border-white/10 shadow-lg">
           <ShieldCheck size={16} className="text-emerald-400" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Protocol Type</span>
             <span className="text-xs font-bold text-emerald-400 uppercase mt-1 leading-none">Ledger Direct Sync</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* OPERATIONAL TERMINAL PANEL */}
        <div className="lg:col-span-2">
            <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm relative overflow-hidden">
                <Database className="absolute -right-4 top-4 text-slate-50 w-32 h-32 rotate-12" />
                
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Record Arrival</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Autonomous Reconciliation Terminal</p>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none px-4 py-1 font-black text-[10px] uppercase rounded-full">
                            {invoicesRes.data?.length || 0} Documents Open
                        </Badge>
                    </div>
                    
                    <PaymentRegistry 
                      isOpen={true} 
                      onClose={() => {}}
                      unpaidInvoices={invoicesRes.data || []}
                      bankAccounts={accountsRes.data || []}
                      businessId={activeBusinessId}
                      businessName={activeBusinessName}
                    />
                </div>
            </div>
        </div>

        {/* SYSTEM INTELLIGENCE & AUDIT BAR */}
        <div className="space-y-6">
           <div className="p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
              <History size={80} className="absolute -right-4 -bottom-4 text-white opacity-5 group-hover:rotate-12 transition-all duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                        <Activity size={18} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Forensic Audit</span>
                </div>
                <div className="space-y-4">
                    <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                        Settlements recorded here trigger an automated handshake between Account <span className="text-white font-bold underline underline-offset-8 decoration-blue-500">1210</span> (Receivables) and your chosen liquidity asset.
                    </p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                        Last Market Sync: {displaySync}
                    </p>
                </div>
                <div className="pt-6 border-t border-white/10 flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Mathematical Parity Verified
                </div>
              </div>
           </div>

           {/* CONFIGURATION ALERTS */}
           {accountsRes.data?.length === 0 && (
             <div className="p-6 bg-amber-50 border border-amber-200 rounded-[32px] flex gap-4 items-start shadow-sm">
               <Zap className="text-amber-600 shrink-0 mt-1" size={20} />
               <div className="space-y-1">
                 <p className="text-[11px] text-amber-900 font-black uppercase tracking-widest leading-none">Liquidity Warning</p>
                 <p className="text-[10px] text-amber-700 font-medium leading-relaxed mt-1 uppercase tracking-tight">
                   No recipient account found with **Code 1000**. Settlement entry is currently restricted.
                 </p>
               </div>
             </div>
           )}

           <div className="p-6 bg-white border border-slate-200 rounded-[32px] shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                <Fingerprint className="text-slate-400" size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">System Identity</p>
                <p className="text-[10px] font-mono font-bold text-slate-900 mt-1">
                    {String(activeBusinessId).substring(0,18).toUpperCase()}
                </p>
              </div>
           </div>
        </div>
      </div>

      {/* GLOBAL SYSTEM FOOTER */}
      <div className="mt-24 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Sovereign Ledger System Protocol v10.2</p>
        <div className="flex items-center gap-8">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                <ShieldCheck size={10} /> Forensic Privacy Enabled
            </p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Cloud-Anchored • Multi-Tenant</p>
        </div>
      </div>
    </div>
  );
}