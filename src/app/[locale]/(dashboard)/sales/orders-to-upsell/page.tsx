// REMOVED: 'use server'; (This was causing the build error)

import { Suspense } from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AlertCircle, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import UpsellClientView, { UpsellOpportunity } from './upsell-client-view';

export const metadata: Metadata = {
  title: 'Upsell Opportunities | Enterprise Sales Intelligence',
  description: 'Identify high-value upsell targets through system-wide data analysis.',
};

/**
 * Enterprise Upsell Engine (Fully Autonomous Version)
 */
export default async function UpsellPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. AUTHENTICATION & MULTI-TENANT RESOLUTION
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // Resolving business context AND currency/locale settings for this tenant
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id, currency') // Fetching currency dynamically for multi-tenancy
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.business_id) {
    console.error("Upsell Page - Profile Resolution Error:", profileError);
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Context Missing</AlertTitle>
          <AlertDescription>Your account is not correctly linked to a business tenant. Please contact support.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const business_id = profile.business_id;
  const tenantCurrency = profile.currency || 'UGX'; // Fallback if not set

  // 2. SYSTEM-WIDE INTELLIGENCE FETCHING
  const { data: opportunities, error: upsellError } = await supabase
    .from('view_upsell_opportunities')
    .select('*')
    .eq('business_id', business_id)
    .gte('upsell_score', 60)
    .order('upsell_score', { ascending: false });

  if (upsellError) {
    console.error("Upsell Page - Data Sync Error:", upsellError);
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Synchronization Error</AlertTitle>
          <AlertDescription>The Sales Intelligence module could not connect to your live order history.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // 3. FINAL CONNECTED UI RENDER
  return (
    <Suspense fallback={<UpsellSkeleton />}>
      <UpsellClientView 
        opportunities={(opportunities as UpsellOpportunity[]) || []} 
        locale={locale}          // Passing current route locale
        currency={tenantCurrency} // Passing dynamic tenant currency
      />
    </Suspense>
  );
}

/**
 * Enterprise Loading State
 */
function UpsellSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
         </div>
         <div className="h-24 w-64 bg-primary/10 animate-pulse rounded-xl border border-primary/20" />
      </div>
      
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-12 w-full bg-muted/50 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 text-primary animate-spin opacity-20" />
      </div>
    </div>
  );
}