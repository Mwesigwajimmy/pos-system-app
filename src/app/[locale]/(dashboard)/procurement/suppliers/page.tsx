import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import SupplierRiskRegister from '@/components/procurement/SupplierRiskRegister';

export default async function SuppliersPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user?.id).single();

  if (!profile?.organization_id) return <div>Unauthorized</div>;

  return (
    <div className="container mx-auto py-8 px-4">
       <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Supplier Risk & Compliance</h1>
        <p className="text-muted-foreground">Monitor vendor performance, sanctions, and risk levels.</p>
      </div>
      <SupplierRiskRegister tenantId={profile.organization_id} />
    </div>
  );
}