import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import FiscalComplianceBridge from "@/components/invoicing/FiscalComplianceBridge";
import { ShieldCheck, Landmark, ArrowLeft, Globe } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Statutory Compliance | Sovereign Registry",
  description: "Global tax authority integration and legal invoice validation terminal.",
};

interface PageProps { params: { locale: string }; }

export default async function CompliancePage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. AUTHENTICATION HANDSHAKE
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // 2. TENANT RESOLUTION
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  if (!activeTenantId) redirect(`/${locale}/dashboard`);

  // 3. FETCH RECENT INVOICE FOR HANDSHAKE CONTEXT
  // We fetch the latest invoice to show the current "Live" fiscal state of the business unit
  const { data: latestInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("business_id", activeTenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // 4. CALL THE ENTERPRISE FISCAL RPC
  // This calls the global tax logic we built in the database
  const { data: handshakeData, error: rpcError } = await supabase
    .rpc('get_fiscal_handshake_status', { 
        p_invoice_id: latestInvoice?.id || 0, 
        p_user_id: user.id 
    });

  const handshake = handshakeData?.[0];

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link href={`/${locale}/invoicing/list`} className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">
            <ArrowLeft size={12} className="mr-2" /> Return to Registry
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-slate-950 p-3 rounded-2xl shadow-xl text-white">
              <Landmark size={28} strokeWidth={2.5} />
            </div>
            <div>
              {/* UI FIXED: Text is straight, no italics */}
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Compliance Bridge</h1>
              <p className="text-slate-500 font-medium mt-1">Autonomous <span className="text-blue-600 font-bold">Revenue Authority</span> synchronization and handshake.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
           <Globe size={16} className="text-blue-600 animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Fiscal Status</span>
             <span className="text-xs font-bold text-blue-700 uppercase">
                {handshake?.jurisdiction_label || 'Global'} Active
             </span>
           </div>
        </div>
      </div>

      {/* 5. DATA INJECTION: Passing real DB results to the UI */}
      <FiscalComplianceBridge 
        fiscalId={handshake?.fiscal_identifier}
        status={handshake?.fiscal_status || 'PENDING_HANDSHAKE'}
        jurisdiction={handshake?.jurisdiction_label}
        authorityStandard={handshake?.authority_standard}
        isOnline={handshake?.is_gateway_online || false}
        rules={handshake?.applied_rules || []}
      />
    </div>
  );
}