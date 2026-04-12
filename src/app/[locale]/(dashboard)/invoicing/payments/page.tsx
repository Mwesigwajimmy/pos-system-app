import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PaymentRegistry from "@/components/invoicing/PaymentRegistry";
import { Landmark, ArrowLeft, CheckCircle2, History } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settlement Registry | Sovereign Ledger",
  description: "Autonomous invoice reconciliation and ledger handshake terminal.",
};

export default async function PaymentsPage({ params: { locale } }: { params: { locale: string } }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. SECURE ACCESS CHECK
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect(`/${locale}/dashboard`);

  // 2. FORENSIC QUERIES: Fetch everything needed for a zero-assumption handshake
  
  // A. Get Unpaid Invoices (Target for Settlement)
  const { data: unpaidInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, customer_name, balance_due, currency, total")
    .eq("business_id", profile.business_id)
    .gt("balance_due", 0) // Only show debt
    .order("due_date", { ascending: true });

  // B. Get Bank/Cash Accounts (Recipient for Settlement)
  // We strictly look for Account Code 1000 as per your verified ledger structure
  const { data: bankAccounts } = await supabase
    .from("accounting_accounts")
    .select("id, name, code")
    .eq("business_id", profile.business_id)
    .eq("code", "1000") 
    .eq("is_active", true);

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link href={`/${locale}/invoicing/all-invoices`} className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">
            <ArrowLeft size={12} className="mr-2" /> Return to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-xl text-white">
              <Landmark size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Payment Registry</h1>
              <p className="text-slate-500 font-medium mt-1">Record arrivals and <span className="text-emerald-600 font-bold">Synchronize Ledger</span> settlements.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Terminal View */}
        <div className="lg:col-span-2">
            <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Settlement Handshake</h3>
                    <Badge className="bg-emerald-50 text-emerald-700 border-none px-3 font-black text-[10px] uppercase">
                        {unpaidInvoices?.length || 0} Pending Settlements
                    </Badge>
                </div>
                
                {/* We render the terminal directly on the page here */}
                <PaymentRegistry 
                  isOpen={true} 
                  onClose={() => {}} // No close needed on direct page
                  unpaidInvoices={unpaidInvoices || []}
                  bankAccounts={bankAccounts || []}
                  businessId={profile.business_id}
                />
            </div>
        </div>

        {/* Predictive Side-Card */}
        <div className="space-y-6">
           <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                 <History size={16} className="text-blue-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Forensic Check</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                 Settlements recorded here are balanced against Account <span className="text-white font-bold">1210</span> (Receivables). 
                 Mathematical parity is calculated by the database kernel upon commitment.
              </p>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
                 <CheckCircle2 size={12} className="text-emerald-500" /> System Link Secured
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}