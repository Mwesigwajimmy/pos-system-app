// src/app/(dashboard)/savings/products/page.tsx

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import SavingsProductsManager from '@/components/sacco/SavingsProductsManager';

// --- Type Definitions ---
interface SavingsContext {
  tenantId: string;
}

// --- Async Functions ---
async function fetchSavingsContext(): Promise<SavingsContext> {
  const supabase = createClient();

  // 1. Authenticate User
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  // 2. Get Tenant ID safely
  // Preserving the logic from your original file:
  // Checking metadata first, falling back to user.id if necessary.
  // We also check app_metadata for robustness (enterprise standard).
  const tenantId = 
    user.app_metadata?.tenant_id || 
    user.user_metadata?.tenant_id || 
    user.id;

  return { tenantId };
}

export default function SavingsProductsPage() {
  const router = useRouter();

  // 3. Fetch Context using React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['savingsProductsContext'],
    queryFn: fetchSavingsContext,
    retry: false, // Fail immediately if auth token is invalid
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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
        <span className="ml-2 text-muted-foreground">Loading product configurations...</span>
      </div>
    );
  }

  // Prevent rendering if there was an error (while redirect happens)
  if (isError || !data) return null;

  const { tenantId } = data;

  // 6. Render Success State
  return (
    <div className="container mx-auto py-6">
        <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Manage Savings Products</h1>
            <p className="text-muted-foreground">
                Create and manage the different types of savings accounts your SACCO offers.
            </p>
        </div>
        
        {/* 7. Pass tenantId to the Client Component */}
        <SavingsProductsManager tenantId={tenantId} />
    </div>
  );
}