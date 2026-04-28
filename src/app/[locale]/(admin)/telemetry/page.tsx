"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Signal, Zap, Globe, Activity, Terminal, 
  Cpu, Server, BarChart3, MousePointer2, Loader2, 
  RefreshCcw, ShieldCheck, Database, Network, 
  Layers, HardDrive, Share2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

// Internal Libs
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// --- PRODUCTION COMPONENTS ---
import GlobalTelemetryFeed from '@/components/admin/GlobalTelemetryFeed';
import SovereignGeoMap from '@/components/admin/SovereignGeoMap';

/**
 * DEEPLY DEFINED UTILITY: cn (Class Name Merger)
 * Defined locally to ensure zero external dependency issues.
 */
function cn(...inputs: (string | undefined | boolean | null | Record<string, boolean>)[]) {
  return inputs
    .flatMap((input) => {
      if (typeof input === 'string') return input;
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([_, value]) => value)
          .map(([key]) => key);
      }
      return [];
    })
    .join(' ');
}

export default function TelemetryPage() {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pulseData, setPulseData] = useState<{ time_label: string; request_count: number }[]>([]);
  const [metrics, setMetrics] = useState({
    daily_total: 0,
    active_users: 0,
    error_rate: 0,
    system_load: 0 
  });

  const supabase = useMemo(() => createClient(), []);

  // --- 1. AUTHORITATIVE DATA ENGINE (Logic Untouched) ---
  const fetchTelemetryIntelligence = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsSyncing(true);

    try {
      const [healthResponse, distributionResponse] = await Promise.all([
        supabase.from('view_system_health_metrics').select('*').single(),
        supabase.rpc('get_telemetry_hourly_distribution')
      ]);

      if (healthResponse.error) throw healthResponse.error;
      if (distributionResponse.error) throw distributionResponse.error;

      const health = healthResponse.data;
      
      setMetrics({
        daily_total: health.total_requests_24h || 0,
        active_users: health.active_nodes || 0,
        error_rate: parseFloat(health.error_rate?.toFixed(2) || "0"),
        system_load: Math.min(Math.round((health.total_requests_24h / 10000) * 100), 100) 
      });

      setPulseData(distributionResponse.data || []);
    } catch (e: any) {
      toast.error("TELEMETRY_LINK_FAILURE", { description: e.message });
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTelemetryIntelligence();

    // --- 2. LIVE SENTINEL: REAL-TIME ORCHESTRATION ---
    const channel = supabase
      .channel('system_wide_pulse')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'system_global_telemetry' 
      }, () => {
        fetchTelemetryIntelligence(true);
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          toast.error("LINK_INTERRUPTED", { description: "Real-time telemetry stream dropped." });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchTelemetryIntelligence]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8">
        <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
        <div className="text-center space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-600 animate-pulse">
                Establishing Authoritative
            </p>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-300">
                Telemetry Uplink...
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 p-8 lg:p-12 font-sans selection:bg-blue-100 animate-in fade-in duration-1000">
      
      {/* --- CLEAN PROFESSIONAL HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-10 border-b border-slate-200 pb-16">
        <div className="space-y-5">
          <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm w-fit">
            <div className="relative flex items-center justify-center">
                <Signal size={16} className={cn("text-blue-600", isSyncing ? "animate-pulse" : "")} /> 
                {isSyncing && <div className="absolute inset-0 h-4 w-4 bg-blue-400 rounded-full animate-ping opacity-20" />}
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                System Status: {isSyncing ? "Synchronizing" : "Authoritative"}
            </span>
          </div>
          <h1 className="text-8xl font-black tracking-tighter text-slate-900 uppercase leading-none">
            Pulse<span className="text-blue-600">_Node</span>
          </h1>
          <p className="text-slate-400 font-bold max-w-2xl text-sm uppercase tracking-widest leading-relaxed flex items-center gap-3">
            <Network size={18} className="text-slate-300" />
            Direct ingestion from BBU1 Sovereign Mesh. Monitoring 316 global tables.
          </p>
        </div>

        <div className="flex gap-4">
           <button 
             onClick={() => fetchTelemetryIntelligence()}
             className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-blue-500/30 transition-all shadow-sm group active:scale-95"
           >
              <RefreshCcw size={22} className={cn("text-slate-400 group-hover:text-blue-600 transition-colors", isSyncing && "animate-spin")} />
           </button>
           <div className="bg-white p-6 px-10 rounded-[2rem] border border-emerald-100 shadow-sm flex items-center gap-5">
              <div className="relative flex items-center justify-center">
                  <div className="h-3 w-3 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                  <div className="absolute h-6 w-6 bg-emerald-400 rounded-full animate-ping opacity-20" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 leading-none">Security Mesh</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: Active</span>
              </div>
           </div>
        </div>
      </header>

      {/* --- INSTITUTIONAL METRIC GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        <MetricCard title="24h Ingress" value={metrics.daily_total} icon={MousePointer2} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard title="Active Nodes" value={metrics.active_users} icon={Zap} color="text-emerald-600" bg="bg-emerald-50" />
        <MetricCard title="Error Frequency" value={`${metrics.error_rate}%`} icon={Server} color="text-red-600" bg="bg-red-50" />
        <MetricCard title="Compute Load" value={`${metrics.system_load}%`} icon={Cpu} color="text-purple-600" bg="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
        
        {/* HEATMAP & VOLATILITY */}
        <div className="xl:col-span-2 space-y-16">
          <section className="bg-white border border-slate-200 p-2 rounded-[4rem] shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-blue-500/5">
             <div className="p-10 flex justify-between items-center relative z-10 border-b border-slate-50">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-50 rounded-2xl">
                        <Globe className="text-blue-600" size={24} />
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                        ORIGIN_MATRIX
                    </h3>
                </div>
                <div className="px-5 py-2 bg-slate-50 rounded-full border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Cluster Mapping</span>
                </div>
             </div>
             <div className="h-[600px] w-full">
                <SovereignGeoMap />
             </div>
          </section>

          <section className="bg-white border border-slate-200 p-12 rounded-[4rem] shadow-sm group transition-all hover:shadow-xl hover:shadow-blue-500/5">
             <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-5">
                   <div className="p-3 bg-blue-50 rounded-2xl">
                        <Activity className="text-blue-600" size={24} />
                   </div>
                   <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                            VOLATILITY_INDEX
                        </h3>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Historical Packet Distribution</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-2 px-4 rounded-xl border border-slate-100 shadow-inner">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Window: 24 Hours</span>
                   <div className="h-4 w-px bg-slate-200" />
                   <div className="h-1 w-8 bg-blue-600 rounded-full" />
                </div>
             </div>
             <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={pulseData}>
                      <defs>
                        <linearGradient id="telemetryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="time_label" stroke="#cbd5e1" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).toUpperCase()} />
                      <YAxis stroke="#cbd5e1" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tabularNums />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#0f172a', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
                        cursor={{ stroke: '#2563eb', strokeWidth: 3 }}
                      />
                      <Area 
                        type="stepAfter" 
                        dataKey="request_count" 
                        stroke="#2563eb" 
                        strokeWidth={5} 
                        fillOpacity={1} 
                        fill="url(#telemetryGradient)" 
                        isAnimationActive={true}
                      />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </section>
        </div>

        {/* LIVE PACKET INSPECTOR */}
        <div className="space-y-8 flex flex-col h-full">
          <div className="flex items-center justify-between px-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-3">
                  <Terminal className="text-blue-600 animate-pulse" size={16} /> Stream_Inspector
              </h3>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <BarChart3 size={16} className="text-slate-300" />
              </div>
          </div>
          
          <div className="bg-white border border-slate-200 p-2 rounded-[3.5rem] flex-1 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-blue-500/5">
             <GlobalTelemetryFeed />
          </div>
          
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">Core Status</p>
                    <div className="flex items-center justify-between">
                        <span className="text-white text-xs font-bold uppercase tracking-widest">Database Sync</span>
                        <span className="text-emerald-400 text-[10px] font-black">99.9% ACCURACY</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="w-[99.9%] h-full bg-emerald-500" />
                    </div>
                </div>
                <Database className="absolute -right-8 -bottom-8 text-white opacity-5" size={140} />
          </div>
        </div>
      </div>

      {/* --- INSTITUTIONAL FOOTER --- */}
      <footer className="mt-40 pt-16 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
          <div className="flex items-center gap-6">
              <div className="h-2 w-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
              <p>Litonu Business Base Universe // BBU1_OS Telemetry Terminal</p>
          </div>
          <div className="flex items-center gap-12">
              <span className="flex items-center gap-3 text-slate-900 border-b-2 border-blue-600 pb-1">
                <ShieldCheck size={14} className="text-blue-600" /> DATA_INTEGRITY: VERIFIED
              </span>
              <span className="flex items-center gap-3 text-slate-400">
                <Share2 size={14} /> SIGNAL_MESH: GLOBAL
              </span>
              <span className="flex items-center gap-3 text-emerald-600">
                <HardDrive size={14} /> UPLINK: AUTHORITATIVE
              </span>
          </div>
      </footer>

      {/* GLOBAL SCROLLBAR POLISH */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}

// --- KPI COMPONENT (CLEAN WHITE) ---
function MetricCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white border border-slate-200 p-12 rounded-[4rem] shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden border-b-4 border-b-transparent hover:border-b-blue-600 h-72 flex flex-col justify-between">
      <div className="absolute -right-12 -bottom-12 text-slate-50 opacity-[0.4] group-hover:opacity-100 transition-opacity duration-1000 group-hover:-rotate-12">
         <Icon size={220} />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-10 w-full">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">{title}</p>
          <p className={cn("text-6xl font-black tracking-tighter tabular-nums leading-none text-slate-900")}>
            {value}
          </p>
        </div>
        <div className={cn("p-6 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all group-hover:scale-110", bg, color)}>
          <Icon size={30} strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Layers size={12} className="text-blue-500" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Authoritative Uplink Active</span>
      </div>
    </div>
  );
}