import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// FIX: Default Import (No curly braces)
import KYCManager from '@/components/sacco/KYCManager';

export default async function KYCPage() {
  // 1. Server-Side Authentication
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 2. Authorization & Tenant Scoping
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KYC Compliance Manager</h1>
          <p className="text-muted-foreground">Review and approve member identity documents.</p>
        </div>
      </div>
      
      {/* 
         FIX: Passed tenantId only.
         Removed initialData prop because the component fetches its own data.
      */}
      <KYCManager tenantId={tenantId} />
    </div>
  );
}