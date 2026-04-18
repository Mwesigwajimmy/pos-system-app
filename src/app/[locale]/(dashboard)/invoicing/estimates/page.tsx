import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import EstimateTerminal from "@/components/invoicing/EstimateTerminal";
import { FileText, ArrowLeft, ShieldCheck, Landmark, Globe } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Create Quotation | Business Manager",
  description: "Generate commercial estimates and technical specifications for clients.",
};

interface PageProps { params: { locale: string }; }

export default async function EstimatesPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. USER SESSION AUTHENTICATION (Logic Intact)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  if (!activeTenantId) redirect(`/${locale}/dashboard`);

  // 2. DATA DISCOVERY (Logic Intact)
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

  // 3. STATIONERY MAPPING (Logic Intact)
  const businessInfo = {
    name: businessRes.data?.name || "Business Enterprise",
    email: businessRes.data?.email || "",
    phone: businessRes.data?.phone || "",
    tin: businessRes.data?.tin || "TIN-PENDING",
    address: businessRes.data?.address || "Main Office",
    plot: businessRes.data?.metadata?.plot_number || businessRes.data?.metadata?.plot || "N/A",
    pobox: businessRes.data?.metadata?.po_box || businessRes.data?.metadata?.pobox || "N/A"
  };

  // 4. CURRENCY REGISTRY (Logic Intact)
  const currencies = (currencyRes.data || []).map(c => ({
    code: c.abbreviation,
    name: c.name,
    symbol: c.symbol || ""
  }));

  const defaultCurrencies = currencies.length > 0 ? currencies : [
    { code: 'UGX', name: 'Uganda Shilling', symbol: 'Shs' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' }
  ];

  return (
    <div className="flex-1 space-y-10 p-6 md:p-10 bg-slate-50/50 min-h-screen animate-in fade-in duration-500">
      
      {/* --- PROFESSIONAL HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-200 pb-10">
        <div className="space-y-6">
          <Link 
            href={`/${locale}/invoicing/all-invoices`} 
            className="group flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" /> 
            Back to Invoicing History
          </Link>
          <div className="flex items-center gap-5">
            <div className="bg-slate-900 p-4 rounded-xl shadow-sm text-white">
              <FileText size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quotation Terminal</h1>
                <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 font-bold px-3 py-0.5 text-[10px] uppercase tracking-wide">
                  Drafting Mode
                </Badge>
              </div>
              <p className="text-slate-500 font-medium text-sm mt-1">
                Configure commercial specifications and generate professional client estimates.
              </p>
            </div>
          </div>
        </div>
        
        {/* ORGANIZATION IDENTITY */}
        <div className="flex items-center gap-5 bg-white px-8 py-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
           <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <ShieldCheck size={20} />
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Identity</span>
             <span className="text-sm font-bold text-slate-800 leading-tight">Verified Organization</span>
             <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Session Active</span>
             </div>
           </div>
        </div>
      </div>

      {/* --- CONTENT CENTER --- */}
      <div className="mx-auto max-w-[1600px]">
        {/* Estimates Terminal handles the specific form components */}
        <EstimateTerminal 
            tenantId={activeTenantId} 
            customers={customersRes.data || []} 
            currencies={defaultCurrencies}
            businessInfo={businessInfo}
        />
      </div>

      {/* --- COMPLIANCE FOOTER --- */}
      <div className="flex justify-center items-center gap-4 pt-16 opacity-30">
          <div className="h-[1px] w-12 bg-slate-400" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Standard Financial Protocol • Org ID: {activeTenantId.slice(0,12).toUpperCase()}
          </p>
          <div className="h-[1px] w-12 bg-slate-400" />
      </div>
    </div>
  );
}