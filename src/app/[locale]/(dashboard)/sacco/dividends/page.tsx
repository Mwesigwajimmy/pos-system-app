// src/app/(dashboard)/dividends/page.tsx

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// FIX: Named Import (With curly braces) matching your component export
import { DividendManager } from '@/components/sacco/DividendManager';

// --- Type Definitions ---
interface DividendContext {
  tenantId: string | undefined;
}

// --- Async Functions ---
async function fetchDividendContext(): Promise<DividendContext> {
  const supabase = createClient();

  // 1. Client-Side Authentication
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  // 2. Secure Tenant Resolution
  // We extract the Organization ID from the secure user metadata
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  return { tenantId };
}

export default function DividendsPage() {
  const router = useRouter();

  // 3. Fetch Context using React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dividendsPageContext'],
    queryFn: fetchDividendContext,
    retry: false, // Fail immediately if auth token is invalid
    staleTime: 1000 * 60 * 5, // Cache auth state for 5 minutes
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
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Initializing dividend manager...</span>
      </div>
    );
  }

  // Prevent rendering if there was an error (while redirect happens)
  if (isError || !data) return null;

  const { tenantId } = data;

  // 6. Handle Missing Tenant Configuration
  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Configuration Error:</strong> Your account is not linked to a valid tenant Organization.
      </div>
    );
  }

  // 7. Render Success State
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Dividend Management</h1>
      
      {/* 
         FIX: Passed tenantId only. 
         The component fetches its own data internally using React Query.
      */}
      <DividendManager tenantId={tenantId} />
    </div>
  );
}