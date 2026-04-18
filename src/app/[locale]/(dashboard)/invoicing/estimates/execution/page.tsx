import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import QuotationExecutionCenter from "@/components/invoicing/QuotationExecutionCenter";
import { Gavel, Landmark, ShieldCheck, ArrowLeft, Plus, History } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Quotation Execution Terminal | BBU1 Sovereign Hub",
  description: "Enterprise decision node for fiscalization, commercial approval, and instant ledger settlement.",
};

interface PageProps {
  params: { locale: string };
}

export default async function QuotationExecutionPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. NEURAL IDENTITY HANDSHAKE
  // Verify the commander session before rendering sensitive fiscal decision tools
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id, full_name")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  if (!activeTenantId) redirect(`/${locale}/dashboard`);

  // 2. SOVEREIGN CONTEXT DISCOVERY
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, currency_code")
    .eq("id", activeTenantId)
    .single();

  return (
    <div className="flex-1 space-y-10 p-6 md:p-12 bg-slate-50/40 min-h-screen animate-in fade-in slide-in-from-right-4 duration-1000">
      
      {/* --- PROFESSIONAL COMMAND HEADER --- */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-slate-200 pb-12">
        <div className="space-y-5">
          <div className="flex gap-4">
            <Link 
                href={`/${locale}/invoicing/estimates`} 
                className="group flex items-center text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] hover:text-blue-600 transition-all"
            >
                <Plus size={14} className="mr-2" /> New Spec
            </Link>
            <div className="w-[1px] h-3 bg-slate-200" />
            <Link 
                href={`/${locale}/invoicing/estimates/history`} 
                className="group flex items-center text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] hover:text-blue-600 transition-all"
            >
                <History size={14} className="mr-2" /> Audit Ledger
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-blue-600 p-5 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(37,99,235,0.5)] text-white transform hover:scale-105 transition-transform duration-500">
              <Gavel size={40} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Execution Terminal</h1>
                <Badge className="bg-slate-900 text-blue-400 font-black px-4 py-1.5 text-[10px] tracking-widest uppercase rounded-full shadow-lg">
                  Protocol v5.2
                </Badge>
              </div>
              <p className="text-slate-500 font-bold text-sm mt-2 uppercase tracking-[0.3em] flex items-center gap-3">
                <Landmark size={16} className="text-blue-600"/> 
                Commercial Decision & Fiscalization Gateway
              </p>
            </div>
          </div>
        </div>
        
        {/* --- SOVEREIGN IDENTITY BADGE --- */}
        <div className="flex items-center gap-8 bg-white px-10 py-6 rounded-[3rem] border border-slate-200 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldCheck size={60} />
           </div>
           <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-inner">
              <ShieldCheck size={32} className="text-emerald-600" />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Sovereign Node</span>
             <span className="text-lg font-black text-slate-900 uppercase tracking-tighter tabular-nums leading-none">
                {tenant?.name || "BBU1 Entity"}
             </span>
             <span className="text-[9px] font-bold text-emerald-600 uppercase mt-1 tracking-widest flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                Ledger Linked: {tenant?.currency_code}
             </span>
           </div>
        </div>
      </div>

      {/* --- THE MASTER EXECUTION CENTER --- */}
      <div className="mx-auto max-w-[1750px]">
        {/* This component handles the Approval, Rejection, and Fiscalization Logic */}
        <QuotationExecutionCenter />
      </div>

      {/* --- FOOTER COMPLIANCE & IDENTITY --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center pt-12 gap-6">
          <div className="flex items-center gap-4 px-6 py-2 bg-slate-100 rounded-full">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
                BBU1 ENGINE • PROTOCOL SESSION: {activeTenantId.slice(0,18).toUpperCase()}
            </span>
          </div>
          <div className="flex gap-6 items-center">
             <div className="flex flex-col text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Commander Identity</span>
                <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">{profile?.full_name}</span>
             </div>
             <div className="h-10 w-[1px] bg-slate-200" />
             <div className="text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fiscal Status</span>
                <Badge className="bg-emerald-500 text-white font-black text-[9px] px-3">POST-AUDIT ACTIVE</Badge>
             </div>
          </div>
      </div>
    </div>
  );
}