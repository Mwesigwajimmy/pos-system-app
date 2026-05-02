import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import QuotationExecutionCenter from "@/components/invoicing/QuotationExecutionCenter";
import { ShieldCheck, ArrowLeft, Plus, History, Activity } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Fiscal Authorization | Enterprise Ledger",
  description: "Review, authorize, and transition commercial quotations into fiscal tax invoices.",
};

interface PageProps {
  params: { locale: string };
}

export default async function QuotationExecutionPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id, full_name")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  if (!activeTenantId) redirect(`/${locale}/dashboard`);

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, currency_code")
    .eq("id", activeTenantId)
    .single();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1450px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-100 pb-12">
          <div className="space-y-4">
            <Link 
              href={`/${locale}/invoicing`} 
              className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={14} className="mr-2" /> Return to Dashboard
            </Link>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <Link 
                    href={`/${locale}/invoicing/estimates`} 
                    className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-blue-600 transition-all bg-slate-50 px-4 py-2 rounded-xl border border-slate-100"
                >
                    <Plus size={14} className="mr-2" /> New Draft
                </Link>
                <Link 
                    href={`/${locale}/invoicing/estimates/history`} 
                    className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-blue-600 transition-all bg-slate-50 px-4 py-2 rounded-xl border border-slate-100"
                >
                    <History size={14} className="mr-2" /> Registry history
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-50/50 px-8 py-4 rounded-[2rem] border border-slate-100 shadow-sm">
             <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                <ShieldCheck size={22} />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Identity</span>
               <span className="text-sm font-bold text-slate-800 uppercase leading-tight">
                  {tenant?.name || "Verified Organization"}
               </span>
               <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Ledger Currency: {tenant?.currency_code}
                  </span>
               </div>
             </div>
          </div>
        </header>

        <main className="min-h-[600px]">
          <QuotationExecutionCenter />
        </main>

        <footer className="pt-16 pb-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
            <Activity size={14} /> Authorization protocol active
          </div>
          
          <div className="flex items-center gap-8">
             <div className="flex flex-col text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Authenticated User</span>
                <span className="text-xs font-bold text-slate-700 uppercase">{profile?.full_name}</span>
             </div>
             <div className="h-8 w-px bg-slate-200" />
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Node Ref: {activeTenantId.slice(0,18).toUpperCase()}
             </div>
          </div>
        </footer>
      </div>
    </div>
  );
}