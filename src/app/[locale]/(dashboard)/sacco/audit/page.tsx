import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// FIX: Default Import (No curly braces)
import StatAuditPanel from '@/components/sacco/StatAuditPanel';

export default async function AuditPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // Secure Tenant Resolution
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Error:</strong> Tenant Context Missing. Please contact support.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Statutory Audit Logs</h1>
      {/* Passing tenantId as required by your component props */}
      <StatAuditPanel tenantId={tenantId} />
    </div>
  );
}