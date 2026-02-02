import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import DebitNotesTable from "@/components/invoicing/DebitNotesTable";
import { ShieldCheck, TrendingUp, Landmark, ArrowLeft, History } from "lucide-react";
import Link from "next/link";

// --- Enterprise Metadata ---
export const metadata: Metadata = {
  title: "Debit Adjustments | Enterprise Ledger",
  description: "Secure terminal for managing supplier debit memos and payables adjustments.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function DebitNotesPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. SECURE AUTHENTICATION
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  // 2. SOVEREIGN CONTEXT RESOLUTION
  // We fetch both columns to solve the desync found in the 70-invoice audit.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  // Define the True ID for the Ledger Interconnect (Matches our SQL Orchestrator)
  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (profileError || !activeTenantId) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center">
        <div className="bg-red-50 border-2 border-dashed border-red-200 p-12 rounded-3xl max-w-md shadow-xl shadow-red-500/10">
          <Landmark className="h-16 w-16 text-red-600 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-red-900 tracking-tighter uppercase text-balance">
            Entity Link Interrupted
          </h2>
          <p className="text-red-700 mt-4 font-medium leading-relaxed">
            Your profile is not currently mapped to an active Business Unit. 
            Accounts Payable adjustments are locked for security.
          </p>
          <Link href={`/${locale}/dashboard`} className="mt-8 inline-block text-sm font-bold text-red-900 underline underline-offset-4">
            Return to Command Center
          </Link>
        </div>
      </div>
    );
  }

  // 3. RENDER ENTERPRISE TERMINAL
  return (
    <div className="container mx-auto py-10 max-w-7xl px-6">
      {/* Dynamic Enterprise Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link 
            href={`/${locale}/invoicing/all-invoices`}
            className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft size={12} className="mr-2" /> Back to Registry
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
              <TrendingUp size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                Debit Notes
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                Hard-linked tracking of <span className="text-emerald-600 font-bold">Supplier adjustments</span> and payables reconciliation.
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">
               Ledger Bridge
             </span>
             <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
               <ShieldCheck size={12} /> 1:1 AP Interconnect Active
             </span>
           </div>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
        <DebitNotesTable tenantId={activeTenantId} locale={locale} />
      </div>

      {/* Security Compliance Footer */}
      <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-300">
        <div className="flex items-center gap-2">
            <History size={12} />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              GADS Compliance: Section 19-C Payables Recognition
            </p>
        </div>
        <p className="text-[10px] font-medium italic">
          DocType: 8400-DBN | Origin: {activeTenantId.substring(0,8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}