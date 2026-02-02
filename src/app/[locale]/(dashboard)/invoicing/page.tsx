import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  ShieldCheck, 
  ArrowUpRight, 
  Landmark,
  Layers,
  CheckCircle2
} from "lucide-react";

// --- Enterprise Metadata ---
export const metadata: Metadata = {
  title: "Revenue Operations Dashboard | Enterprise Control",
  description: "Real-time oversight of interconnected invoicing, recognition schedules, and ledger integrity.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicingDashboardPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. SECURE AUTHENTICATION
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  // 2. SOVEREIGN CONTEXT RESOLUTION
  // We fetch both business_id and organization_id to bridge the historical desync.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  
  if (profileError || !activeTenantId) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center">
        <div className="bg-red-50 border-2 border-dashed border-red-200 p-12 rounded-3xl max-w-md shadow-xl">
          <Landmark className="h-16 w-16 text-red-600 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-red-900 tracking-tighter uppercase">No Entity Link</h2>
          <p className="text-red-700 mt-4 font-medium">Your profile is not currently mapped to an active Business Unit.</p>
          <Button variant="outline" className="mt-8" asChild>
            <Link href={`/${locale}/onboarding`}>Register Organization</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 3. ENTERPRISE STATS AUDIT (Financial Integrity Fetching)
  // We fetch counts that distinguish between "Drafts" and "Ledger-Sealed" documents.
  const [invoicesRes, pendingRes, deferredRes, revenueSumRes] = await Promise.all([
    // Total "Real" Invoices (Issued or Paid)
    supabase.from("invoices").select("id", { count: 'exact', head: true }).eq("business_id", activeTenantId).in("status", ["ISSUED", "paid"]),
    // Items stuck in the "To Be Issued" Queue (Transaction ID is NULL)
    supabase.from("invoices").select("id", { count: 'exact', head: true }).eq("business_id", activeTenantId).is("transaction_id", null).in("status", ["DRAFT", "PENDING_APPROVAL"]),
    // Active Deferred Revenue Schedules
    supabase.from("deferred_revenue").select("id", { count: 'exact', head: true }).eq("tenant_id", activeTenantId),
    // Sum of Booked Revenue (100% Interconnected)
    supabase.from("invoices").select("total_amount").eq("business_id", activeTenantId).in("status", ["ISSUED", "paid"])
  ]);

  const totalBookedRevenue = (revenueSumRes.data || []).reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  const formatCurrency = (val: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6 space-y-10 bg-slate-50/30">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-[0.2em] text-[10px]">
            <Layers size={14} />
            Enterprise Invoicing System
          </div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
            Financial Overview
          </h1>
          <p className="text-slate-500 font-medium max-w-md">
            Consolidated oversight of all revenue streams, adjustments, and ledger-linked transitions.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 mr-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">Ledger Synchronized</span>
            </div>
            <Button asChild size="lg" className="h-14 px-8 bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/20 font-black uppercase text-xs tracking-widest rounded-2xl">
              <Link href={`/${locale}/invoicing/create`}>
                <Plus className="mr-2 h-5 w-5" strokeWidth={3} /> New Commercial Invoice
              </Link>
            </Button>
        </div>
      </div>

      {/* Stats Command Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* Booked Revenue (The "Golden" Metric) */}
        <Card className="relative overflow-hidden border-none shadow-xl bg-slate-900 text-white group pt-4">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={80} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Booked Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">
              {formatCurrency(totalBookedRevenue)}
            </div>
            <p className="text-[10px] text-emerald-400 font-bold mt-2 flex items-center gap-1 uppercase">
              <ShieldCheck size={12} /> Ledger Verified
            </p>
          </CardContent>
        </Card>

        {/* Issued Volume */}
        <Card className="border-none shadow-lg hover:shadow-xl transition-all pt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-end gap-2">
              {invoicesRes.count || 0}
              <span className="text-xs text-slate-400 font-bold mb-1.5 uppercase">Documents</span>
            </div>
          </CardContent>
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
             <Link href={`/${locale}/invoicing/all-invoices`} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center">
               View Registry <ArrowUpRight size={12} className="ml-1" />
             </Link>
          </div>
        </Card>

        {/* Issuance Queue */}
        <Card className="border-none shadow-lg hover:shadow-xl transition-all pt-4 ring-2 ring-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Action Required</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-end gap-2">
              {pendingRes.count || 0}
              <span className="text-xs text-amber-500 font-bold mb-1.5 uppercase tracking-tighter animate-pulse">Unposted</span>
            </div>
          </CardContent>
          <div className="px-6 py-4 bg-amber-50/50 border-t border-amber-100 flex justify-between items-center">
             <Link href={`/${locale}/invoicing/to-be-issued`} className="text-[10px] font-black text-amber-700 hover:text-amber-900 uppercase tracking-widest flex items-center">
               Seal Ledger <ArrowUpRight size={12} className="ml-1" />
             </Link>
          </div>
        </Card>

        {/* Deferred Schedules */}
        <Card className="border-none shadow-lg hover:shadow-xl transition-all pt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deferred Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-end gap-2">
              {deferredRes.count || 0}
              <span className="text-xs text-slate-400 font-bold mb-1.5 uppercase">Contracts</span>
            </div>
          </CardContent>
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
             <Link href={`/${locale}/invoicing/deferred-revenue`} className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center">
               View Schedules <ArrowUpRight size={12} className="ml-1" />
             </Link>
          </div>
        </Card>
      </div>

      {/* Advanced Management Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href={`/${locale}/invoicing/credit-notes`} className="group flex items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-200 transition-all">
            <div className="flex items-center gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-blue-50 transition-colors">
                    <TrendingUp className="text-slate-400 group-hover:text-blue-600" />
                </div>
                <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">Credit Note Management</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Autonomous reversals and balance corrections.</p>
                </div>
            </div>
            <ArrowRightIcon className="text-slate-200 group-hover:text-blue-600 group-hover:translate-x-2 transition-all" />
          </Link>

          <Link href={`/${locale}/invoicing/debit-notes`} className="group flex items-center justify-between p-8 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all">
            <div className="flex items-center gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-emerald-50 transition-colors">
                    <TrendingUp className="text-slate-400 group-hover:text-emerald-600" />
                </div>
                <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">Supplier Adjustments</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">1:1 Accounts Payable Hard-linked reconciliation.</p>
                </div>
            </div>
            <ArrowRightIcon className="text-slate-200 group-hover:text-emerald-600 group-hover:translate-x-2 transition-all" />
          </Link>
      </div>

      {/* Compliance Footer */}
      <div className="pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
          Autonomous Ledger Sync System V1.0 • GADS Compliant
        </p>
        <p className="text-[9px] font-bold text-slate-400 uppercase">
          Organization Identity: {activeTenantId.substring(0,18).toUpperCase()}...
        </p>
      </div>
    </div>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`w-6 h-6 ${className}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
    )
}