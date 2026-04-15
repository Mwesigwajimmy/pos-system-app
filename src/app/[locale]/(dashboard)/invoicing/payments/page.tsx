import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PaymentRegistry from "@/components/invoicing/PaymentRegistry";
import { 
    Landmark, ArrowLeft, CheckCircle2, History, ShieldCheck,
    Activity, Database, Fingerprint, ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Settlement Registry | Sovereign Ledger",
  description: "Enterprise autonomous settlement handshake and ledger synchronization terminal.",
};

interface PageProps { params: Promise<{ locale: string }>; }

export default async function PaymentsPage({ params }: PageProps) {
  // 1. NEXT.JS 15 COMPATIBILITY
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 2. SECURE AUTHENTICATION HANDSHAKE
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) redirect(`/${locale}/auth/login`);

  // 3. SOVEREIGN IDENTITY RESOLUTION (System RPC)
  // We use the exact RPC found in BusinessContext.tsx to fetch the business profile
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_business_profile');

  // Logic: The RPC returns an array. We take the first result as the active anchor.
  const profile = rpcData && rpcData.length > 0 ? rpcData[0] : null;

  // Resolved values based on the BusinessProfile interface in your context
  const bizId = profile?.business_id;
  const activeBusinessName = profile?.full_name || "Sovereign Unit";

  // 4. SECURITY GATEKEEPER
  // If the RPC returns no business_id, the identity is locked.
  if (!bizId || rpcError) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="bg-rose-50 p-12 rounded-[40px] border-2 border-dashed border-rose-200 max-w-md shadow-2xl shadow-rose-500/10">
          <ShieldAlert className="h-16 w-16 text-rose-600 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-rose-900 uppercase tracking-tighter leading-none">Identity Lock</h2>
          <p className="text-rose-700 mt-4 font-medium leading-relaxed uppercase text-[10px] tracking-widest">
            Verification failed. Profile is not anchored via Sovereign RPC.
          </p>
          <Link href={`/${locale}/dashboard`} className="mt-8 inline-block px-10 h-12 bg-rose-600 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:bg-rose-700 transition-all active:scale-95">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  // 5. LEDGER DATA ACQUISITION
  const [invoicesRes, accountsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, customer_name, balance_due, currency, total")
      .eq("business_id", bizId)
      .gt("balance_due", 0) 
      .order("issue_date", { ascending: false }),
      
    supabase
      .from("accounting_accounts")
      .select("id, name, code, currency")
      .eq("business_id", bizId)
      .eq("code", "1000") // Discovery of Bank/Cash clearing pools
      .eq("is_active", true)
  ]);

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6 animate-in fade-in duration-1000">
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
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Protocol Status</span>
             <span className="text-xs font-bold text-emerald-400 uppercase mt-1 leading-none">Ledger Pulse Active</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm relative overflow-hidden">
                <Database className="absolute -right-4 top-4 text-slate-50 w-32 h-32 rotate-12" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8 px-2">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Record Arrival</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sovereign Reconciliation Terminal</p>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none px-4 py-1.5 font-black text-[10px] uppercase rounded-full">
                            {invoicesRes.data?.length || 0} Open Documents
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
        </div>

        <div className="space-y-6">
           <div className="p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
              <History size={80} className="absolute -right-4 -bottom-4 text-white opacity-5 group-hover:rotate-12 transition-all duration-700" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2">
                    <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg">
                        <Activity size={18} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Forensic Audit</span>
                </div>
                <div className="space-y-4">
                    <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                        Settlements recorded here trigger an automated handshake between Account <span className="text-white font-bold underline underline-offset-8 decoration-blue-500">1210</span> (Receivables) and your chosen liquidity asset.
                    </p>
                </div>
                <div className="pt-6 border-t border-white/10 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Mathematical Parity Verified
                </div>
              </div>
           </div>

           <div className="p-6 bg-white border border-slate-200 rounded-[32px] shadow-sm flex items-center gap-4 group hover:border-blue-500 transition-colors">
              <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                <Fingerprint className="text-slate-400 group-hover:text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">System ID Reference</p>
                <p className="text-[10px] font-mono font-bold text-slate-900 mt-1 uppercase">
                    {String(bizId).substring(0,18)}
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}