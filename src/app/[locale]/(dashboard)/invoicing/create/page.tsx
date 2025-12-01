import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server"; 
import CreateInvoiceClient from "@/components/invoicing/CreateInvoiceClient";
import { ShieldAlert } from "lucide-react";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function CreateInvoicePage({ params: { locale } }: PageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Auth Check
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  // 2. Tenant Context (Fixed: 'business_id')
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.business_id;

  if (!tenantId) {
    return (
      <div className="flex h-screen items-center justify-center p-6 bg-red-50">
        <div className="text-center">
          <ShieldAlert className="h-10 w-10 text-red-600 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-red-700">Access Denied</h2>
          <p className="text-red-600">User is not assigned to an active Organization.</p>
        </div>
      </div>
    );
  }

  // 3. Render
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