import { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers'; // <--- ADDED: Required for Server Auth
import { createClient } from '@/lib/supabase/server';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import DsrClientView from './dsr-client-view';

export const metadata: Metadata = {
  title: 'Daily Sales Report | POS System',
  description: 'Shift management and sales tracking.',
};

export default async function DsrPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  // --- FIX: Pass cookies() to createClient ---
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // 2. Parallel Data Fetching
  // We use Promise.all to ensure the page loads as fast as possible (Enterprise Performance)
  const [activeShiftResult, locationsResult, servicesResult] = await Promise.all([
    // A. Active Shift
    supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .is('end_time', null)
      .maybeSingle(),

    // B. Locations
    supabase
      .from('locations')
      .select('id, name')
      .eq('status', 'active') // Ensure we only get active locations
      .order('name'),

    // C. Services
    supabase
      .from('services')
      .select('id, service_name')
      .order('service_name')
  ]);

  // 3. Error Handling
  if (locationsResult.error || servicesResult.error) {
    console.error("Critical DSR Data Load Error:", locationsResult.error || servicesResult.error);
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>System Configuration Error</AlertTitle>
          <AlertDescription>
            Unable to load necessary location or service data. Please contact IT support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 4. Data Transformation (Strict Type Safety)
  const locations = locationsResult.data?.map(l => ({
    id: String(l.id),
    name: l.name
  })) || [];

  const services = servicesResult.data?.map(s => ({
    id: Number(s.id),
    service_name: s.service_name
  })) || [];

  // 5. Render
  return (
    <Suspense fallback={<DsrSkeleton />}>
      <DsrClientView 
        user={user}
        activeShift={activeShiftResult.data}
        locations={locations}
        services={services}
      />
    </Suspense>
  );
}

// --- Loading Skeleton ---
function DsrSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-[1px] w-full bg-muted" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-2 h-96 bg-muted animate-pulse rounded-xl" />
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>
  );
}