// src/app/(dashboard)/api-gateway/page.tsx (or wherever this file is)

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

// FIX: Default Import (No curly braces)
import OpenAPIGatewayPanel from '@/components/sacco/OpenAPIGatewayPanel';

// --- Type Definitions ---
interface AuthContext {
  user: any;
  tenantId: string | null;
}

// --- Async Functions ---
async function fetchAuthContext(): Promise<AuthContext> {
  const supabase = createClient();
  
  // 1. Authenticate User
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  // 2. Extract Tenant Context
  // We extract the Organization ID from the secure user metadata
  // Handling both app_metadata and user_metadata locations for robustness
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  return { user, tenantId };
}

export default function ApiGatewayPage() {
  const router = useRouter();

  // 3. Fetch Auth & Context Data using React Query
  // This ensures the page is protected and we have the necessary context before rendering
  const { data, isLoading, isError } = useQuery({
    queryKey: ['apiGatewayContext'],
    queryFn: fetchAuthContext,
    retry: false, // Fail immediately if auth token is invalid
    staleTime: 1000 * 60 * 5, // Cache auth state for 5 minutes
  });

  // 4. Handle Redirection on Error
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
        <span className="ml-2 text-muted-foreground">Verifying secure access...</span>
      </div>
    );
  }

  // Return null if we are redirecting (prevents flash of content)
  if (isError || !data) return null;

  const { tenantId } = data;

  // 6. Tenant Context Check
  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Access Denied:</strong> Your account is not linked to a valid Organization.
      </div>
    );
  }

  // 7. Render Success State
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">OpenAPI Gateway Configuration</h1>
      {/* 
         Based on your requirements, this component fetches its own data internally 
         and does not require props passed from the parent.
      */}
      <OpenAPIGatewayPanel />
    </div>
  );
}