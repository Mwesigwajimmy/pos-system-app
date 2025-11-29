import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- IMPORT THIS
import { createClient } from "@/lib/supabase/server";
import CreditNotesTable from "@/components/invoicing/CreditNotesTable";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function CreditNotesPage({ params: { locale } }: PageProps) {
  // 1. Get cookies
  const cookieStore = cookies();

  // 2. Pass cookies to createClient to fix "Expected 1 arguments" error
  const supabase = createClient(cookieStore);

  // 3. Authenticate
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  // 4. Secure Tenant Fetch
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;

  if (!tenantId) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
        <strong>Access Denied:</strong> No Organization found for your account.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Notes</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage customer returns and balance corrections.</p>
      </div>
      {/* 5. Pass data to Client Component */}
      <CreditNotesTable tenantId={tenantId} locale={locale} />
    </div>
  );
}