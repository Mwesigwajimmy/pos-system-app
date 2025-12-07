// src/app/(dashboard)/agent/page.tsx

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AgentMobilePortal } from '@/components/sacco/AgentMobilePortal';
import { Loader2 } from 'lucide-react';

// --- Async Functions ---
async function fetchAgentData() {
  const supabase = createClient();

  // 1. Authenticate User
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // 2. Fetch Tenant ID from the 'profiles' table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  return {
    agentId: user.id,
    tenantId: profile?.business_id
  };
}

export default function AgentPortalPage() {
  const router = useRouter();

  // 3. Fetch data using React Query (Just like the first file)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agentProfile'],
    queryFn: fetchAgentData,
    retry: false, // Do not retry if authentication fails
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
      <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading agent profile...</span>
      </div>
    );
  }

  // Prevent rendering if there was an error (while redirect happens)
  if (isError || !data) return null;

  const { tenantId, agentId } = data;

  // 6. Handle Missing Tenant Configuration
  if (!tenantId) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 text-red-700 rounded-md m-4">
        <strong>Configuration Error:</strong> Your account is not linked to a valid tenant Organization. 
        Please contact your system administrator.
      </div>
    );
  }

  // 7. Render Success State
  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col">
      <div className="p-6 border-b">
         <h1 className="text-3xl font-bold tracking-tight">Agent Mobile Portal</h1>
         <p className="text-sm text-gray-500">View of the mobile interface deployed to field agents</p>
      </div>
      <div className="flex-1 bg-gray-50 p-4 flex justify-center overflow-auto">
        <AgentMobilePortal tenantId={tenantId} agentId={agentId} />
      </div>
    </div>
  );
}