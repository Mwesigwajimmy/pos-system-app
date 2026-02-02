import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import InvoicesToBeIssuedTable from "@/components/invoicing/InvoicesToBeIssuedTable";
import { ShieldCheck, Clock, AlertCircle } from "lucide-react";

// --- Enterprise Metadata ---
export const metadata: Metadata = {
  title: "Issuance Queue | Enterprise Invoicing",
  description: "Secure gateway for document verification and ledger synchronization.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicesToBeIssuedPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore); 

  // 1. SECURE AUTHENTICATION
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 2. SOVEREIGN TENANT RESOLUTION
  // We fetch organization_id but alias it to business_id for ledger compatibility
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, business_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (profileError || !activeTenantId) {
    return (
      <div className="container mx-auto p-12">
        <div className="bg-red-50 border-2 border-dashed border-red-200 p-8 rounded-2xl text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900">Security Scope Violation</h2>
          <p className="text-red-700 mt-2">No active business entity found for this session.</p>
        </div>
      </div>
    );
  }

  // 3. SERVER-SIDE PRE-FETCH (High Performance)
  // We filter out any invoice that ALREADY has a transaction_id to prevent double-issuance
  const { data: queueData, error: queueError } = await supabase
    .from("invoices")
    .select(`
      id, 
      invoice_number, 
      total_amount, 
      status, 
      created_at,
      customers ( name )
    `)
    .eq("business_id", activeTenantId)
    .in("status", ["DRAFT", "PENDING_APPROVAL", "READY_TO_ISSUE"])
    .is("transaction_id", null) // ENTERPRISE GUARD: Only show items not yet on the ledger
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      {/* Dynamic Enterprise Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-widest text-[10px]">
            <ShieldCheck size={14} />
            Autonomous Workflow Engine
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
            Issuance Queue
          </h1>
          <p className="text-slate-500 font-medium">
            There are <span className="text-blue-600 font-bold">{queueData?.length || 0}</span> documents awaiting ledger synchronization.
          </p>
        </div>
        
        {/* Real-time Status Badge */}
        <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
           <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
             System Live: 1:1 Interconnect Active
           </span>
        </div>
      </div>

      {/* Main Table Interface */}
      {queueError ? (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-medium">Connectivity disruption: {queueError.message}</span>
        </div>
      ) : (
        <InvoicesToBeIssuedTable 
          tenantId={activeTenantId} 
          locale={locale}
        />
      )}

      {/* Audit Footer */}
      <div className="mt-8 flex justify-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
          <Clock size={10} /> 
          Pending recognition cycle: {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}