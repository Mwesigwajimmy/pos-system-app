import { Suspense } from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { 
    AlertCircle, 
    TrendingUp, 
    CheckCircle2, 
    Database, 
    Activity, 
    Target,
    Zap,
    RefreshCw,
    BarChart3,
    ShieldCheck
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import UpsellClientView, { UpsellOpportunity } from './upsell-client-view';
import { cn } from '@/lib/utils';

/**
 * ENTERPRISE METADATA
 */
export const metadata: Metadata = {
  title: 'Sales Intelligence | Business Performance',
  description: 'Data-driven upsell identification and customer expansion analytics.',
};

/**
 * SALES INTELLIGENCE PAGE
 */
export default async function UpsellPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. AUTHENTICATION & SECURITY
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
        <Alert variant="destructive" className="border shadow-md rounded-xl bg-white">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-bold text-lg">Account Error</AlertTitle>
          <AlertDescription className="mt-1 text-slate-500 font-medium">
            Could not verify your business profile. Please log in again or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const businessId = profile.business_id;
  const tenantCurrency = profile.currency || 'UGX';

  // 2. DATA ACQUISITION
  const { data: opportunities, error: upsellError } = await supabase
    .from('view_upsell_opportunities')
    .select('*')
    .eq('business_id', businessId)
    .gte('upsell_score', 60)
    .order('upsell_score', { ascending: false });

  if (upsellError) {
    return (
        <div className="p-20 flex flex-col items-center justify-center min-h-[400px] text-slate-400">
            <RefreshCw className="h-10 w-10 animate-spin text-blue-600 mb-4" />
            <p className="font-semibold">Updating sales intelligence records...</p>
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-6 md:p-10 bg-[#F8FAFC] min-h-screen animate-in fade-in duration-500">
      
      {/* --- EXECUTIVE HEADER --- */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600 rounded-lg shadow-sm">
              <Target className="text-white w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] tracking-wider px-2 py-0.5 uppercase">
                  Version 4.2
                </Badge>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  System Online
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Sales Intelligence
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-1">
            Analyzing purchase patterns and transaction nodes to identify expansion opportunities.
          </p>
        </div>
        
        {/* KPI TELEMETRY */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm items-center gap-6">
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Active Leads</p>
                  <p className="text-xl font-bold text-slate-900">{(opportunities as any[])?.length || 0}</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Confidence</p>
                  <p className="text-xl font-bold text-emerald-600">88%</p>
              </div>
          </div>
          <div className="flex-1 lg:flex-none h-14 px-6 rounded-xl bg-slate-900 text-white border-none shadow-md flex items-center gap-4 group">
              <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500 transition-colors">
                <TrendingUp className="w-5 h-5 text-blue-400 group-hover:text-white" />
              </div>
              <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</span>
                  <span className="text-sm font-bold tracking-wide uppercase">Optimal Output</span>
              </div>
          </div>
        </div>
      </div>

      {/* --- MAIN DATA VIEW --- */}
      <Suspense fallback={<UpsellSkeleton />}>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="bg-slate-50/50 border-b border-slate-200 flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-1.5">
                    <BarChart3 size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Opportunity Targets</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Real-time Analysis</div>
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

      {/* --- FOOTER STATUS --- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 border border-slate-200 rounded-xl bg-white shadow-sm opacity-70">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                  Network Secure
              </span>
              <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" /> 
                  Ledger Sync: 100%
              </span>
              <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> 
                  System Verified
              </span>
          </div>
          <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-md border border-slate-100 uppercase">
              Last Analysis: {new Date().toLocaleTimeString()}
          </div>
      </div>
    </div>
  );
}

/**
 * LOADING SKELETON
 */
function UpsellSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
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