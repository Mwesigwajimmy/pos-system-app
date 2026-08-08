import React from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import SupplierRiskRegister from '@/components/procurement/SupplierRiskRegister';
import VendorRegistryClient from '@/components/procurement/VendorRegistryClient';

export default async function SuppliersPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  // FIX: Using 'business_id' for profile lookup
  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();

  if (!profile?.business_id) return <div className="p-10 text-center">Unauthorized: No Business ID found.</div>;

  return (
    <div className="container mx-auto py-8 px-4">
       <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Supplier Risk & Compliance</h1>
            <p className="text-muted-foreground">Monitor vendor performance, sanctions, and risk levels.</p>
        </div>
        
        {/* INTERCONNECT: Adding the trigger for the new Registry */}
        <VendorRegistryClient businessId={profile.business_id} />
      </div>
      
      <SupplierRiskRegister tenantId={profile.business_id} />
    </div>
  );
}