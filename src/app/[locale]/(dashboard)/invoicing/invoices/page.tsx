import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- 1. Import cookies
import { createClient } from "@/lib/supabase/server";
import InvoicesDataTable from "@/components/invoicing/InvoicesDataTable";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicesPage({ params: { locale } }: PageProps) {
  // 2. Get the cookie store
  const cookieStore = cookies();

  // 3. Init Supabase with cookies (Fixes "Expected 1 argument" error)
  const supabase = createClient(cookieStore);
  
  // 4. Auth Check
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 5. Tenant Context
  // Securely fetch the organization ID server-side
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;

  if (!tenantId) {
    return (
      <div className="p-6 m-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
        <strong>Access Denied:</strong> User not assigned to an organization.
      </div>
    );
  }

  // 6. Render Client Table with Secure Tenant ID
  return (
    <div className="container mx-auto py-8 max-w-7xl px-4">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400">
            View and manage all issued invoices across the organization.
          </p>
        </div>
      </div>
      
      <InvoicesDataTable tenantId={tenantId} locale={locale} />
    </div>
  );
}