import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import EstimateTerminal from "@/components/invoicing/EstimateTerminal";
import { FileText, ArrowLeft, ShieldCheck, Landmark, Globe, Activity } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Commercial Quotation | Enterprise Drafting",
  description: "Generate commercial estimates and technical specifications for clients.",
};

interface PageProps { params: { locale: string }; }

export default async function EstimatesPage({ params: { locale } }: PageProps) {
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

  const businessInfo = {
    name: businessRes.data?.name || "Business Enterprise",
    email: businessRes.data?.email || "",
    phone: businessRes.data?.phone || "",
    tin: businessRes.data?.tin || "TIN-PENDING",
    address: businessRes.data?.address || "Main Office",
    plot: businessRes.data?.metadata?.plot_number || businessRes.data?.metadata?.plot || "N/A",
    pobox: businessRes.data?.metadata?.po_box || businessRes.data?.metadata?.pobox || "N/A"
  };

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
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-100 pb-12">
          <div className="space-y-4">
            <Link 
              href={`/${locale}/invoicing/all-invoices`} 
              className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={14} className="mr-2" /> Back to Invoicing History
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                 <FileText size={20} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operation:</span>
                <Badge variant="outline" className="border-blue-100 text-blue-600 bg-blue-50/50 font-bold px-4 py-1 text-[10px] uppercase tracking-widest rounded-full">
                  Commercial Drafting terminal
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-50/50 px-8 py-4 rounded-[2rem] border border-slate-100 shadow-sm transition-all">
             <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                <ShieldCheck size={22} />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Identity</span>
               <span className="text-sm font-bold text-slate-800 uppercase leading-tight">Verified Organization</span>
               <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Session Secure</span>
               </div>
             </div>
          </div>
        </header>

        <main className="min-h-[600px]">
          <EstimateTerminal 
              tenantId={activeTenantId} 
              customers={customersRes.data || []} 
              currencies={defaultCurrencies}
              businessInfo={businessInfo}
          />
        </main>

        <footer className="pt-16 pb-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-30">
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
            <Activity size={14} /> Ledger Link Active
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Protocol: GADS-12-B | Node ID: {activeTenantId.slice(0,18).toUpperCase()}
          </div>
        </footer>
      </div>
    </div>
  );
}