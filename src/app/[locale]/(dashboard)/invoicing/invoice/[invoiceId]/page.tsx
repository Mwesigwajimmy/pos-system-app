import React from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- 1. Import cookies
import { createClient } from "@/lib/supabase/server";
import InvoiceDetailPage from "@/components/invoicing/InvoiceDetailPage";

interface PageProps {
  params: {
    invoiceId: string;
    locale: string;
  };
}

export default async function InvoiceDetail({ params: { invoiceId, locale } }: PageProps) {
  // 2. Get the cookie store
  const cookieStore = cookies();

  // 3. Initialize Supabase with the cookie store (Fixes the "Expected 1 argument" error)
  const supabase = createClient(cookieStore);

  // 4. Authenticate User
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 5. Get Tenant ID (Organization)
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;

  if (!tenantId) {
    return (
      <div className="p-6 text-red-600 bg-red-50 border border-red-200 rounded-lg m-4">
        <strong>Access Denied:</strong> User has no organization assigned.
      </div>
    );
  }

  // 6. Security Check: Ownership
  // We ensure the invoice exists AND belongs to the tenant before loading the client component
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id") 
    .eq("id", invoiceId)
    .eq("tenant_id", tenantId)
    .single();

  if (invoiceError || !invoice) {
    // If not found or doesn't belong to tenant, show 404
    notFound(); 
  }

  // 7. Render Client Detail View
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