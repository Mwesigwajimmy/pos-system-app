"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  ShieldAlert, Activity, Globe, DollarSign, 
  UserPlus, Terminal, Cpu, Zap, Search, Eye, 
  EyeOff, Loader2, ShieldCheck, TrendingUp, 
  ExternalLink, Fingerprint, Database, Network
} from 'lucide-react';

// Standard Shadcn/UI or similar component library imports
import { Badge } from '@/components/ui/badge';

// Internal Libs
import { createClient } from '@/lib/supabase/client';

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

  // 1. AUTHORITATIVE DATA RECONCILIATION (Untouched Logic)
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

  // 2. REAL-TIME SENTINEL (Untouched Logic)
  useEffect(() => {
    loadIntelligence();

    const channel = supabase
      .channel('sovereign_realtime')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' }, 
        (payload) => {
          setTelemetry(prev => [payload.new as TelemetryLog, ...prev].slice(0, 25));
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 p-8 lg:p-12 font-sans selection:bg-blue-100 animate-in fade-in duration-1000">
      
      {/* 1. HEADER HUD (CLEAN WHITE) */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 border-b border-slate-200 pb-12 gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm w-fit">
            <Cpu size={16} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 leading-none">
                Architect Grade Oversight
            </span>
          </div>
          <h1 className="text-7xl font-black tracking-tighter text-slate-900 uppercase leading-none">
            Command<span className="text-blue-600">_HQ</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-5 items-center">
          <div className="bg-white border border-slate-200 p-6 rounded-[2rem] flex items-center gap-10 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 leading-none">System Integrity</span>
              <span className="text-emerald-600 font-black flex items-center gap-3 text-sm tracking-tight">
                <div className="relative flex items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <div className="absolute h-5 w-5 bg-emerald-400 rounded-full animate-ping opacity-20" />
                </div>
                VERIFIED_SEALED
              </span>
            </div>
            <div className="h-10 w-px bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2 leading-none">Global Sentinels</span>
              <div className="flex items-center gap-2">
                  <Fingerprint size={14} className="text-blue-600" />
                  <span className="text-slate-900 font-black text-sm tracking-tight tabular-nums">2,808 ACTIVE_NODES</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-5 bg-white border border-slate-200 rounded-[1.5rem] hover:bg-slate-50 transition-all text-slate-400 active:scale-95 shadow-sm">
              <Search size={22} />
            </button>
            <button
              onClick={toggleSensitive}
              className={cn(
                "p-5 px-8 border rounded-[1.5rem] transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95",
                showSensitive 
                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-blue-500 hover:text-blue-600"
              )}
            >
              {showSensitive ? <Eye size={20} /> : <EyeOff size={20} />}
              {showSensitive ? "Mask Intelligence" : "Reveal Signals"}
            </button>
          </div>
        </div>
      </header>

      {/* 2. INSTITUTIONAL KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <MetricBox title="Vector Traffic" value={telemetry.length} icon={Globe} color="text-blue-600" bg="bg-blue-50" chartData={pulse} />
        <MetricBox title="Node Expansion" value={revenue.reduce((acc, r) => acc + r.active_users, 0)} icon={UserPlus} color="text-emerald-600" bg="bg-emerald-50" chartData={pulse} />
        <MetricBox title="Revenue Pipeline" value={revenue.reduce((acc, r) => acc + r.ltv_revenue, 0)} icon={DollarSign} color="text-amber-600" bg="bg-amber-50" isCurrency chartData={pulse} />
        <MetricBox title="Anomaly Count" value={telemetry.filter(l => l.severity_level === 'CRITICAL').length} icon={ShieldAlert} color="text-red-600" bg="bg-red-50" chartData={pulse} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        
        {/* 3. LIVE ACTIVITY FEED (ELITE LIST) */}
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm min-h-[600px] transition-all hover:shadow-xl hover:shadow-blue-500/5">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-blue-50 rounded-2xl">
                    <Terminal className="text-blue-600" size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                    System_Activity_Stream
                </h3>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Live Stream</span>
                <div className="relative flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <div className="absolute h-4 w-4 bg-blue-400 rounded-full animate-ping opacity-25" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex flex-col gap-4 items-center justify-center py-40">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Awaiting Uplink...</span>
                </div>
              ) : (
                telemetry.map(log => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-8">
                      <div className={cn(
                        "text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border shadow-sm",
                        log.severity_level === 'CRITICAL' 
                            ? 'bg-red-50 text-red-600 border-red-100' 
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                      )}>
                        {log.event_category}
                      </div>
                      <div>
                        <p className="text-base font-black text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                            {log.event_name}
                        </p>
                        <div className="flex items-center gap-3 mt-2.5">
                            <Database size={10} className="text-slate-300" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {log.metadata?.path || 'Root_Interconnect'}
                            </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[11px] font-mono font-black text-slate-900 mb-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                         {new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                       </p>
                       {showSensitive && (
                         <div className="flex items-center justify-end gap-2 text-blue-500/60 font-mono text-[10px] font-bold animate-in slide-in-from-right-2">
                           <Fingerprint size={10} />
                           UID: {log.tenant_id?.slice(0, 18)}
                         </div>
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 4. ASSET MONITOR (REVENUE PANEL) */}
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 flex flex-col shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/5">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none flex items-center gap-4">
                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <Activity className="text-emerald-600" size={20} />
                </div>
                Asset_Health
            </h3>
            <button className="text-slate-300 hover:text-blue-600 transition-colors">
                <ExternalLink size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-10 custom-scrollbar pr-4">
            {revenue.map((biz) => (
              <div key={biz.tenant_id} className="space-y-5 group/biz">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
                        {biz.tenant_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                        <Network size={10} className="text-slate-300" />
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{biz.active_users} Nodes provisioned</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                        <span className="text-xs font-black text-slate-300">$</span>
                        <p className="text-2xl font-mono font-black text-emerald-600 tracking-tighter leading-none">
                        {biz.ltv_revenue.toLocaleString()}
                        </p>
                    </div>
                    <Badge variant="outline" className="mt-2 text-[9px] font-black border-emerald-100 bg-emerald-50 text-emerald-600 uppercase rounded-full px-3 py-1">
                      {biz.subscription_status}
                    </Badge>
                  </div>
                </div>

                <div className="h-20 w-full bg-[#f8fafc] rounded-2xl border border-slate-100 p-2 shadow-inner group-hover/biz:border-emerald-200 transition-colors">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={biz.history.map((val, i) => ({ x: i, y: val }))}>
                      <defs>
                        <linearGradient id={`grad-${biz.tenant_id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="y" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        fill={`url(#grad-${biz.tenant_id})`} 
                        isAnimationActive={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-between opacity-50">
             <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <ShieldCheck size={12} /> Encrypted Ledger v10.2
             </span>
             <span className="text-[9px] font-mono text-slate-300 uppercase">Synchronized</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}

// --- KPI COMPONENT (SaaS ELITE DESIGN) ---
function MetricBox({ title, value, icon: Icon, color, bg, chartData, isCurrency = false }: any) {
  return (
    <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group overflow-hidden relative flex flex-col justify-between h-80 border-b-4 border-b-transparent hover:border-b-blue-600">
      <div className="absolute -right-10 -bottom-10 text-slate-50 opacity-[0.5] group-hover:opacity-100 transition-opacity duration-1000 group-hover:-rotate-12">
         <Icon size={200} />
      </div>

      <div className="flex justify-between items-start relative z-10 w-full mb-8">
        <div className="space-y-10 w-full">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">{title}</p>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
                {isCurrency && <span className="text-xl font-black text-slate-300">$</span>}
                <p className={cn("text-6xl font-black tracking-tighter tabular-nums leading-none text-slate-900")}>
                    {value.toLocaleString()}
                </p>
            </div>
            <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mt-4", color)}>
                <div className={cn("h-1 w-5 rounded-full", color.replace('text-', 'bg-'))} />
                Live Network Pulse
            </div>
          </div>
        </div>
        <div className={cn("p-6 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all group-hover:scale-110", bg, color)}>
          <Icon size={28} strokeWidth={3} />
        </div>
      </div>

      <div className="h-16 w-full opacity-60 group-hover:opacity-100 transition-all duration-700 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line 
              type="stepAfter" 
              dataKey="event_count" 
              stroke="#2563eb" 
              strokeWidth={3} 
              dot={false} 
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex items-center gap-2 relative z-10">
          <Activity size={12} className="text-blue-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Authoritative Synchronous Data</span>
      </div>
    </div>
  );
}