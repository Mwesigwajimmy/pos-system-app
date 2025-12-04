import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import ProcurementTenderManager from '@/components/procurement/ProcurementTenderManager';

export default async function TendersPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user?.id).single();

  if (!profile?.organization_id) return <div>Unauthorized</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tenders & Bids</h1>
        <p className="text-muted-foreground">Manage RFQs, RFPs, and open tender processes.</p>
      </div>
      <ProcurementTenderManager tenantId={profile.organization_id} />
    </div>
  );
}