import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import FiscalComplianceBridge from "@/components/invoicing/FiscalComplianceBridge";
import { Landmark, ArrowLeft, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regulatory Compliance | Enterprise Ledger",
  description: "Standardized regulatory authority integration and fiscal validation terminal.",
};

interface PageProps { params: { locale: string }; }

export default async function CompliancePage({ params: { locale } }: PageProps) {
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

  const { data: latestInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("business_id", activeTenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: handshakeData } = await supabase
    .rpc('get_fiscal_handshake_status', { 
        p_invoice_id: latestInvoice?.id || 0, 
        p_user_id: user.id 
    });

  const handshake = handshakeData?.[0];

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-100 pb-12">
        <div className="space-y-4">
          <Link 
            href={`/${locale}/invoicing/list`} 
            className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={14} className="mr-2" /> Back to Registry
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-xl shadow-slate-200">
              <Landmark size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Compliance Gateway</h1>
              <p className="text-sm font-medium text-slate-500">Standardized regulatory synchronization and fiscal authentication.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
           <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
             <Globe size={20} />
           </div>
           <div className="space-y-0.5 pr-4">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Operational Status</span>
             <span className="text-sm font-bold text-slate-800 uppercase">
                {handshake?.jurisdiction_label || 'Global'} Protocol Active
             </span>
           </div>
        </div>
      </header>

      <main className="min-h-[500px]">
        <FiscalComplianceBridge 
          fiscalId={handshake?.fiscal_identifier}
          status={handshake?.fiscal_status || 'PENDING_AUTHORIZATION'}
          jurisdiction={handshake?.jurisdiction_label}
          authorityStandard={handshake?.authority_standard}
          isOnline={handshake?.is_gateway_online || false}
          rules={handshake?.applied_rules || []}
        />
      </main>

      <footer className="pt-12 flex justify-between items-center opacity-30">
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
          <ShieldCheck size={14} /> Regulatory Standard 12-B
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Node ID: GATEWAY-2026-X
        </div>
      </footer>
    </div>
  );
}