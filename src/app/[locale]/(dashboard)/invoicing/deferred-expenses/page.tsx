import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers"; // <--- 1. Import cookies
import { createClient } from "@/lib/supabase/server";
import DeferredExpensesTable from "@/components/invoicing/DeferredExpensesTable";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function DeferredExpensesPage({ params: { locale } }: PageProps) {
  // 2. Get the cookie store
  const cookieStore = cookies();

  // 3. Init Supabase with cookies (Fixes "Expected 1 argument" error)
  const supabase = createClient(cookieStore);

  // 4. Authenticate
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/login`);

  // 5. Secure Tenant ID Fetch
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;

  if (!tenantId) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg m-4">
        <strong>Access Denied:</strong> No Organization found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deferred Expenses</h1>
        <p className="text-gray-500 dark:text-gray-400">Track prepaid expenses and amortization schedules.</p>
      </div>
      <DeferredExpensesTable tenantId={tenantId} locale={locale} />
    </div>
  );
}