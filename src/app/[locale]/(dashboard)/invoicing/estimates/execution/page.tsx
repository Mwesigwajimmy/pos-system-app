import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import QuotationExecutionCenter from "@/components/invoicing/QuotationExecutionCenter";
import { Gavel, Landmark, ShieldCheck, ArrowLeft, Plus, History, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Quotation Management | Business Manager",
  description: "Review, approve, and convert quotations into active invoices and ledger entries.",
};

interface PageProps {
  params: { locale: string };
}

export default async function QuotationExecutionPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. SESSION AUTHENTICATION (Logic Intact)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id, full_name")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  if (!activeTenantId) redirect(`/${locale}/dashboard`);

  // 2. ORGANIZATION CONTEXT (Logic Intact)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, currency_code")
    .eq("id", activeTenantId)
    .single();

  return (
    <div className="flex-1 space-y-10 p-6 md:p-10 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      
      {/* --- PROFESSIONAL HEADER --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-200 pb-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link 
                href={`/${locale}/invoicing/estimates`} 
                className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
            >
                <Plus size={14} className="mr-1.5" /> Create Quotation
            </Link>
            <div className="w-[1px] h-3 bg-slate-300" />
            <Link 
                href={`/${locale}/invoicing/estimates/history`} 
                className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
            >
                <History size={14} className="mr-1.5" /> View History
            </Link>
          </div>

          <div className="flex items-center gap-5">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-600 shadow-sm">
              <Gavel size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quotation Approvals</h1>
                <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/50 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wide">
                  Processing Hub
                </Badge>
              </div>
              <p className="text-slate-500 font-medium text-sm mt-1">
                Authorize commercial estimates and generate official tax invoices.
              </p>
            </div>
          </div>
        </div>
        
        {/* --- ORGANIZATION IDENTITY --- */}
        <div className="flex items-center gap-6 bg-white px-8 py-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
           <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <ShieldCheck size={24} />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Active</span>
             <span className="text-base font-bold text-slate-900 leading-tight">
                {tenant?.name || "Business Entity"}
             </span>
             <div className="flex items-center gap-1.5 mt-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">
                    Reporting: {tenant?.currency_code}
                </span>
             </div>
           </div>
        </div>
      </div>

      {/* --- CONTENT CENTER --- */}
      <div className="mx-auto max-w-[1600px]">
        {/* Component logic remains untouched */}
        <QuotationExecutionCenter />
      </div>

      {/* --- COMPLIANCE FOOTER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center pt-10 border-t border-slate-100 gap-6">
          <div className="px-5 py-2 bg-slate-100/50 border border-slate-200 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Audit Reference: {activeTenantId.slice(0,12).toUpperCase()}
            </span>
          </div>
          
          <div className="flex gap-8 items-center">
             <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authorized User</span>
                <span className="text-sm font-bold text-slate-700">{profile?.full_name}</span>
             </div>
             <div className="h-8 w-px bg-slate-200" />
             <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-[9px] px-3 border-none">
                    System Verified
                </Badge>
             </div>
          </div>
      </div>
    </div>
  );
}