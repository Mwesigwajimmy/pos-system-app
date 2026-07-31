import { Suspense } from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  AlertCircle,
  Target,
  BarChart3,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import UpsellClientView, { UpsellOpportunity } from './upsell-client-view';

export const metadata: Metadata = {
  title: 'Sales Intelligence | Business Performance',
  description: 'Data-driven upsell identification and customer expansion analytics.',
};

export default async function UpsellPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id, currency')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.business_id) {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-20">
        <Alert variant="destructive" className="border shadow-sm rounded-lg bg-white">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">Account error</AlertTitle>
          <AlertDescription className="mt-1 text-slate-500">
            Could not verify your business profile. Please log in again or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const businessId = profile.business_id;
  const tenantCurrency = profile.currency || 'UGX';

  const { data: opportunities, error: upsellError } = await supabase
    .from('view_upsell_opportunities')
    .select('*')
    .eq('business_id', businessId)
    .gte('upsell_score', 60)
    .order('upsell_score', { ascending: false });

  if (upsellError) {
    return (
      <div className="p-8 max-w-4xl mx-auto mt-20">
        <Alert variant="destructive" className="border shadow-sm rounded-lg bg-white">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">Couldn't load sales opportunities</AlertTitle>
          <AlertDescription className="mt-1 text-slate-500">
            {upsellError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-10 bg-slate-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg">
              <Target className="text-white w-5 h-5" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Sales intelligence
            </h1>
          </div>
          <p className="text-sm text-slate-500 ml-1">
            Purchase patterns and transaction history, analyzed for expansion opportunities.
          </p>
        </div>

        <div className="flex bg-white px-5 py-3 rounded-lg border border-slate-200 items-center gap-6">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Active leads</p>
            <p className="text-lg font-semibold text-slate-900">{(opportunities as any[])?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Data view */}
      <Suspense fallback={<UpsellSkeleton />}>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 px-6 py-3">
            <BarChart3 size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Opportunity targets</span>
          </div>
          <div className="p-0">
            <UpsellClientView
              opportunities={(opportunities as UpsellOpportunity[]) || []}
              locale={locale}
              currency={tenantCurrency}
            />
          </div>
        </div>
      </Suspense>
    </div>
  );
}

function UpsellSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
          <div className="h-6 w-24 bg-slate-200 animate-pulse rounded-full" />
        </div>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-slate-100">
              <div className="h-12 w-12 bg-slate-100 animate-pulse rounded-lg" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/4 bg-slate-100 animate-pulse rounded" />
                <div className="h-3 w-1/5 bg-slate-50 animate-pulse rounded" />
              </div>
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}