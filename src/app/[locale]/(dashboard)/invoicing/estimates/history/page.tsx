import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import QuotationManager from "@/components/invoicing/QuotationManager";
import { Landmark, ShieldCheck, ArrowLeft, Activity, History } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Quotation Registry | Enterprise Ledger",
  description: "Management of historical commercial quotations, approvals, and document lifecycle.",
};

interface PageProps {
  params: { locale: string };
}

export default async function QuotationHistoryPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  if (!activeTenantId) redirect(`/${locale}/dashboard`);

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
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
              <ArrowLeft size={14} className="mr-2" /> Return to Command Center
            </Link>
            
            <div className="flex items-center gap-6">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                <History size={20} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol:</span>
                <Badge variant="outline" className="rounded-full px-4 py-1 border-blue-100 bg-blue-50/50 text-blue-600 font-bold text-[9px] uppercase tracking-widest">
                  Registry Ledger Ledger 12-A
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-50/50 px-8 py-4 rounded-[2rem] border border-slate-100 shadow-sm">
             <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                <ShieldCheck size={22} />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity Verified</span>
               <span className="text-sm font-bold text-slate-800 uppercase leading-tight">
                  {tenant?.name || "Standard Organization"}
               </span>
               <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Session Synchronized</span>
               </div>
             </div>
          </div>
        </header>

        <main className="min-h-[600px]">
          <QuotationManager />
        </main>

        <footer className="pt-16 pb-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
            <Activity size={14} /> Database Connectivity Active
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            System Node: QUO-REG-v5.0 | ID: {activeTenantId.slice(0,18).toUpperCase()}
          </div>
        </footer>
      </div>
    </div>
  );
}