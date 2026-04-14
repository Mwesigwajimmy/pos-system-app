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
    Activity
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Settlement Registry | Sovereign Ledger",
  description: "Autonomous invoice reconciliation and ledger handshake terminal.",
};

interface PageProps { params: { locale: string }; }

export default async function PaymentsPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. SECURE AUTHENTICATION HANDSHAKE
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  // 2. IDENTITY RESOLUTION (Forensic Join)
  // We strictly pull the 'name' from the 'tenants' table as verified in the discovery
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
        business_id,
        tenants (
            name
        )
    `)
    .eq("id", user.id)
    .maybeSingle();

  const bizId = profile?.business_id;
  // Use the verified 'tenants.name' location (e.g., "cake")
  const activeBusinessName = (profile?.tenants as any)?.name || "Sovereign Unit";

  if (!bizId) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center p-6 text-center animate-in fade-in">
        <div className="bg-red-50 p-12 rounded-[40px] border-2 border-dashed border-red-200 max-w-md shadow-2xl">
          <ShieldCheck className="h-16 w-16 text-red-600 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-red-900 uppercase tracking-tighter">Forensic Lock</h2>
          <p className="text-red-700 mt-4 font-medium leading-relaxed uppercase text-[10px] tracking-widest">
            Profile not linked to a Sovereign Business Unit. Access restricted.
          </p>
          <Link href={`/${locale}/dashboard`} className="mt-8 inline-block px-10 h-12 bg-red-600 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:bg-red-700 transition-all">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  // 3. INFRASTRUCTURE AUDIT: Verify required ledger pipes (GEN & 1210)
  // This ensures the backend trigger can post the double-entry successfully.
  const [arRes, journalRes] = await Promise.all([
    supabase.from("accounting_accounts").select("id").eq("business_id", bizId).eq("code", "1210").limit(1).maybeSingle(),
    supabase.from("accounting_journals").select("id").eq("business_id", bizId).eq("code", "GEN").limit(1).maybeSingle()
  ]);

  const isLedgerSynchronized = arRes.data && journalRes.data;

  // 4. HANDSHAKE INTERRUPTED VIEW (If accounts are missing)
  if (!isLedgerSynchronized) {
    return (
        <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
            <div className="bg-amber-50 p-12 rounded-[40px] border-2 border-dashed border-amber-200 max-w-lg shadow-2xl">
                <Wrench className="h-16 w-16 text-amber-600 mx-auto mb-6 animate-bounce" />
                <h2 className="text-2xl font-black text-amber-900 uppercase tracking-tighter">Handshake Interrupted</h2>
                <p className="text-amber-800 mt-4 font-medium leading-relaxed">
                    The General Ledger for <strong className="underline decoration-amber-400 decoration-2">{activeBusinessName}</strong> is not fully initialized. 
                    Standard Accounts (1210) and Journals (GEN) are required for protocol synchronization.
                </p>
                <div className="mt-8">
                    <Link 
                        href={`/${locale}/settings/accounting`} 
                        className="px-10 h-14 bg-amber-600 text-white rounded-2xl flex items-center font-bold uppercase text-[11px] tracking-widest hover:bg-amber-700 transition-all shadow-lg active:scale-95"
                    >
                        Initialize Ledger Infrastructure
                    </Link>
                </div>
            </div>
        </div>
    );
  }

  // 5. TRANSACTIONAL DATA ACQUISITION (Multi-Tenant Secured)
  const [invoicesRes, accountsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, customer_name, balance_due, currency, total")
      .eq("business_id", bizId)
      .gt("balance_due", 0) 
      .order("issue_date", { ascending: false }),
      
    supabase
      .from("accounting_accounts")
      .select("id, name, code")
      .eq("business_id", bizId)
      .eq("code", "1000") // Specifically find liquidity destinations
      .eq("is_active", true)
  ]);

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6 animate-in fade-in duration-700">
      
      {/* PROFESSIONAL MASTER HEADER */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link href={`/${locale}/invoicing/list`} className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">
            <ArrowLeft size={12} className="mr-2" /> Return to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-xl text-white">
              <Landmark size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Payment Registry</h1>
              <p className="text-slate-500 font-medium mt-1 uppercase text-[11px] tracking-widest leading-none ml-1">
                Autonomous Settlement Handshake for <span className="text-emerald-600 font-bold">{activeBusinessName}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-950 px-5 py-3 rounded-2xl border border-white/10 shadow-lg">
           <ShieldCheck size={16} className="text-emerald-400" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Protocol Type</span>
             <span className="text-xs font-bold text-emerald-400 uppercase mt-1">Ledger Direct Sync</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Terminal View */}
        <div className="lg:col-span-2">
            <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Record Arrival</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sovereign Reconciliation Mode</p>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none px-4 py-1 font-black text-[10px] uppercase rounded-full">
                        {invoicesRes.data?.length || 0} Documents Ready
                    </Badge>
                </div>
                
                <PaymentRegistry 
                  isOpen={true} 
                  onClose={() => {}}
                  unpaidInvoices={invoicesRes.data || []}
                  bankAccounts={accountsRes.data || []}
                  businessId={bizId}
                  businessName={activeBusinessName}
                />
            </div>
        </div>

        {/* Forensic & Audit Side-Card */}
        <div className="space-y-6">
           <div className="p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
              <History size={80} className="absolute -right-4 -bottom-4 text-white opacity-5 group-hover:rotate-12 transition-transform duration-500" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Activity size={16} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Forensic Audit</span>
                </div>
                <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                    Settlements recorded here trigger an automated handshake between Account <span className="text-white font-bold underline underline-offset-4 decoration-blue-500">1210</span> (Receivables) and your chosen liquidity asset.
                </p>
                <div className="pt-6 border-t border-white/10 flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Mathematical Parity Verified
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* SYSTEM FOOTER */}
      <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center opacity-30">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Sovereign Ledger System Protocol v10.2</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Multi-Tenant • Cloud-Anchored</p>
      </div>
    </div>
  );
}