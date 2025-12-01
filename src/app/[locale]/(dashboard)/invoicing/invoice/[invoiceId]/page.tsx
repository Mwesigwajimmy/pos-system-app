import React from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import InvoiceDetailPage from "@/components/invoicing/InvoiceDetailPage";
import { ShieldAlert } from "lucide-react";

interface PageProps {
  params: {
    invoiceId: string;
    locale: string;
  };
}

export default async function InvoiceDetail({ params: { invoiceId, locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/${locale}/auth/login`);

  // 2. Tenant Context (Fixed: 'business_id')
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.business_id;

  if (!tenantId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p>User has no organization assigned.</p>
      </div>
    );
  }

  // 3. Security Check: Ownership
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id") 
    .eq("id", invoiceId)
    .eq("tenant_id", tenantId) // Security: Ensure invoice belongs to tenant
    .single();

  if (invoiceError || !invoice) {
    notFound(); 
  }

  // 4. Render
  return (
    <div className="container mx-auto py-8 max-w-7xl px-4">
      <InvoiceDetailPage 
        invoiceId={invoiceId} 
        tenantId={tenantId} 
        locale={locale} 
      />
    </div>
  );
}