import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import FXGainLossAudit from "@/components/invoicing/FXGainLossAudit";
import { ShieldCheck, TrendingUp, Landmark, ArrowLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FX Forensic Audit | Sovereign Ledger",
  description: "Real-time monitoring of currency drift and unrealized exchange variances.",
};

interface PageProps { params: { locale: string }; }

export default async function FXAuditPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (!activeTenantId) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center">
        <div className="bg-red-50 border-2 border-dashed border-red-200 p-12 rounded-3xl max-w-md shadow-xl">
          <Landmark className="h-16 w-16 text-red-600 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-red-900 tracking-tighter uppercase">Forensic Lock</h2>
          <p className="text-red-700 mt-4 font-medium">Profile not linked to a Sovereign Business Unit.</p>
          <Link href={`/${locale}/dashboard`} className="mt-8 inline-block font-bold text-red-900 underline">Return</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link href={`/${locale}/invoicing/list`} className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">
            <ArrowLeft size={12} className="mr-2" /> Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
              <TrendingUp size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">FX Variance Audit</h1>
              <p className="text-slate-500 font-medium mt-1">Forensic monitoring of <span className="text-emerald-600 font-bold">Currency Drift</span> across international receivables.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-950 px-5 py-3 rounded-2xl border border-white/10">
           <RefreshCcw size={16} className="text-blue-400 animate-spin-slow" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aura Mid-Rate Feed</span>
             <span className="text-xs font-bold text-emerald-400 uppercase">Live Sync Active</span>
           </div>
        </div>
      </div>
      <FXGainLossAudit />
    </div>
  );
}