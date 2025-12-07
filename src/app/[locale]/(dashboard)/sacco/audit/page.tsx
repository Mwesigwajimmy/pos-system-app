// src/app/(dashboard)/audit/page.tsx

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// FIX: Default Import (No curly braces)
import StatAuditPanel from '@/components/sacco/StatAuditPanel';

// --- Type Definitions ---
interface AuditContext {
  tenantId: string;
}

// --- Async Functions ---
async function fetchAuditContext(): Promise<AuditContext> {
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

export default function AuditPage() {
  const router = useRouter();

  // 3. Fetch Context using React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['auditPageContext'],
    queryFn: fetchAuditContext,
    retry: false, // Fail immediately if not authenticated
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // 4. Handle Redirection if Authentication Fails
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
        <span className="ml-2 text-muted-foreground">Verifying audit permissions...</span>
      </div>
    );
  }

  // Prevent rendering if there was an error (while redirect happens)
  if (isError || !data) return null;

  const { tenantId } = data;

  // 6. Handle Missing Tenant Context
  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Error:</strong> Tenant Context Missing. Please contact support.
      </div>
    );
  }

  // 7. Render Success State
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Statutory Audit Logs</h1>
      {/* Passing tenantId as required by your component props */}
      <StatAuditPanel tenantId={tenantId} />
    </div>
  );
}