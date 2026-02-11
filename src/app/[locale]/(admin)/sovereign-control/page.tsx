"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  ShieldAlert, Activity, Globe, DollarSign, 
  UserPlus, Terminal, Cpu, Zap, Search, Eye, EyeOff, Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// --- Interfaces ---
interface TelemetryLog {
  id: string;
  created_at: string;
  event_name: string;
  event_category: string;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tenant_id?: string;
  metadata?: { path?: string };
}

interface RevenueNode {
  tenant_id: string;
  tenant_name: string;
  active_users: number;
  ltv_revenue: number;
  subscription_status: string;
  history: number[];
}

interface PulseBucket {
  bucket_index: number;
  event_count: number;
}

export default function SovereignControlPanel() {
  const [telemetry, setTelemetry] = useState<TelemetryLog[]>([]);
  const [revenue, setRevenue] = useState<RevenueNode[]>([]);
  const [pulse, setPulse] = useState<PulseBucket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Persistent UI State
  const [showSensitive, setShowSensitive] = useState(false);
  const [mounted, setMounted] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Sync Sensitive View preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sovereign-sensitive-view');
    if (saved) setShowSensitive(JSON.parse(saved));
    setMounted(true);
  }, []);

  const toggleSensitive = () => {
    setShowSensitive((prev) => {
      const next = !prev;
      localStorage.setItem('sovereign-sensitive-view', JSON.stringify(next));
      return next;
    });
  };

  // 1. AUTHORITATIVE DATA RECONCILIATION
  const loadIntelligence = useCallback(async () => {
    try {
      const [tel, rev, pulseData] = await Promise.all([
        supabase.from('system_global_telemetry').select('*').order('created_at', { ascending: false }).limit(25),
        supabase.from('view_admin_global_revenue').select('*'),
        supabase.rpc('get_system_pulse_buckets')
      ]);

      if (tel.data) setTelemetry(tel.data);
      if (rev.data) setRevenue(rev.data);
      if (pulseData.data) setPulse(pulseData.data);
    } catch (e) {
      console.error('CRITICAL_UPLINK_ERROR', e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2. REAL-TIME SENTINEL
  useEffect(() => {
    loadIntelligence();

    const channel = supabase
      .channel('sovereign_realtime')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' }, 
        (payload) => {
          // Optimistic update for zero-latency feel
          setTelemetry(prev => [payload.new as TelemetryLog, ...prev].slice(0, 25));
          // authoritative background sync for charts/stats
          loadIntelligence();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadIntelligence]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-6 lg:p-10 font-mono selection:bg-blue-500/30">
      
      {/* HEADER HUD */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 border-b border-white/5 pb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-2">
            <Cpu size={14} className="animate-pulse" /> Architect Grade Oversight
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic">
            Command<span className="text-blue-600">_HQ</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex items-center gap-8 backdrop-blur-xl">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">System Integrity</span>
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                VERIFIED_SEALED
              </span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Global Sentinels</span>
              <span className="text-white font-bold tabular-nums">2,808 ACTIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-400">
              <Search size={18} />
            </button>
            <button
              onClick={toggleSensitive}
              className={cn(
                "p-4 border rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                showSensitive ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/5 text-slate-400"
              )}
            >
              {showSensitive ? <Eye size={18} /> : <EyeOff size={18} />}
              {showSensitive ? "Mask Data" : "Reveal Sensitive"}
            </button>
          </div>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricBox 
          title="Vector Traffic" 
          value={telemetry.length} 
          icon={Globe} 
          color="text-blue-400" 
          chartData={pulse} 
        />
        <MetricBox 
          title="Node Expansion" 
          value={revenue.reduce((acc, r) => acc + r.active_users, 0)} 
          icon={UserPlus} 
          color="text-emerald-400" 
          chartData={pulse} 
        />
        <MetricBox 
          title="Revenue Pipeline" 
          value={revenue.reduce((acc, r) => acc + r.ltv_revenue, 0)} 
          icon={DollarSign} 
          color="text-yellow-400" 
          isCurrency 
          chartData={pulse} 
        />
        <MetricBox 
          title="Anomalies" 
          value={telemetry.filter(l => l.severity_level === 'CRITICAL').length} 
          icon={ShieldAlert} 
          color="text-red-500" 
          chartData={pulse} 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* LIVE ACTIVITY FEED */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-slate-900/20 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-2xl min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black uppercase flex items-center gap-3">
                <Terminal className="text-blue-500" /> System_Activity_Stream
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Updates</span>
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              </div>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-slate-700" /></div>
              ) : (
                telemetry.map(log => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter",
                        log.severity_level === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-blue-900/30 text-blue-400'
                      )}>
                        {log.event_category}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{log.event_name}</p>
                        <p className="text-[10px] text-slate-600 font-mono italic">
                          {log.metadata?.path || 'Root_Interconnect'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-500 font-mono mb-1">
                         {new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                       </p>
                       {showSensitive && (
                         <p className="text-[9px] text-blue-500/50 font-mono animate-in fade-in">
                           UID: {log.tenant_id?.slice(0, 12)}...
                         </p>
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ORGANIZATION REVENUE MONITOR */}
        <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 flex flex-col">
          <h3 className="text-xl font-black uppercase flex items-center gap-3 mb-10">
            <Activity className="text-emerald-500" /> Asset_Health
          </h3>
          <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2">
            {revenue.map((biz) => (
              <div key={biz.tenant_id} className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{biz.tenant_name}</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{biz.active_users} Active Nodes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-400 tabular-nums">
                      ${biz.ltv_revenue.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="text-[8px] border-emerald-500/20 text-emerald-500 uppercase">
                      {biz.subscription_status}
                    </Badge>
                  </div>
                </div>

                <div className="h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={biz.history.map((val, i) => ({ x: i, y: val }))}>
                      <defs>
                        <linearGradient id={`grad-${biz.tenant_id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="y" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        fill={`url(#grad-${biz.tenant_id})`} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- KPI COMPONENT ---
function MetricBox({ title, value, icon: Icon, color, chartData, isCurrency = false }: any) {
  return (
    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] hover:border-blue-500/30 transition-all group overflow-hidden relative">
      <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
        <Icon size={120} />
      </div>

      <div className="flex justify-between items-start relative z-10 mb-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{title}</p>
          <p className={cn("text-4xl font-black tracking-tighter tabular-nums leading-none", color)}>
            {isCurrency ? `$${value.toLocaleString()}` : value.toLocaleString()}
          </p>
        </div>
        <Icon size={24} className="text-slate-700" />
      </div>

      <div className="h-12 w-full opacity-50 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line 
              type="stepAfter" 
              dataKey="event_count" 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
        <Zap size={10} className="animate-pulse" /> Live System Flux
      </div>
    </div>
  );
}