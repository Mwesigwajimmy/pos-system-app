import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import EstimateTerminal from "@/components/invoicing/EstimateTerminal";
import { FileText, ArrowLeft, ShieldCheck, Landmark, Globe } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Estimate Terminal | BBU1 Sovereign Ledger",
  description: "Enterprise specification and pre-fiscal commercial protocol management with autonomous sequencing.",
};

interface PageProps { params: { locale: string }; }

export default async function EstimatesPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. NEURAL IDENTITY HANDSHAKE
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // Fetch verified profile context
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  if (!activeTenantId) redirect(`/${locale}/dashboard`);

  // 2. ENTERPRISE DATA DISCOVERY (Parallel Execution for Speed)
  const [customersRes, businessRes, currencyRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, address, email")
      .eq("business_id", activeTenantId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("tenants")
      .select("name, email, phone, tin, address, metadata")
      .eq("id", activeTenantId)
      .single(),
    supabase
      .from("units_of_measure")
      .select("abbreviation, name, symbol")
      .or('name.ilike.%shilling%,name.ilike.%dollar%,name.ilike.%euro%,name.ilike.%pound%')
  ]);

  // 3. STATIONERY PROTOCOL PREPARATION
  // Maps raw database metadata to the professional stationery object
  const businessInfo = {
    name: businessRes.data?.name || "BBU1 Enterprise",
    email: businessRes.data?.email || "",
    phone: businessRes.data?.phone || "",
    tin: businessRes.data?.tin || "TIN-PENDING",
    address: businessRes.data?.address || "Headquarters",
    plot: businessRes.data?.metadata?.plot_number || businessRes.data?.metadata?.plot || "N/A",
    pobox: businessRes.data?.metadata?.po_box || businessRes.data?.metadata?.pobox || "N/A"
  };

  // 4. CURRENCY REGISTRY MAPPING
  const currencies = (currencyRes.data || []).map(c => ({
    code: c.abbreviation,
    name: c.name,
    symbol: c.symbol || ""
  }));

  // Fallback for global compatibility
  const defaultCurrencies = currencies.length > 0 ? currencies : [
    { code: 'UGX', name: 'Uganda Shilling', symbol: 'Shs' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' }
  ];

  return (
    <div className="flex-1 space-y-10 p-6 md:p-12 bg-slate-50/30 min-h-screen animate-in fade-in duration-1000">
      
      {/* PROFESSIONAL COMMAND HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-12">
        <div className="space-y-5">
          <Link 
            href={`/${locale}/invoicing/all-invoices`} 
            className="group flex items-center text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] hover:text-blue-600 transition-all"
          >
            <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-2 transition-transform" /> 
            Back to Invoicing Ledger
          </Link>
          <div className="flex items-center gap-6">
            <div className="bg-slate-900 p-5 rounded-[2rem] shadow-2xl text-white transform -rotate-3 hover:rotate-0 transition-transform duration-500">
              <FileText size={40} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Estimate Terminal</h1>
              <p className="text-slate-500 font-bold text-sm mt-2 uppercase tracking-[0.3em] flex items-center gap-3">
                <Landmark size={16} className="text-blue-600"/> 
                Commercial Specification & Protocol Node
              </p>
            </div>
          </div>
        </div>
        
        {/* COMPLIANCE STATUS BADGE */}
        <div className="flex items-center gap-6 bg-white px-10 py-5 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-2 opacity-5">
              <Globe size={40} />
           </div>
           <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center shadow-inner group-hover:bg-emerald-50 transition-colors">
              <ShieldCheck size={24} className="text-blue-600 group-hover:text-emerald-600 transition-colors" />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocol Registry</span>
             <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">Verified Sovereign Session</span>
           </div>
        </div>
      </div>

      {/* THE MASTER TERMINAL MOUNT */}
      <div className="mx-auto max-w-[1550px]">
        <EstimateTerminal 
            tenantId={activeTenantId} 
            customers={customersRes.data || []} 
            currencies={defaultCurrencies}
            businessInfo={businessInfo}
        />
      </div>

      {/* FOOTER AUDIT TAG */}
      <div className="text-center pt-16 opacity-30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
            BBU1 SOVEREIGN ENGINE • LEDGER IDENTITY: {activeTenantId.slice(0,18).toUpperCase()}
          </p>
      </div>
    </div>
  );
}