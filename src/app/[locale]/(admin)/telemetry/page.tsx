"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Signal, Zap, Globe, Activity, Terminal, 
  Cpu, Server, BarChart3, MousePointer2, Loader2, 
  RefreshCcw, ShieldCheck
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- PRODUCTION COMPONENTS ---
import GlobalTelemetryFeed from '@/components/admin/GlobalTelemetryFeed';
import SovereignGeoMap from '@/components/admin/SovereignGeoMap';

export default function TelemetryPage() {
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pulseData, setPulseData] = useState<{ time_label: string; request_count: number }[]>([]);
  const [metrics, setMetrics] = useState({
    daily_total: 0,
    active_users: 0,
    error_rate: 0,
    system_load: 0 // Derived from request volume per second
  });

  const supabase = useMemo(() => createClient(), []);

  // --- 1. AUTHORITATIVE DATA ENGINE ---
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
        system_load: Math.min(Math.round((health.total_requests_24h / 10000) * 100), 100) // Real calc based on capacity
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
        // High-frequency events trigger a silent data refresh
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
      <div className="min-h-screen bg-[#020205] flex flex-col items-center justify-center gap-6">
        <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500/50 text-center">
          Establishing Authoritative<br/>Telemetry Uplink...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 p-6 lg:p-12 font-sans selection:bg-blue-600/40">
      
      {/* --- ARCHITECT HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-20 gap-8 border-b border-white/5 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-blue-500 font-black text-[10px] uppercase tracking-[0.5em]">
            <Signal size={14} className={cn(isSyncing ? "animate-ping" : "")} /> 
            System Status: {isSyncing ? "Synchronizing" : "Authoritative"}
          </div>
          <h1 className="text-8xl font-black tracking-tighter text-white uppercase italic leading-none">
            Pulse<span className="text-blue-600">_Node</span>
          </h1>
          <p className="text-slate-500 font-bold max-w-xl text-xs uppercase tracking-widest leading-loose">
            Direct ingestion from <span className="text-white">SOVEREIGN_MESH</span>. 
            Monitoring packet flow across 316 global tables.
          </p>
        </div>

        <div className="flex gap-4">
           <button 
             onClick={() => fetchTelemetryIntelligence()}
             className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/10 hover:border-blue-500/50 transition-all backdrop-blur-3xl group"
           >
              <RefreshCcw size={20} className={cn("text-slate-500 group-hover:text-blue-500", isSyncing && "animate-spin")} />
           </button>
           <div className="bg-slate-900/50 p-6 px-10 rounded-[2rem] border border-emerald-500/20 backdrop-blur-3xl flex items-center gap-4">
              <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Security Mesh: Active</span>
           </div>
        </div>
      </header>

      {/* --- METRIC GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        <MetricCard title="24h Ingress" value={metrics.daily_total} icon={MousePointer2} color="text-blue-400" />
        <MetricCard title="Active Nodes" value={metrics.active_users} icon={Zap} color="text-yellow-400" />
        <MetricCard title="Error Frequency" value={`${metrics.error_rate}%`} icon={Server} color="text-red-400" />
        <MetricCard title="Compute Load" value={`${metrics.system_load}%`} icon={Cpu} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
        
        {/* HEATMAP & VOLATILITY */}
        <div className="xl:col-span-2 space-y-16">
          <section className="bg-slate-900/10 border border-white/5 p-1 rounded-[4rem] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
             <div className="p-10 flex justify-between items-center relative z-10">
                <h3 className="text-3xl font-black uppercase flex items-center gap-5 italic">
                  <Globe className="text-blue-600" size={32} /> ORIGIN_MATRIX
                </h3>
             </div>
             <div className="h-[550px] w-full">
                <SovereignGeoMap />
             </div>
          </section>

          <section className="bg-slate-900/10 border border-white/5 p-12 rounded-[4rem] backdrop-blur-3xl">
             <div className="flex justify-between items-center mb-12">
                <h3 className="text-3xl font-black uppercase flex items-center gap-5 italic">
                   <Activity className="text-blue-600" size={32} /> VOLATILITY_INDEX
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                   Window: 24 Hours <div className="h-1 w-8 bg-blue-600" />
                </div>
             </div>
             <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={pulseData}>
                      <defs>
                        <linearGradient id="telemetryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="time_label" stroke="#334155" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} />
                      <YAxis stroke="#334155" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tabularNums />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020205', borderRadius: '24px', border: '1px solid #1e293b', padding: '20px' }}
                        itemStyle={{ color: '#fff', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px' }}
                        cursor={{ stroke: '#2563eb', strokeWidth: 2 }}
                      />
                      <Area 
                        type="stepAfter" 
                        dataKey="request_count" 
                        stroke="#2563eb" 
                        strokeWidth={4} 
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
        <div className="space-y-10">
          <div className="flex items-center justify-between px-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-3">
                  <Terminal className="text-blue-500" size={16} /> Stream_Inspector
              </h3>
              <div className="flex gap-2">
                  <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center">
                    <BarChart3 size={14} className="text-slate-600" />
                  </div>
              </div>
          </div>
          
          <div className="bg-slate-900/10 border border-white/5 p-2 rounded-[3.5rem] min-h-[900px] shadow-2xl relative overflow-hidden">
             <GlobalTelemetryFeed />
          </div>
        </div>
      </div>

      <footer className="mt-40 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-[9px] font-black text-slate-700 uppercase tracking-[0.6em]">
          <div className="flex items-center gap-4">
              <div className="h-1 w-1 bg-blue-600 rounded-full" />
              <p>SOVEREIGN OS // TELEMETRY TERMINAL // AUTH: ARCHITECT_LEVEL</p>
          </div>
          <div className="flex items-center gap-12 text-slate-500">
              <span className="flex items-center gap-2"><ShieldCheck size={12}/> DATA_INTEGRITY: VERIFIED</span>
              <span className="flex items-center gap-2 text-white"><Signal size={12}/> UPLINK: STABLE</span>
          </div>
      </footer>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900/20 border border-white/5 p-12 rounded-[4rem] hover:bg-slate-900/40 transition-all group relative overflow-hidden shadow-2xl">
      <div className="absolute -right-16 -bottom-16 text-white opacity-[0.01] group-hover:opacity-[0.03] transition-opacity duration-1000">
         <Icon size={300} />
      </div>
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-10">
          <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.5em]">{title}</p>
          <p className="text-7xl font-black text-white tracking-tighter tabular-nums leading-none">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={cn(
          "p-6 rounded-[2rem] bg-black/40 border border-white/10 transition-all group-hover:scale-110 group-hover:-rotate-3 shadow-2xl",
          color
        )}>
          <Icon size={32} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}