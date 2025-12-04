import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import SpendAnalysisDashboard from '@/components/procurement/SpendAnalysisDashboard';

export default async function SpendPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user?.id).single();

  if (!profile?.organization_id) return <div>Unauthorized</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Spend Analysis</h1>
        <p className="text-muted-foreground">Visual breakdown of expenditure by category.</p>
      </div>
      <SpendAnalysisDashboard tenantId={profile.organization_id} />
    </div>
  );
}