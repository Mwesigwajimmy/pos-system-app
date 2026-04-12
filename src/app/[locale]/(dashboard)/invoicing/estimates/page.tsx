import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import EstimateTerminal from "@/components/invoicing/EstimateTerminal";
import { FileText, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Estimate Terminal | Sovereign Ledger",
  description: "Pre-fiscal document generation and quotation management.",
};

interface PageProps { params: { locale: string }; }

export default async function EstimatesPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. IDENTITY HANDSHAKE
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  if (!activeTenantId) redirect(`/${locale}/dashboard`);

  // 2. DATA DISCOVERY: Fetch active customers for the dropdown
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("business_id", activeTenantId)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6">
      {/* PROFESSIONAL HEADER */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link href={`/${locale}/invoicing/all-invoices`} className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">
            <ArrowLeft size={12} className="mr-2" /> Back to History
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-3 rounded-2xl shadow-xl text-white">
              <FileText size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Estimate Terminal</h1>
              <p className="text-slate-500 font-medium mt-1">Issue and manage <span className="text-blue-600 font-bold">Proforma Protocols</span> before fiscalization.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
           <ShieldCheck size={16} className="text-blue-600" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Protocol Type</span>
             <span className="text-xs font-bold text-blue-700 uppercase">Non-Fiscal Draft</span>
           </div>
        </div>
      </div>

      {/* RENDER THE TERMINAL */}
      <div className="max-w-5xl">
        <EstimateTerminal 
            tenantId={activeTenantId} 
            userId={user.id} 
            customers={customers || []} 
        />
      </div>
    </div>
  );
}