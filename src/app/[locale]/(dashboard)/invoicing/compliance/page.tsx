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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase.from("profiles").select("business_id, organization_id").eq("id", user.id).single();
  const activeTenantId = profile?.business_id || profile?.organization_id;

  if (!activeTenantId) redirect(`/${locale}/dashboard`);

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
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Compliance Bridge</h1>
              <p className="text-slate-500 font-medium mt-1">Autonomous <span className="text-blue-600 font-bold">Revenue Authority</span> synchronization and handshake.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
           <Globe size={16} className="text-blue-600 animate-pulse" />
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Fiscal Status</span>
             <span className="text-xs font-bold text-blue-700">Multi-Jurisdiction Active</span>
           </div>
        </div>
      </div>
      <FiscalComplianceBridge />
    </div>
  );
}