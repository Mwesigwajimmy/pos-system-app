import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import CreateInvoiceClient from "@/components/invoicing/CreateInvoiceClient";
import { ArrowLeft, Landmark, ShieldCheck, Activity } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Invoice Issuance | Enterprise Ledger",
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (profileError || !activeTenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-12 bg-slate-50">
        <div className="bg-white border border-slate-200 p-12 rounded-[2rem] max-w-md shadow-xl text-center space-y-6">
          <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Landmark size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Entity Link Required</h2>
            <p className="text-sm text-slate-500 font-medium">Your profile is not currently associated with a verified Business Unit. Access restricted.</p>
          </div>
          <Button variant="outline" className="w-full h-12 rounded-xl font-bold" asChild>
            <Link href={`/${locale}/dashboard`}>Return to Command Center</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-100 pb-8">
        <div className="space-y-4">
          <Link 
            href={`/${locale}/invoicing/all-invoices`}
            className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={14} className="mr-2" /> Return to Financial Registry
          </Link>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
           <div className="h-2 w-2 bg-emerald-500 rounded-full" />
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none">
               Ledger Bridge
             </span>
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
               Active Synchronisation
             </span>
           </div>
        </div>
      </header>
      
      <main className="min-h-[600px]">
        <CreateInvoiceClient 
          tenantId={activeTenantId} 
          userId={user.id}
          locale={locale} 
        />
      </main>

      <footer className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-30">
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
          <ShieldCheck size={14} /> Regulatory Framework Compliance 12-B
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <Activity size={12} /> Transaction Session: {user.id.substring(0,8).toUpperCase()}
        </div>
      </footer>
    </div>
  );
}