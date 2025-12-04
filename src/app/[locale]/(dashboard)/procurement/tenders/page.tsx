import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import ProcurementTenderManager from '@/components/procurement/ProcurementTenderManager';

export default async function TendersPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  // FIX: Using 'business_id'
  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();

  if (!profile?.business_id) return <div className="p-10 text-center">Unauthorized: No Business ID found.</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tenders & Bids</h1>
        <p className="text-muted-foreground">Manage RFQs, RFPs, and open tender processes.</p>
      </div>
      <ProcurementTenderManager tenantId={profile.business_id} />
    </div>
  );
}