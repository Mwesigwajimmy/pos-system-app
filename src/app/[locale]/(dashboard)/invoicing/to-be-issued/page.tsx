import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import InvoicesToBeIssuedTable from "@/components/invoicing/InvoicesToBeIssuedTable";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicesToBeIssuedPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;

  if (!tenantId) {
    return <div className="p-6 text-red-600">Access Denied: No Tenant ID.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices To Be Issued</h1>
        <p className="mt-1 text-sm text-gray-500">
          Drafts and pending approvals awaiting issuance.
        </p>
      </div>

      <InvoicesToBeIssuedTable tenantId={tenantId} locale={locale} />
    </div>
  );
}