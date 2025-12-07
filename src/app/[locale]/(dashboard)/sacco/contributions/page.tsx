// src/app/(dashboard)/contributions/page.tsx (or wherever this file is)

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { MemberContributionsTable } from '@/components/sacco/MemberContributionsTable';
import { Loader2 } from 'lucide-react';

// --- Type Definitions ---
interface ContributionsContext {
  tenantId: string | undefined;
}

// --- Async Functions ---
async function fetchContributionsContext(): Promise<ContributionsContext> {
  const supabase = createClient();

  // 1. Authenticate User
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  // 2. Extract Tenant Context
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  return { tenantId };
}

export default function ContributionsPage() {
  const router = useRouter();

  // 3. Fetch Context using React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['contributionsPageContext'],
    queryFn: fetchContributionsContext,
    retry: false, // Do not retry if authentication fails
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // 4. Handle Redirection if Error (Not authenticated)
  useEffect(() => {
    if (isError) {
      router.push('/login');
    }
  }, [isError, router]);

  // 5. Loading State
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading contributions data...</span>
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
        <strong>Error:</strong> Tenant ID not found. Contact administrator.
      </div>
    );
  }

  // 7. Render Success State
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Member Contributions</h1>
      {/* Component needs tenantId to query the correct 'collections' table rows */}
      <MemberContributionsTable tenantId={tenantId} />
    </div>
  );
}