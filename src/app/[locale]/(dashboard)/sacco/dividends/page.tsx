import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// FIX: Named Import (With curly braces) matching your component export
import { DividendManager } from '@/components/sacco/DividendManager';

export default async function DividendsPage() {
  // 1. Server-Side Authentication
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 2. Secure Tenant Resolution
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Configuration Error:</strong> Your account is not linked to a valid tenant Organization.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Dividend Management</h1>
      
      {/* 
         FIX: Passed tenantId only. 
         Removed 'data={dividends}' because your component fetches its own data internally.
      */}
      <DividendManager tenantId={tenantId} />
    </div>
  );
}