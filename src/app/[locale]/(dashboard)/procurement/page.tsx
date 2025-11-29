import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Import correctly named components
import ProcurementDashboard from '@/components/procurement/ProcurementDashboard';
import ProcurementPipelineTable from '@/components/procurement/ProcurementPipelineTable';
import ProcurementTenderManager from '@/components/procurement/ProcurementTenderManager';
import SpendAnalysisDashboard from '@/components/procurement/SpendAnalysisDashboard';

interface PageProps {
  params: {
    locale: string;
  };
}

export default async function ProcurementOverviewPage({ params: { locale } }: PageProps) {
  // 1. Server-Side Auth & Tenant Check
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.organization_id;

  if (!tenantId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p>No organization found for your user account.</p>
      </div>
    );
  }

  // 2. Render Page Layout
  return (
    <div className="container mx-auto py-8 space-y-8 max-w-7xl px-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Procurement Overview</h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights into sourcing, spend, and tender activities.
          </p>
        </div>
      </div>

      {/* Top Level KPIs */}
      <ProcurementDashboard tenantId={tenantId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Pipeline */}
        <div className="flex flex-col gap-8">
           <ProcurementPipelineTable tenantId={tenantId} />
           <SpendAnalysisDashboard tenantId={tenantId} />
        </div>

        {/* Right Column: Tenders */}
        <div className="flex flex-col gap-8">
           <ProcurementTenderManager tenantId={tenantId} />
           {/* You can add SourcingEventCalendar here if needed */}
        </div>
      </div>
    </div>
  );
}