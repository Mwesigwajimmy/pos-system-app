import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import InvoicesToBeIssuedTable from "@/components/invoicing/InvoicesToBeIssuedTable";
import { ShieldCheck, Clock, AlertCircle, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Authorization Registry | Enterprise Billing",
  description: "Secure terminal for document verification and ledger synchronization.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicesToBeIssuedPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore); 

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, business_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (profileError || !activeTenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-12 bg-slate-50">
        <div className="bg-white border border-slate-200 p-12 rounded-[2rem] max-w-md shadow-xl text-center space-y-6">
          <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Security Access Required</h2>
            <p className="text-sm text-slate-500 font-medium">No active business entity could be resolved for this operational session.</p>
          </div>
        </div>
      </div>
    );
  }

  const { data: queueData, error: queueError } = await supabase
    .from("invoices")
    .select(`id`)
    .eq("business_id", activeTenantId)
    .in("status", ["DRAFT", "PENDING_APPROVAL", "READY_TO_ISSUE"])
    .is("transaction_id", null)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700 bg-white">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-100 pb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-[0.2em] text-[10px]">
            <Activity size={14} /> Finalization Workflow
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Authorization Registry</h1>
          <p className="text-sm font-medium text-slate-500">
            Awaiting verification for <span className="text-blue-600 font-bold">{queueData?.length || 0}</span> documents pending ledger synchronization.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
           <div className="h-2 w-2 bg-emerald-500 rounded-full" />
           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
             Interconnect Status: Active
           </span>
        </div>
      </header>

      <main className="min-h-[600px]">
        {queueError ? (
          <div className="p-8 bg-amber-50 border border-amber-100 rounded-3xl text-amber-900 flex items-center gap-4 shadow-sm">
            <AlertCircle size={24} className="text-amber-600" />
            <div className="space-y-1">
              <p className="text-sm font-bold uppercase tracking-tight">Connectivity Distruption</p>
              <p className="text-xs font-medium opacity-80">{queueError.message}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden bg-slate-50/30">
            <InvoicesToBeIssuedTable 
              tenantId={activeTenantId} 
              locale={locale}
            />
          </div>
        )}
      </main>

      <footer className="pt-12 border-t border-slate-100 flex justify-between items-center opacity-30">
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">
          <ShieldCheck size={14} /> Compliance Protocol 12-B
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <Clock size={12} /> Cycle: {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>
      </footer>
    </div>
  );
}