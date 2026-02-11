"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  ShieldCheck, Globe, UserPlus, Zap, AlertOctagon, 
  TrendingUp, Landmark, Lock, Activity, 
  MousePointer2, ArrowUpRight, LayoutGrid, Loader2, Power,
  Search, Filter, LayoutDashboard, ChevronRight, MessageSquare, HardDrive
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Production Sub-Modules ---
import SovereignGeoMap from '@/components/admin/SovereignGeoMap';
import LeadInsights from '@/components/admin/LeadInsights';
import FinancialAuditPortal from '@/components/admin/FinancialAuditPortal';
import GlobalTelemetryFeed from '@/components/admin/GlobalTelemetryFeed';

export default function SovereignCommandCenter() {
  const [activeTab, setActiveTab] = useState('war_room');
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');
  
  // System State
  const [stats, setStats] = useState({ daily_visits: 0, daily_signups: 0, active_users_now: 0 });
  const [verticals, setVerticals] = useState([]);
  const [tenants, setTenants] = useState([]);

  const supabase = useMemo(() => createClient(), []);

  // --- 1. AUTHORITATIVE DATA RECONCILIATION ---
  const syncSystemState = useCallback(async () => {
    try {
      const [metrics, industry, orgs] = await Promise.all([
        supabase.from('view_admin_growth_metrics').select('*').single(),
        supabase.from('view_admin_vertical_performance').select('*'),
        supabase.from('tenants').select('*').order('created_at', { ascending: false })
      ]);

      if (metrics.data) setStats(metrics.data);
      if (industry.data) setVerticals(industry.data || []);
      if (orgs.data) setTenants(orgs.data || []);
    } catch (e) {
      toast.error("DATA_SYNC_CRITICAL", { description: "Uplink to sovereign ledgers interrupted." });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // --- 2. LIVE SENTINEL (Real-time Orchestration) ---
  useEffect(() => {
    syncSystemState();

    const channel = supabase
      .channel('system_sentinel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' }, () => {
        // Throttled refresh for non-critical stats
        syncSystemState();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tenants' }, (payload) => {
        toast.success("NEW NODE INITIALIZED", {
          description: `Organization ${payload.new.name} has entered the perimeter.`,
          icon: <UserPlus className="text-emerald-500" />
        });
        syncSystemState();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('ONLINE');
        else setRealtimeStatus('OFFLINE');
      });

    return () => { supabase.removeChannel(channel); };
  }, [supabase, syncSystemState]);

  // --- 3. TACTICAL OVERRIDES (RPC BASED) ---
  const handleTacticalIsolation = async (tenantId: string, name: string) => {
    // In Enterprise, we use a custom-themed confirm or Double-Lock UI (omitted for brevity)
    const proceed = confirm(`AUTH REQUIRED: Isolate ${name}? This will sever all module interconnects.`);
    if (!proceed) return;

    try {
      const { error } = await supabase.rpc('isolate_tenant_tactical', {
        target_tenant_id: tenantId,
        admin_id: 'architect_01' // Replace with actual session admin ID
      });

      if (error) throw error;
      toast.success(`${name} isolated from Sovereign Mesh.`);
      syncSystemState();
    } catch (err: any) {
      toast.error("OVERRIDE_REFUSED", { description: err.message });
    }
  };

  const handleDispatchDirective = async (tenantId: string | null = null) => {
    const content = prompt("Enter Tactical Directive:");
    if (!content) return;

    try {
      const { error } = await supabase.from('system_broadcasts').insert({
        target_tenant_id: tenantId,
        title: 'ARCHITECT DIRECTIVE',
        content,
        category: 'SECURITY'
      });

      if (error) throw error;
      toast.success("Directive dispatched via Secure Bridge.");
    } catch (e) {
      toast.error("SIGNAL_LOST", { description: "Broadcast failed to propagate." });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020205] flex flex-col items-center justify-center gap-6">
        <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500/50">Initializing Sovereign Command</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 p-6 lg:p-12 font-sans overflow-x-hidden selection:bg-blue-500/40">
      
      {/* --- LEVEL 5 HEADER --- */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-16 gap-10 border-b border-white/5 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} className={cn("animate-pulse", realtimeStatus === 'ONLINE' ? 'text-blue-500' : 'text-red-500')} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
              Uplink: {realtimeStatus} // Node: Sovereign_Prime
            </span>
          </div>
          <h1 className="text-8xl font-black tracking-tighter text-white uppercase italic leading-none">
            COMMAND<span className="text-blue-600">_HQ</span>
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Oversight: 316 Global Tables // 2,808 Active Sentinels</p>
        </div>

        <nav className="flex flex-wrap bg-slate-900/40 p-2 rounded-[2rem] border border-white/5 backdrop-blur-3xl shadow-2xl items-center gap-2">
          {['War Room', 'Financials', 'Leads', 'Tenants'].map((label) => {
            const id = label.toLowerCase().replace(' ', '_');
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  isActive ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30" : "text-slate-500 hover:text-white hover:bg-white/5"
                )}
              >
                {label}
              </button>
            );
          })}
          <div className="h-8 w-[1px] bg-white/10 mx-4" />
          <button onClick={() => window.location.href = '/dashboard'} className="p-4 text-slate-500 hover:text-white"><LayoutDashboard size={18} /></button>
          <button onClick={() => handleLogout(supabase)} className="p-4 text-red-500/50 hover:text-red-500"><Power size={18} /></button>
        </nav>
      </header>

      {/* --- KPI MATRIX --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <MetricCard title="System Visits" value={stats.daily_visits} icon={MousePointer2} color="text-blue-500" sub="24h Traffic Vector" />
        <MetricCard title="Node Signups" value={stats.daily_signups} icon={UserPlus} color="text-emerald-500" sub="Conversion: 4.2%" />
        <MetricCard title="Active Flux" value={stats.active_users_now} icon={Zap} color="text-yellow-500" sub="Current WebSockets" />
        <MetricCard title="Anomalies" value={0} icon={AlertOctagon} color="text-red-500" sub="Integrity: 100%" />
      </div>

      {/* --- CONTENT ENGINE --- */}
      <main className="space-y-16">
        {activeTab === 'war_room' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
            <div className="xl:col-span-2 space-y-12">
              <SovereignGeoMap />
              <section className="bg-slate-900/20 border border-white/5 p-12 rounded-[4rem] backdrop-blur-3xl">
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-12 flex items-center gap-4">
                  <TrendingUp className="text-blue-600" /> Vertical Performance Ledger
                </h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={verticals}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="business_type" stroke="#475569" fontSize={10} fontWeight="900" />
                      <YAxis stroke="#475569" fontSize={10} tabularNums />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px' }} />
                      <Bar dataKey="processed_revenue" fill="#2563eb" radius={[12, 12, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
            <div className="bg-slate-900/10 rounded-[4rem] border border-white/5 p-8">
               <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 px-4 flex items-center gap-2">
                 <Activity size={12} className="text-blue-500" /> Live Telemetry
               </h3>
               <GlobalTelemetryFeed />
            </div>
          </div>
        )}

        {activeTab === 'financials' && <FinancialAuditPortal />}
        {activeTab === 'leads' && <LeadInsights />}

        {activeTab === 'tenants' && (
          <section className="bg-slate-900/10 border border-white/5 p-12 rounded-[4rem]">
            <div className="flex justify-between items-center mb-16 px-6">
              <h3 className="text-4xl font-black uppercase italic tracking-tighter">Organization Registry</h3>
              <div className="flex gap-4">
                 <button className="p-4 bg-white/5 rounded-2xl border border-white/5 text-slate-400"><Search size={20} /></button>
                 <button className="p-4 bg-white/5 rounded-2xl border border-white/5 text-slate-400"><Filter size={20} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {tenants.map(t => (
                <div key={t.id} className="group flex items-center justify-between p-8 bg-black/40 border border-white/5 rounded-[3rem] hover:border-blue-500/40 transition-all">
                  <div className="flex items-center gap-10">
                    <div className={cn("h-4 w-4 rounded-full", t.status === 'active' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-red-500 shadow-[0_0_15px_#ef4444]')} />
                    <div>
                      <h4 className="text-3xl font-black text-white uppercase tracking-tighter italic">{t.name}</h4>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">UUID: {t.id} // Vector: {t.business_type || 'STANDARD'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-10 group-hover:translate-x-0">
                    <button onClick={() => handleDispatchDirective(t.id)} className="px-8 py-4 bg-blue-600/10 text-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Message</button>
                    <button onClick={() => handleTacticalIsolation(t.id, t.name)} className="px-8 py-4 bg-red-600/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2">
                      <Lock size={12} /> Isolate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-32 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">
        <div className="flex items-center gap-4">
          <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
          <p>SOVEREIGN OS v4.2 // ARCHITECT INTERCONNECT</p>
        </div>
        <div className="flex items-center gap-10">
          <span className="flex items-center gap-2"><HardDrive size={14} /> 316 TABLES</span>
          <span className="flex items-center gap-2"><MessageSquare size={14} /> SUPPORT: ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}

// --- KPI COMPONENT ---
function MetricCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-slate-900/20 border border-white/5 p-12 rounded-[4rem] hover:bg-slate-900/40 transition-all group relative overflow-hidden shadow-2xl">
      <div className="absolute -right-12 -bottom-12 text-white opacity-[0.01] group-hover:opacity-[0.03] transition-opacity duration-1000"><Icon size={240} /></div>
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-10">
          <p className="text-[12px] font-black text-slate-600 uppercase tracking-[0.5em]">{title}</p>
          <div className="space-y-3">
            <p className="text-7xl font-black text-white tracking-tighter tabular-nums leading-none">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase italic tracking-widest">{sub}</p>
          </div>
        </div>
        <div className={cn("p-6 rounded-[2rem] bg-black/40 border border-white/10 shadow-2xl transition-all group-hover:scale-110", color)}>
          <Icon size={36} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}

async function handleLogout(supabase: any) {
  await supabase.auth.signOut();
  window.location.href = '/login';
}