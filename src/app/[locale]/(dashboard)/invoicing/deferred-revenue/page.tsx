import React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import DeferredRevenueTable from "@/components/invoicing/DeferredRevenueTable";
import { ShieldAlert } from "lucide-react";

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function DeferredRevenuePage({ params: { locale } }: PageProps) {
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
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg m-4 text-center">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2" />
        <strong>Access Denied:</strong> No Organization found.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deferred Revenue</h1>
        <p className="text-gray-500 dark:text-gray-400">Monitor unearned revenue and recognition schedules.</p>
      </div>
      <DeferredRevenueTable tenantId={tenantId} locale={locale} />
    </div>
  );
}