import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import CreateInvoiceClient from "@/components/invoicing/CreateInvoiceClient"; // Ensure path is correct

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function CreateInvoicePage({ params: { locale } }: PageProps) {
  // 1. Init Supabase securely
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 2. Auth Check
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 3. Fetch Tenant/Organization Context
  // SECURITY: We fetch this on the server so the user cannot spoof their organization ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;

  if (!tenantId) {
    return (
      <div className="flex h-screen items-center justify-center p-6 bg-red-50">
        <div className="text-center">
          <h2 className="text-lg font-bold text-red-700">Access Denied</h2>
          <p className="text-red-600">User is not assigned to an active Organization.</p>
        </div>
      </div>
    );
  }

  // 4. Pass Real Data to Client Component
  // This resolves your TypeScript error because we will define the props in the Client file next.
  return (
    <div className="container mx-auto py-8 max-w-5xl px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Invoice</h1>
        <p className="text-gray-500">Fill in the details below to generate a new invoice.</p>
      </div>
      
      <CreateInvoiceClient 
        tenantId={tenantId} 
        userId={user.id}
        locale={locale} 
      />
    </div>
  );
}