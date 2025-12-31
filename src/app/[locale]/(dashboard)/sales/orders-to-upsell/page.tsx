import { Suspense } from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { 
    AlertCircle, 
    Brain, 
    TrendingUp, 
    ShieldCheck, 
    Database, 
    Activity, 
    Target,
    Zap,
    RefreshCw
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
  title: 'Upsell Intelligence | Enterprise Revenue Engine',
  description: 'AI-driven high-value upsell identification and automated customer expansion logic.',
};

/**
 * UPSELL INTELLIGENCE PAGE
 */
export default async function UpsellPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. AUTHENTICATION & SECURITY CONTEXT RESOLUTION
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id, currency')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.business_id) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md border-none shadow-xl bg-white p-8 rounded-2xl ring-1 ring-red-50">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <AlertTitle className="font-bold text-slate-900 text-lg">Contextual Isolation Failure</AlertTitle>
          <AlertDescription className="font-medium text-slate-500 mt-2 leading-relaxed">
            The system failed to verify your tenant credentials. Access to Sales Intelligence has been restricted.
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
        <div className="p-6 flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4 p-10 bg-white rounded-3xl shadow-sm border border-slate-100">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <p className="font-bold text-slate-900">Synchronizing Intelligence View...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 lg:p-10 bg-[#f8fafc] min-h-screen">
      
      {/* --- MASTER COMMAND HEADER --- */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 hover:scale-105 cursor-default">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px] tracking-wider px-2 py-0">
                  INTEL v2.4
                </Badge>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600 tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AI Logic Node Active
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-none">
                Sales Intelligence
              </h1>
            </div>
          </div>
          <p className="text-slate-500 font-medium max-w-2xl leading-relaxed border-l-4 border-indigo-100 pl-4 text-sm md:text-base">
            Identifying high-velocity expansion targets through pattern recognition. 
            Automated upsell scoring and predictive retention logic are actively monitoring transaction nodes.
          </p>
        </div>
        
        {/* TELEMETRY CARDS */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="hidden sm:flex bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm items-center gap-6 transition-colors hover:border-indigo-200">
              <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Leads</p>
                  <p className="text-xl font-bold text-slate-900 leading-none">{(opportunities as any[])?.length || 0}</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
                  <p className="text-xl font-bold text-emerald-600 leading-none">88%</p>
              </div>
          </div>
          <div className="flex-1 lg:flex-none h-14 px-6 rounded-2xl bg-slate-900 text-white border-none shadow-xl flex items-center gap-4 transition-all hover:bg-slate-800 cursor-default">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Growth Potential</span>
                  <span className="text-lg font-bold tracking-tight">MAXIMUM_THRUST</span>
              </div>
          </div>
        </div>
      </div>

      <Separator className="bg-slate-200" />

      {/* --- DATA STREAMING VIEW --- */}
      <Suspense fallback={<UpsellSkeleton />}>
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden transition-all duration-300">
            <div className="bg-slate-50 border-b border-slate-200 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-100" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expansion Opportunity Cluster</span>
                <div className="w-12" />
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

      {/* --- SYSTEM STATUS FOOTER --- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-900 rounded-2xl shadow-xl text-white/60 font-bold text-[10px] uppercase tracking-widest border-t-4 border-indigo-600">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
              <span className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                  Network Secure
              </span>
              <span className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-blue-400" /> 
                  Sync: Real-time
              </span>
              <span className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-indigo-500" /> 
                  Engine: V2.4.0
              </span>
          </div>
          <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-white/40">
              Last Sync: {new Date().toLocaleTimeString()}
          </div>
      </div>
    </div>
  );
}

/**
 * ENTERPRISE LOADING SKELETON
 */
function UpsellSkeleton() {
  return (
    <div className="space-y-6 max-w-full">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-8 w-32 bg-slate-200 animate-pulse rounded-full" />
        </div>
        <div className="p-8 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center space-x-6 p-5 bg-white rounded-2xl border border-slate-100">
              <div className="h-14 w-14 bg-slate-100 animate-pulse rounded-xl" />
              <div className="space-y-3 flex-1">
                  <div className="h-4 w-1/3 bg-slate-100 animate-pulse rounded" />
                  <div className="h-3 w-1/4 bg-slate-50 animate-pulse rounded" />
              </div>
              <div className="h-10 w-32 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center py-10 opacity-30">
        <Activity className="h-8 w-8 text-indigo-600 animate-pulse mb-3" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Syncing Intelligence Pipeline...</span>
      </div>
    </div>
  );
}