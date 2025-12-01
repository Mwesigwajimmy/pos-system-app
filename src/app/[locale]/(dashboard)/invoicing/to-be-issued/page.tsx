import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import InvoicesToBeIssuedTable from "@/components/invoicing/InvoicesToBeIssuedTable";
import { ShieldAlert } from "lucide-react";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function InvoicesToBeIssuedPage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Auth Check
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  // 2. Secure Tenant Context (Fixed: 'business_id')
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id") 
    .eq("id", user.id)
    .single();

  const tenantId = profile?.business_id;

  if (!tenantId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-muted-foreground">Your account is not linked to an active Organization.</p>
      </div>
    );
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