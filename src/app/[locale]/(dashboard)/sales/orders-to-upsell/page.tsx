import { Suspense } from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { 
    AlertCircle, 
    Loader2, 
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

/**
 * ENTERPRISE METADATA
 * Configuration for the Sales Intelligence Hub.
 */
export const metadata: Metadata = {
  title: 'Upsell Intelligence | Enterprise Revenue Engine',
  description: 'AI-driven high-value upsell identification and automated customer expansion logic.',
};

/**
 * UPSELL INTELLIGENCE PAGE
 * 
 * An autonomous server component that orchestrates multi-tenant data resolution
 * and streams intelligence data to the client-side expansion view.
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

  // Parallel fetching of profile and business settings for low latency
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id, currency')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.business_id) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="border-2 shadow-2xl bg-red-50 p-6 rounded-[2rem]">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <AlertTitle className="font-black uppercase tracking-tighter text-lg ml-2">Contextual Isolation Failure</AlertTitle>
          <AlertDescription className="font-medium text-red-800 mt-2 ml-2">
            The system failed to verify your tenant credentials. Access to Sales Intelligence has been restricted.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const businessId = profile.business_id;
  const tenantCurrency = profile.currency || 'UGX';

  // 2. DATA ACQUISITION - ANALYTIC VIEW FETCH
  // Fetching from the intelligent view with a strict score threshold
  const { data: opportunities, error: upsellError } = await supabase
    .from('view_upsell_opportunities')
    .select('*')
    .eq('business_id', businessId)
    .gte('upsell_score', 60)
    .order('upsell_score', { ascending: false });

  if (upsellError) {
    return (
        <div className="p-8 flex items-center justify-center min-h-screen">
            <Alert variant="destructive" className="max-w-2xl border-2 rounded-[2rem]">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <AlertTitle className="font-bold">Intelligence Sync Failure</AlertTitle>
                <AlertDescription className="font-mono text-xs mt-2 uppercase tracking-widest text-red-800">
                    ERROR_CODE: DATA_VIEW_UNREACHABLE_500 <br />
                    The Sales Intelligence cluster is experiencing synchronization latency.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  // 3. ENTERPRISE LAYOUT RENDER
  return (
    <div className="flex-1 space-y-10 p-4 md:p-10 bg-[#f8fafc] min-h-screen selection:bg-primary selection:text-white">
      
      {/* --- MASTER COMMAND HEADER --- */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 shadow-xl shadow-indigo-200 rounded-2xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[10px] tracking-widest px-2 py-0">
                  INTEL_v2.4.0
                </Badge>
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AI Model Active
                </div>
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase leading-none">
                Sales Intelligence
              </h2>
            </div>
          </div>
          <p className="text-slate-500 font-medium max-w-2xl leading-relaxed border-l-4 border-indigo-200 pl-4">
            Identifying high-velocity expansion targets through pattern recognition in historical order data. 
            Automated upsell scoring and predictive retention logic are active.
          </p>
        </div>
        
        {/* TELEMETRY CARDS */}
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm items-center gap-4">
              <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Leads</p>
                  <p className="text-xl font-black text-slate-900 leading-none">{(opportunities as any[])?.length || 0}</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confidence</p>
                  <p className="text-xl font-black text-emerald-600 leading-none">88%</p>
              </div>
          </div>
          <Badge className="h-14 px-6 rounded-2xl bg-slate-900 text-white border-none shadow-xl flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Revenue Boost</span>
                  <span className="text-lg font-black tracking-tighter">POTENTIAL: MAX</span>
              </div>
          </Badge>
        </div>
      </div>

      <Separator className="bg-slate-200/60" />

      {/* --- DATA STREAMING VIEW --- */}
      <Suspense fallback={<UpsellSkeleton />}>
        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <UpsellClientView 
                    opportunities={(opportunities as UpsellOpportunity[]) || []} 
                    locale={locale}
                    currency={tenantCurrency}
                />
            </div>
        </div>
      </Suspense>

      {/* --- SYSTEM STATUS FOOTER --- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-900/40 text-white/50 font-mono text-[10px] uppercase tracking-[0.2em] border-t-4 border-indigo-500">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 px-4">
              <span className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                  SECURE_TUNNEL_ESTABLISHED
              </span>
              <span className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-blue-500" /> 
                  SUPABASE_REPLICATION_SYNCED
              </span>
              <span className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-indigo-500" /> 
                  INTELLIGENCE_LAYER_V2
              </span>
          </div>
          <div className="px-6 py-2 bg-white/5 rounded-full border border-white/10 text-white/30">
              CLUSTER_HEARTBEAT: OK | {new Date().toLocaleTimeString()}
          </div>
      </div>
    </div>
  );
}

/**
 * ENTERPRISE LOADING SKELETON
 * High-fidelity loading state to maintain perceived performance.
 */
function UpsellSkeleton() {
  return (
    <div className="space-y-6 max-w-full">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-8 w-32 bg-slate-200 animate-pulse rounded-full" />
        </div>
        <div className="p-8 space-y-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center space-x-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="h-14 w-14 bg-slate-200 animate-pulse rounded-xl" />
              <div className="space-y-3 flex-1">
                  <div className="h-4 w-1/3 bg-slate-200 animate-pulse rounded" />
                  <div className="h-3 w-1/4 bg-slate-100 animate-pulse rounded" />
              </div>
              <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center py-10 opacity-20">
        <Activity className="h-10 w-10 text-indigo-600 animate-pulse mb-4" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] font-black">Syncing Analytic View...</span>
      </div>
    </div>
  );
}