import React from "react";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import InvoiceDetailPage from "@/components/invoicing/InvoiceDetailPage";
import { ShieldCheck, Landmark, ArrowLeft, FileText, Lock } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: {
    invoiceId: string;
    locale: string;
  };
}

export default async function InvoiceDetailPageEntry({ params: { invoiceId, locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. SECURE AUTHENTICATION
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  // 2. SOVEREIGN CONTEXT RESOLUTION
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
          <h2 className="text-2xl font-black text-red-900 tracking-tighter uppercase">Entity Link Missing</h2>
          <p className="text-red-700 mt-4 font-medium">Please contact admin to link your profile to a business unit.</p>
        </div>
      </div>
    );
  }

  // 3. ENTERPRISE OWNERSHIP VALIDATION (ID FIX)
  // We use parseInt because your database IDs are BIGINT (numeric), not UUID (string).
  const numericId = parseInt(invoiceId);

  if (isNaN(numericId)) {
    return notFound();
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, invoice_number, transaction_id") 
    .eq("id", numericId) // Use the numeric ID here
    .or(`business_id.eq.${activeTenantId},tenant_id.eq.${activeTenantId}`)
    .single();

  // If query returns nothing, the invoice either doesn't exist or belongs to another tenant.
  if (invoiceError || !invoice) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center p-6 text-center">
        <div className="bg-slate-50 border border-slate-200 p-12 rounded-3xl max-w-md shadow-sm">
          <Lock className="h-12 w-12 text-slate-400 mx-auto mb-6" />
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">
             This document is not associated with your organization's ledger.
          </p>
          <Link href={`/${locale}/invoicing/all-invoices`} className="mt-8 inline-block text-blue-600 font-bold underline">
            Return to Registry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-7xl px-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-widest text-[10px]">
            <ShieldCheck size={14} />
            Validated Document Stream
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
            Invoice Details
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
             <span className="flex items-center gap-1"><FileText size={14} /> Reference: {invoice.invoice_number}</span>
             {invoice.transaction_id && (
                <span className="flex items-center gap-1 text-emerald-600 font-bold"><ShieldCheck size={14} /> Ledger Sealed</span>
             )}
          </div>
        </div>
      </div>

      {/* Pass the numeric ID as a string to the client component */}
      <InvoiceDetailPage 
        invoiceId={invoiceId} 
        tenantId={activeTenantId} 
        locale={locale} 
      />
    </div>
  );
}