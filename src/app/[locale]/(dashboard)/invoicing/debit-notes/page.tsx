import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- 1. Import cookies
import { createClient } from "@/lib/supabase/server"; 
import DebitNotesTable from "@/components/invoicing/DebitNotesTable";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function DebitNotesPage({ params: { locale } }: PageProps) {
  // 2. Get the cookie store
  const cookieStore = cookies();

  // 3. Initialize Supabase with the cookie store (Fixes the "Expected 1 argument" error)
  const supabase = createClient(cookieStore);

  // 4. Authenticate User
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  // 5. Securely Fetch Tenant/Organization ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;

  if (!tenantId) {
    return (
      <div className="p-6 flex justify-center text-red-600 bg-red-50 border border-red-200 rounded-lg m-4">
        <strong>Access Denied:</strong> No Organization/Tenant found for your account.
      </div>
    );
  }

  // 6. Render Page
  return (
    <div className="container mx-auto py-8 max-w-7xl px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Debit Notes</h1>
        <p className="text-gray-500 dark:text-gray-400">Track supplier adjustments and debit memos.</p>
      </div>
      
      {/* Pass the secure tenantId to the client component */}
      <DebitNotesTable tenantId={tenantId} locale={locale} />
    </div>
  );
}