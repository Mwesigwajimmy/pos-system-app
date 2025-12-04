import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

import ProcurementDashboard from '@/components/procurement/ProcurementDashboard';
import ProcurementPipelineTable from '@/components/procurement/ProcurementPipelineTable';
import ProcurementTenderManager from '@/components/procurement/ProcurementTenderManager';
import SpendAnalysisDashboard from '@/components/procurement/SpendAnalysisDashboard';

export default async function ProcurementPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth/login`);

  // FIX: Changed 'organization_id' to 'business_id' based on your schema
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id") 
    .eq("id", user.id)
    .single();

  const tenantId = profile?.business_id;

  if (!tenantId) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Unauthorized</h2>
          <p className="text-muted-foreground">Your user profile is not linked to a business tenant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-7xl px-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Procurement Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time insights into sourcing, spend, and tender activities.</p>
        </div>
      </div>
      <ProcurementDashboard tenantId={tenantId} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
           <ProcurementPipelineTable tenantId={tenantId} />
           <SpendAnalysisDashboard tenantId={tenantId} />
        </div>
        <div className="flex flex-col gap-8">
           <ProcurementTenderManager tenantId={tenantId} />
        </div>
      </div>
    </div>
  );
}