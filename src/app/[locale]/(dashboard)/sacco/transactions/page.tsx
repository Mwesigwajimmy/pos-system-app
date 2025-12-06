import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// FIX: Default Import (No curly braces)
import SaccoTransactionsTable from '@/components/sacco/SaccoTransactionsTable';

export default async function TransactionsPage() {
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
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
      </div>
      
      {/* 
         FIX: Removed 'initialData' prop and server-side fetch.
         The component handles data fetching via React Query internally.
      */}
      <SaccoTransactionsTable tenantId={tenantId} />
    </div>
  );
}