import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import ProcurementApprovalWorkflow from '@/components/procurement/ProcurementApprovalWorkflow';

export default async function ApprovalsPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  // FIX: Using 'business_id'
  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();

  if (!profile?.business_id) return <div className="p-10 text-center">Unauthorized: No Business ID found.</div>;

  return (
    <div className="container mx-auto py-8 px-4">
       <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Approvals Workflow</h1>
        <p className="text-muted-foreground">Track pending reviews and approval chains.</p>
      </div>
      <ProcurementApprovalWorkflow tenantId={profile.business_id} />
    </div>
  );
}