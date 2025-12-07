// src/app/(dashboard)/analytics/page.tsx (or wherever this file is)

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// FIX: Default Import (No curly braces) matching your component export
import BIAnalyticsDashboard from '@/components/sacco/BIAnalyticsDashboard';

// --- Async Functions ---
async function fetchUserAndTenant() {
  const supabase = createClient();
  
  // 1. Client-Side Authentication
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  // 2. Secure Tenant Resolution
  // We extract the Organization ID from the secure user metadata
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  return { user, tenantId };
}

export default function AnalyticsPage() {
  const router = useRouter();

  // 3. Fetch data using React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analyticsUser'],
    queryFn: fetchUserAndTenant,
    retry: false,
  });

  // 4. Handle Redirection if Error (Not authenticated)
  useEffect(() => {
    if (isError) {
      router.push('/auth/login');
    }
  }, [isError, router]);

  // 5. Loading State
  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  // Prevent rendering if there was an error (while redirect happens)
  if (isError || !data) return null;

  const { tenantId } = data;

  // 6. Handle Missing Tenant Configuration
  if (!tenantId) {
    return (
      <div className="p-6 text-red-600 bg-red-50 border border-red-200 rounded m-4">
        <strong>Configuration Error:</strong> Your account is not linked to a valid tenant Organization.
      </div>
    );
  }

  // 7. Render Component
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Business Intelligence Analytics</h1>
      
      {/* 
         We only pass tenantId. The component handles the data fetching internally 
         using React Query as seen in your code.
      */}
      <BIAnalyticsDashboard tenantId={tenantId} />
    </div>
  );
}