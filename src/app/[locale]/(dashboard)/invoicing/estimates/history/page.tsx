import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import QuotationManager from "@/components/invoicing/QuotationManager";
import { FileDigit, Landmark, ShieldCheck, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Quotation Ledger | BBU1 Sovereign Hub",
  description: "Enterprise commercial protocol management, approval workflows, and fiscal conversion node.",
};

interface PageProps {
  params: { locale: string };
}

export default async function QuotationHistoryPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. IDENTITY & SECURITY HANDSHAKE
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
    <div className="flex-1 space-y-10 p-6 md:p-12 bg-slate-50/30 min-h-screen animate-in fade-in duration-1000">
      
      {/* --- PROFESSIONAL COMMAND HEADER --- */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-slate-200 pb-12">
        <div className="space-y-5">
          <Link 
            href={`/${locale}/invoicing`} 
            className="group flex items-center text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] hover:text-blue-600 transition-all"
          >
            <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
            Back to Console
          </Link>
          <div className="flex items-center gap-6">
            <div className="bg-slate-900 p-5 rounded-[2rem] shadow-2xl text-white transform rotate-3">
              <FileDigit size={40} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Quotation Ledger</h1>
                <Badge variant="outline" className="border-blue-200 text-blue-600 font-black px-3 py-1 text-[10px] tracking-widest uppercase">
                  v5.0 Secure
                </Badge>
              </div>
              <p className="text-slate-500 font-bold text-sm mt-2 uppercase tracking-[0.2em] flex items-center gap-3">
                <Landmark size={16} className="text-blue-600"/> 
                Commercial Protocol Review & Approval Node
              </p>
            </div>
          </div>
        </div>
        
        {/* --- ACTIONS --- */}
        <div className="flex items-center gap-6">
            <Link href={`/${locale}/invoicing/estimates`}>
                <button className="h-16 px-10 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-2xl hover:bg-slate-900 transition-all flex items-center gap-3 active:scale-95">
                    <Plus size={20} strokeWidth={3}/> Create New Quote
                </button>
            </Link>
            
            <div className="hidden lg:flex items-center gap-6 bg-white px-10 py-5 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <ShieldCheck size={28} className="text-emerald-600" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Identity Verified</span>
                 <span className="text-sm font-black text-slate-800 uppercase tracking-tighter tabular-nums">
                    {tenant?.name}
                 </span>
               </div>
            </div>
        </div>
      </div>

      {/* --- MASTER COMPONENT --- */}
      <div className="mx-auto max-w-[1700px]">
        <QuotationManager />
      </div>
    </div>
  );
}