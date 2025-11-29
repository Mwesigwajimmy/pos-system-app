import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- 1. Import cookies
import { createClient } from "@/lib/supabase/server"; 
import InvoicesToBeIssuedTable from "@/components/invoicing/InvoicesToBeIssuedTable";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicesToBeIssuedPage({ params: { locale } }: PageProps) {
  // 2. Get the cookie store
  const cookieStore = cookies();

  // 3. Initialize Supabase Server Client passing the cookie store
  const supabase = createClient(cookieStore); 

  // 4. Authenticate User
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 5. Get Real Tenant ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    console.error("Profile/Tenant Error:", profileError);
    return (
      <div className="p-6 text-red-600 bg-red-50 border border-red-200 rounded-lg">
        <strong>Access Denied:</strong> No Organization/Tenant found for your account. Please contact support.
      </div>
    );
  }

  const tenantId = profile.organization_id;

  // 6. Fetch Real Invoices for this Tenant
  const { data: invoices, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["DRAFT", "PENDING_APPROVAL", "READY_TO_ISSUE"]) 
    .order("created_at", { ascending: false });

  if (invoiceError) {
    console.error("Invoice Fetch Error:", invoiceError);
    return <div>Error loading invoices. Please try again later.</div>;
  }

  // 7. Render Page
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invoices To Be Issued
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage {invoices?.length || 0} invoices waiting for approval or issuance.
          </p>
        </div>
      </div>

      <InvoicesToBeIssuedTable 
        tenantId={tenantId} 
        locale={locale}
        // initialData={invoices} 
      />
    </div>
  );
}