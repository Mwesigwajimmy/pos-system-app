import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// FIX: Default Import (No curly braces)
import ShareLedgerTable from '@/components/sacco/ShareLedgerTable';

export default async function SharesPage() {
  // 1. Server-Side Authentication
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 2. Tenant Context Resolution
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Error:</strong> Tenant configuration missing. Please contact support.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Share Capital Ledger</h1>
      
      {/* 
         FIX: Component fetches its own data internally using React Query.
         Only passing tenantId is required.
      */}
      <ShareLedgerTable tenantId={tenantId} />
    </div>
  );
}