// src/app/(dashboard)/register/page.tsx (or wherever this file is)

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// FIX: Default Import (No curly braces)
import NewMemberModal from '@/components/sacco/NewMemberModal'; 

// --- Type Definitions ---
interface RegistrationContext {
  tenantId: string | undefined;
}

// --- Async Functions ---
async function fetchRegistrationContext(): Promise<RegistrationContext> {
  const supabase = createClient();

  // 1. Client-Side Authentication
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  // 2. Tenant Context Resolution
  // We extract the Organization ID from the secure user metadata
  const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;

  return { tenantId };
}

export default function RegisterMemberPage() {
  const router = useRouter();

  // 3. Fetch Context using React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['registerPageContext'],
    queryFn: fetchRegistrationContext,
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
        <span className="ml-2 text-muted-foreground">Preparing registration form...</span>
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
        <strong>Error:</strong> Organization context missing. Please contact support.
      </div>
    );
  }

  // 7. Render Success State
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card className="shadow-md">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle>Member Registration</CardTitle>
          <CardDescription>
            Create a new SACCO membership account. This will generate a unique Member Number and default savings wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
           {/* 
              FIX: Passed required props including the fetched tenantId.
              isOpen={true} and isPageMode={true} allows it to render inline on the page 
              instead of as a popup.
           */}
           <NewMemberModal isOpen={true} isPageMode={true} tenantId={tenantId} />
        </CardContent>
      </Card>
    </div>
  );
}