import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import QuotationManager from "@/components/invoicing/QuotationManager";
import { FileDigit, Landmark, ShieldCheck, ArrowLeft, Plus, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Quotation History | Business Manager",
  description: "View and manage historical commercial quotations, approvals, and document statuses.",
};

interface PageProps {
  params: { locale: string };
}

export default async function QuotationHistoryPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. IDENTITY & SECURITY HANDSHAKE (Logic Intact)
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
    <div className="flex-1 space-y-10 p-6 md:p-10 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      
      {/* --- PROFESSIONAL HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-200 pb-10">
        <div className="space-y-6">
          <Link 
            href={`/${locale}/invoicing`} 
            className="group flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-5">
            <div className="bg-slate-900 p-4 rounded-xl shadow-sm text-white">
              <ClipboardList size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quotation History</h1>
                <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/50 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wide">
                  Record Ledger
                </Badge>
              </div>
              <p className="text-slate-500 font-medium text-sm mt-1">
                Review historical estimates, track approval workflows, and manage conversions.
              </p>
            </div>
          </div>
        </div>
        
        {/* --- ACTIONS & IDENTITY --- */}
        <div className="flex items-center gap-6">
            <Link href={`/${locale}/invoicing/estimates`}>
                <button className="h-11 px-6 bg-[#2557D6] hover:bg-[#1e44a8] text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-95">
                    <Plus size={18} /> New Quotation
                </button>
            </Link>
            
            <div className="hidden lg:flex items-center gap-4 bg-white px-6 py-3.5 rounded-xl border border-slate-200 shadow-sm">
               <ShieldCheck size={20} className="text-emerald-600" />
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Account Verified</span>
                 <span className="text-sm font-bold text-slate-700 mt-1">
                    {tenant?.name || "Business Entity"}
                 </span>
               </div>
            </div>
        </div>
      </div>

      {/* --- CONTENT CENTER --- */}
      <div className="mx-auto max-w-[1650px]">
        {/* Master Component handles the data table and filters */}
        <QuotationManager />
      </div>

      {/* COMPLIANCE FOOTER */}
      <div className="flex justify-center items-center gap-4 pt-10 opacity-30">
          <div className="h-[1px] w-12 bg-slate-400" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Financial Management System • Ledger Version 5.0
          </p>
          <div className="h-[1px] w-12 bg-slate-400" />
      </div>
    </div>
  );
}