import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// FIX: Default Import (No curly braces) matching your component export
import BIAnalyticsDashboard from '@/components/sacco/BIAnalyticsDashboard';

export default async function AnalyticsPage() {
  // 1. Server-Side Authentication
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  // 2. Secure Tenant Resolution
  // We extract the Organization ID from the secure user metadata
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  if (!tenantId) {
    return (
      <div className="p-6 text-red-600 bg-red-50 border border-red-200 rounded m-4">
        <strong>Configuration Error:</strong> Your account is not linked to a valid tenant Organization.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Business Intelligence Analytics</h1>
      
      {/* 
         3. Render Component 
         We only pass tenantId. The component handles the data fetching internally 
         using React Query as seen in your code.
      */}
      <BIAnalyticsDashboard tenantId={tenantId} />
    </div>
  );
}