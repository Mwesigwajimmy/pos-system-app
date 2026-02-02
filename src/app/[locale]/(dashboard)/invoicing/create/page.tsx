import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import CreateInvoiceClient from "@/components/invoicing/CreateInvoiceClient";
import { ShieldCheck, ArrowLeft, Landmark } from "lucide-react";
import Link from "next/link";

// --- Enterprise Metadata ---
export const metadata: Metadata = {
  title: "New Commercial Invoice | Enterprise ERP",
  description: "Secure terminal for generating ledger-linked financial documents.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function CreateInvoicePage({ params: { locale } }: PageProps) {
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

  // The "True ID" is the business_id (UUID) used by the Ledger Orchestrator.
  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (profileError || !activeTenantId) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center">
        <div className="bg-red-50 border-2 border-dashed border-red-200 p-12 rounded-3xl max-w-md shadow-2xl shadow-red-500/10">
          <Landmark className="h-16 w-16 text-red-600 mx-auto mb-6 animate-bounce" />
          <h2 className="text-2xl font-black text-red-900 tracking-tighter uppercase">Entity Unlinked</h2>
          <p className="text-red-700 mt-4 font-medium leading-relaxed">
            Your profile is not currently associated with a valid Business Unit. 
            Financial recognition is disabled for this session.
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
    <div className="container mx-auto py-10 max-w-6xl px-6">
      {/* Dynamic Header Path */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link 
            href={`/${locale}/invoicing/all-invoices`}
            className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={12} className="mr-2" /> Back to Registry
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
              <ShieldCheck size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                Create Invoice
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                Hard-linking operational sales to the <span className="text-blue-600 font-bold">General Ledger</span>.
              </p>
            </div>
          </div>
        </div>

        {/* System Health Badge */}
        <div className="hidden lg:flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800">
           <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
               Ledger Bridge
             </span>
             <span className="text-xs font-bold text-emerald-600/80">
               1:1 Autonomy Active
             </span>
           </div>
        </div>
      </div>
      
      {/* Primary Invoicing Logic Component */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl" />
        <CreateInvoiceClient 
          tenantId={activeTenantId} 
          userId={user.id}
          locale={locale} 
        />
      </div>

      {/* Security Compliance Footer */}
      <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-300">
        <p className="text-[10px] font-bold uppercase tracking-widest">
          GADS Standard Compliance: Section 12-B Ledger Link
        </p>
        <p className="text-[10px] font-medium italic">
          DocType: 8400-INV | Session-ID: {user.id.substring(0,8)}
        </p>
      </div>
    </div>
  );
}