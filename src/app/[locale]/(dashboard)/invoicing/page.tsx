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
  CheckCircle2,
  RefreshCcw,
  Globe,
  Zap,
  Fingerprint,
  ChevronRight
} from "lucide-react";

export const metadata: Metadata = {
  title: "Revenue Operations | Enterprise Control Center",
  description: "Operational oversight of invoicing, recognition schedules, and ledger integrity.",
};

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicingDashboardPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id, organization_id")
    .eq("id", user.id)
    .single();

  const activeTenantId = profile?.business_id || profile?.organization_id;
  
  if (profileError || !activeTenantId) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 bg-slate-50">
        <div className="bg-white border border-slate-200 p-12 rounded-[2rem] max-w-md shadow-xl text-center space-y-6">
          <div className="h-16 w-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Entity Link Required</h2>
            <p className="text-sm text-slate-500 font-medium">Your profile is not currently associated with an active Business Unit.</p>
          </div>
          <Button variant="outline" className="w-full h-12 rounded-xl font-bold" asChild>
            <Link href={`/${locale}/onboarding`}>Register Organization</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [invoicesRes, pendingRes, deferredRes, revenueSumRes, fxAuditRes, complianceRes] = await Promise.all([
    supabase.from("invoices").select("id", { count: 'exact', head: true }).eq("business_id", activeTenantId).in("status", ["ISSUED", "paid"]),
    supabase.from("invoices").select("id", { count: 'exact', head: true }).eq("business_id", activeTenantId).is("transaction_id", null).in("status", ["DRAFT", "PENDING_APPROVAL"]),
    supabase.from("deferred_revenue").select("id", { count: 'exact', head: true }).eq("tenant_id", activeTenantId),
    supabase.from("invoices").select("total_amount").eq("business_id", activeTenantId).in("status", ["ISSUED", "paid"]),
    supabase.from("invoice_fx_audit").select("unrealized_variance").not("unrealized_variance", "is", null),
    supabase.from("invoice_fiscal_validation").select("id", { count: 'exact', head: true }).eq("sync_status", "PENDING")
  ]);

  const totalBookedRevenue = (revenueSumRes.data || []).reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  const totalFXVariance = (fxAuditRes.data || []).reduce((acc, curr) => acc + (Number(curr.unrealized_variance) || 0), 0);
  
  const formatCurrency = (val: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700 bg-white">
      
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 border-b border-slate-100 pb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-[0.2em] text-[10px]">
            <Layers size={14} /> Revenue Operations
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tighter">Financial Oversight</h1>
          <p className="text-sm font-medium text-slate-500">Consolidated perspective of billing cycles and ledger synchronization.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Protocol Sync: Active</span>
            </div>
            <Button asChild className="h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 font-bold uppercase text-[11px] tracking-widest rounded-2xl">
              <Link href={`/${locale}/invoicing/create`}>
                <Plus className="mr-2 h-4 w-4" /> Create New Invoice
              </Link>
            </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href={`/${locale}/invoicing/fx-audit`} className="group p-8 bg-slate-900 rounded-[2rem] shadow-2xl transition-all hover:translate-y-[-4px]">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
              <RefreshCcw size={14} /> FX Variance Audit
            </span>
            <div className={`text-2xl font-bold mt-3 ${totalFXVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalFXVariance >= 0 ? '+' : ''}{formatCurrency(totalFXVariance)}
            </div>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-emerald-500" /> Real-Time Reconciliation
            </div>
          </Link>

          <Link href={`/${locale}/invoicing/compliance`} className="group p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:shadow-xl">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Statutory Compliance</span>
            <div className="text-2xl font-bold text-slate-900 mt-3 flex items-center gap-3">
                {complianceRes.count || 0} <span className="text-xs text-amber-500 uppercase tracking-widest">Queue</span>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Globe size={12} className="text-blue-500" /> Authority Handshake Active
            </div>
          </Link>

          <Link href={`/${locale}/invoicing/recurring`} className="group p-8 bg-blue-600 rounded-[2rem] shadow-xl transition-all hover:bg-blue-700">
            <span className="text-[10px] font-bold uppercase text-blue-100 tracking-widest">Deferred Revenue</span>
            <div className="text-2xl font-bold text-white mt-3">
                {deferredRes.count || 0} <span className="text-xs uppercase font-bold opacity-60 ml-1">Schedules</span>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-blue-100 uppercase tracking-widest">
                <Zap size={12} className="fill-blue-200" /> Automated Recognition
            </div>
          </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="border-none shadow-sm bg-slate-50/50 rounded-3xl p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booked Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalBookedRevenue)}</div>
            <div className="text-[9px] font-bold text-emerald-600 uppercase mt-2 flex items-center gap-1">
              <CheckCircle2 size={12} /> Ledger Verified
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50 rounded-3xl p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issued Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{invoicesRes.count || 0}</div>
            <Link href={`/${locale}/invoicing/history`} className="text-[9px] font-bold text-blue-600 uppercase mt-2 inline-flex items-center hover:underline">
              Review Registry <ArrowUpRight size={12} className="ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50 rounded-3xl p-2 ring-2 ring-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Pending Issuance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{pendingRes.count || 0}</div>
            <Link href={`/${locale}/invoicing/execution`} className="text-[9px] font-bold text-amber-600 uppercase mt-2 inline-flex items-center hover:underline">
              Finalize Ledger <ArrowUpRight size={12} className="ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-50/50 rounded-3xl p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 tracking-tight">{deferredRes.count || 0}</div>
            <Link href={`/${locale}/invoicing/recurring`} className="text-[9px] font-bold text-blue-600 uppercase mt-2 inline-flex items-center hover:underline">
              View Schedules <ArrowUpRight size={12} className="ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href={`/${locale}/invoicing/credit-notes`} className="group flex items-center justify-between p-10 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
            <div className="flex items-center gap-6">
                <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <FileText size={24} />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 uppercase tracking-tight">Credit Operations</h3>
                    <p className="text-xs text-slate-500 font-medium">Reversals and fiscal balance adjustments.</p>
                </div>
            </div>
            <ChevronRight className="text-slate-200 group-hover:text-blue-600 transition-all" />
          </Link>

          <Link href={`/${locale}/invoicing/debit-notes`} className="group flex items-center justify-between p-10 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all">
            <div className="flex items-center gap-6">
                <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <TrendingUp size={24} />
                </div>
                <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 uppercase tracking-tight">Debit Adjustments</h3>
                    <p className="text-xs text-slate-500 font-medium">Accounts payable reconciliation protocols.</p>
                </div>
            </div>
            <ChevronRight className="text-slate-200 group-hover:text-emerald-600 transition-all" />
          </Link>
      </div>

      <footer className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.5em]">
          Automated Ledger Protocol V1.0
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Context ID: {activeTenantId.substring(0,18).toUpperCase()}...
        </div>
      </footer>
    </div>
  );
}