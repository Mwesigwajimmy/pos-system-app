import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import CreditNotesTable from "@/components/invoicing/CreditNotesTable";
import { ShieldAlert } from "lucide-react";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function CreditNotesPage({ params: { locale } }: PageProps) {
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
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg border border-red-200">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2" />
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
      <CreditNotesTable tenantId={tenantId} locale={locale} />
    </div>
  );
}