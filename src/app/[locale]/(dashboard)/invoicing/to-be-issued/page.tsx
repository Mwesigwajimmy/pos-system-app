import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import InvoicesToBeIssuedTable from "@/components/invoicing/InvoicesToBeIssuedTable";
import { ShieldCheck, Landmark, Clock, ArrowLeft, History } from "lucide-react";
import Link from "next/link";

// --- Enterprise Metadata ---
export const metadata: Metadata = {
  title: "Issuance Queue | Enterprise Workflow",
  description: "Secure gateway for document verification and autonomous ledger synchronization.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicesToBeIssuedPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. SECURE AUTHENTICATION
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  // 2. SOVEREIGN CONTEXT RESOLUTION
  // We fetch both columns to bridge the desync discovered in our historical audit.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  // The 'activeTenantId' ensures the queue is strictly isolated to the user's entity.
  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (profileError || !activeTenantId) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center">
        <div className="bg-red-50 border-2 border-dashed border-red-200 p-12 rounded-3xl max-w-md shadow-xl shadow-red-500/10">
          <Landmark className="h-16 w-16 text-red-600 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-red-900 tracking-tighter uppercase">Scope Mismatch</h2>
          <p className="text-red-700 mt-4 font-medium leading-relaxed">
            Your profile is not currently mapped to an active Business Unit. 
            The Issuance Queue is restricted for this session.
          </p>
          <Link href={`/${locale}/dashboard`} className="mt-8 inline-block text-sm font-bold text-red-900 underline underline-offset-4">
            Return to Command Center
          </Link>
        </div>
      </div>
    );
  }

  // 3. SERVER-SIDE QUEUE AUDIT (Performance Pre-fetch)
  // We count the items awaiting ledger sync to display in the header.
  const { count: pendingCount } = await supabase
    .from("invoices")
    .select("*", { count: 'exact', head: true })
    .eq("business_id", activeTenantId)
    .in("status", ["DRAFT", "PENDING_APPROVAL", "READY_TO_ISSUE"])
    .is("transaction_id", null); // ENTERPRISE GUARD: Only show unposted items.

  // 4. RENDER ENTERPRISE TERMINAL
  return (
    <div className="container mx-auto py-10 max-w-7xl px-6">
      {/* Dynamic Enterprise Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link 
            href={`/${locale}/invoicing/all-invoices`}
            className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={12} className="mr-2" /> Back to Registry
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
              <Clock size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                Issuance Queue
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                There are <span className="text-amber-600 font-bold">{pendingCount || 0}</span> legal documents awaiting <span className="text-blue-600 font-bold">Ledger Synchronization</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Real-time System Status Badge */}
        <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">
               Engine Status
             </span>
             <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
               <ShieldCheck size={12} /> 1:1 Autonomy Active
             </span>
           </div>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
        <InvoicesToBeIssuedTable 
          tenantId={activeTenantId} 
          locale={locale} 
        />
      </div>

      {/* Security & Compliance Footer */}
      <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-300">
        <div className="flex items-center gap-2">
            <History size={12} />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Audit Integrity: Section 8-B Issuance Workflow
            </p>
        </div>
        <p className="text-[10px] font-medium italic uppercase tracking-wider">
          Entity Scope: {activeTenantId.substring(0,8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}