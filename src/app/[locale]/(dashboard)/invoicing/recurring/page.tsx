import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import RecurringBillingSchedules from "@/components/invoicing/RecurringBillingSchedules";
import { Zap, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Revenue Automation | Sovereign Scheduler",
  description: "Management of recurring billing cycles and collection confidence forecasting.",
};

interface PageProps { params: { locale: string }; }

export default async function RecurringPage({ params: { locale } }: PageProps) {
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

  // 3. FETCH REVENUE FORECASTING DATA (RPC)
  const { data: streams } = await supabase
    .rpc('get_revenue_stream_forecast', { 
        p_business_id: activeTenantId 
    });

  // 4. FETCH MASTER DOCUMENTS (Templates for the Scheduler)
  // This ensures the "New Billing Schedule" terminal is fully functional and not mock
  const { data: templateInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, currency, customer_name")
    .eq("business_id", activeTenantId)
    .order("created_at", { ascending: false });

  const activeCount = streams?.[0]?.total_active_count || 0;

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
        <div className="space-y-3">
          <Link href={`/${locale}/invoicing/list`} className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-600 transition-colors">
            <ArrowLeft size={12} className="mr-2" /> Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
              <Zap size={28} strokeWidth={2.5} />
            </div>
            <div>
              {/* FIXED: Removed 'italic' for professional enterprise look */}
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Revenue Streams</h1>
              <p className="text-slate-500 font-medium mt-1">Automated <span className="text-blue-600 font-bold">Subscription logic</span> and settlement forecasting.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100">
           <ShieldCheck size={16} className="text-emerald-600" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Flow Integrity</span>
             <span className="text-xs font-bold text-emerald-700">Predictive Audit ON</span>
           </div>
        </div>
      </div>
      <div className="max-w-4xl">
         <RecurringBillingSchedules 
            schedules={streams || []} 
            activeCount={Number(activeCount)} 
            availableTemplates={templateInvoices || []}
         />
      </div>
    </div>
  );
}