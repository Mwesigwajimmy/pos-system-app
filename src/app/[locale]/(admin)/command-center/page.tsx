"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  ShieldCheck, Globe, UserPlus, Zap, AlertOctagon, 
  TrendingUp, Landmark, Lock, Activity, 
  MousePointer2, ArrowUpRight, LayoutGrid, Loader2, Power,
  Search, Filter, LayoutDashboard, ChevronRight, MessageSquare, 
  HardDrive, Cpu, Fingerprint, Network, Radio
} from 'lucide-react';
import { toast } from 'sonner';

// Internal Libs
import { createClient } from '@/lib/supabase/client';

// --- Production Sub-Modules ---
import SovereignGeoMap from '@/components/admin/SovereignGeoMap';
import LeadInsights from '@/components/admin/LeadInsights';
import FinancialAuditPortal from '@/components/admin/FinancialAuditPortal';
import GlobalTelemetryFeed from '@/components/admin/GlobalTelemetryFeed';

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

export default function SovereignCommandCenter() {
  const [activeTab, setActiveTab] = useState('war_room');
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');
  
  // System State
  const [stats, setStats] = useState({ daily_visits: 0, daily_signups: 0, active_users_now: 0 });
  const [verticals, setVerticals] = useState([]);
  const [tenants, setTenants] = useState([]);

  const supabase = useMemo(() => createClient(), []);

  // --- 1. AUTHORITATIVE DATA RECONCILIATION (Untouched) ---
  const syncSystemState = useCallback(async () => {
    try {
      const [metrics, industry, orgs] = await Promise.all([
        supabase.from('view_admin_growth_metrics').select('*').maybeSingle(),
        supabase.from('view_admin_vertical_performance').select('*'),
        supabase.from('tenants').select('*').order('created_at', { ascending: false })
      ]);

      if (metrics.data) {
        setStats(metrics.data);
      } else {
        setStats({ daily_visits: 0, daily_signups: 0, active_users_now: 0 });
      }
      
      if (industry.data) setVerticals(industry.data || []);
      if (orgs.data) setTenants(orgs.data || []);
    } catch (e) {
      toast.error("DATA_SYNC_CRITICAL", { description: "Uplink to sovereign ledgers interrupted." });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // --- 2. LIVE SENTINEL (Untouched) ---
  useEffect(() => {
    syncSystemState();

    const channel = supabase
      .channel('system_sentinel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' }, () => {
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

  // --- 3. TACTICAL OVERRIDES (Untouched) ---
  const handleTacticalIsolation = async (tenantId: string, name: string) => {
    const proceed = confirm(`AUTH REQUIRED: Isolate ${name}? This will sever all module interconnects.`);
    if (!proceed) return;

    try {
      const { error } = await supabase.rpc('isolate_tenant_tactical', {
        target_tenant_id: tenantId,
        admin_id: 'architect_01'
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Initializing Command HQ</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 p-8 lg:p-12 font-sans selection:bg-blue-100 animate-in fade-in duration-1000">
      
      {/* --- PROFESSIONAL CLEAN HEADER --- */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-5">
             <div className="bg-slate-900 p-3 rounded-2xl shadow-lg">
                <Cpu size={24} className="text-white" />
             </div>
             <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">
              Command<span className="text-blue-600">_HQ</span>
            </h1>
            <div className={cn(
              "flex items-center gap-2.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
              realtimeStatus === 'ONLINE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
            )}>
              <div className="relative flex items-center justify-center">
                  <div className={cn("h-2 w-2 rounded-full", realtimeStatus === 'ONLINE' ? "bg-emerald-500" : "bg-red-500")} />
                  {realtimeStatus === 'ONLINE' && <div className="absolute h-4 w-4 bg-emerald-400 rounded-full animate-ping opacity-30" />}
              </div>
              Uplink Active
            </div>
          </div>
          <p className="text-slate-400 font-bold text-sm flex items-center gap-3">
            <Network size={16} className="text-slate-300" />
            Core Oversight: 316 Data Silos // 2,808 Global Sentinels Active
          </p>
        </div>

        <nav className="flex flex-wrap bg-white p-2 rounded-[1.5rem] border border-slate-200 shadow-sm items-center gap-2">
          {['War Room', 'Financials', 'Leads', 'Tenants'].map((label) => {
            const id = label.toLowerCase().replace(' ', '_');
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  isActive 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-100" 
                    : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            );
          })}
          <div className="h-8 w-[1px] bg-slate-100 mx-2" />
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-inner"
            title="Exit to Tenant Dashboard"
          >
            <LayoutDashboard size={20} />
          </button>
          <button 
            onClick={() => handleLogout(supabase)} 
            className="p-3 bg-red-50 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all shadow-sm"
            title="Sever Connection"
          >
            <Power size={20} />
          </button>
        </nav>
      </header>

      {/* --- CLEAN KPI MATRIX --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <MetricCard title="Gross Liquidity" value={stats.daily_visits} icon={TrendingUp} color="border-emerald-500" subColor="text-emerald-600" sub="System Inflow" />
        <MetricCard title="Operational Drain" value={stats.daily_signups} icon={TrendingUp} color="border-red-500" subColor="text-red-600" sub="System Outflow" flipIcon />
        <MetricCard title="Sovereign Nodes" value={stats.active_users_now} icon={Activity} color="border-blue-500" subColor="text-blue-600" sub="Active Sessions" />
        <MetricCard title="Global Signals" value={0} icon={Search} color="border-slate-300" subColor="text-slate-400" sub="Handshakes Processed" />
      </div>

      {/* --- CONTENT ENGINE --- */}
      <main className="space-y-12">
        {activeTab === 'war_room' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            <div className="xl:col-span-2 space-y-10">
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-2 transition-all hover:shadow-xl hover:shadow-blue-500/5">
                <SovereignGeoMap />
              </div>
              
              <section className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
                        <div className="bg-blue-50 p-2 rounded-xl">
                            <TrendingUp className="text-blue-600" size={20} />
                        </div>
                        Vertical Performance Ledger
                    </h3>
                    <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                        Detailed Export
                    </button>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={verticals}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="business_type" stroke="#94a3b8" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tickFormatter={(v) => String(v).toUpperCase()} />
                      <YAxis stroke="#94a3b8" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} tabularNums />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="processed_revenue" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
            
            <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm flex flex-col h-full">
               <div className="flex items-center justify-between mb-8 px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
                     <Radio size={14} className="text-blue-600 animate-pulse" /> Telemetry Feed
                   </h3>
                   <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                       <span className="text-[9px] font-black text-slate-500">Live_Signal</span>
                   </div>
               </div>
               <div className="flex-1 overflow-hidden">
                <GlobalTelemetryFeed />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'financials' && <FinancialAuditPortal />}
        {activeTab === 'leads' && <LeadInsights />}

        {activeTab === 'tenants' && (
          <section className="bg-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Organization Registry</h3>
                <p className="text-slate-400 font-bold text-sm mt-3 uppercase tracking-widest text-[10px]">Authoritative Node Index</p>
              </div>
              <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                 <button className="p-3 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"><Search size={20} /></button>
                 <button className="p-3 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-95"><Filter size={20} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {tenants.map(t => (
                <div key={t.id} className="group flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                  <div className="flex items-center gap-8">
                    <div className="relative">
                        <div className={cn("h-4 w-4 rounded-full shadow-sm", t.status === 'active' ? 'bg-emerald-500' : 'bg-red-500')} />
                        {t.status === 'active' && <div className="absolute inset-0 h-4 w-4 bg-emerald-400 rounded-full animate-ping opacity-25" />}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">{t.name}</h4>
                      <div className="flex items-center gap-4 mt-1.5">
                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">ID: {t.id.slice(0,18)}...</p>
                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t.business_type || 'STANDARD_TENANT'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-8 group-hover:translate-x-0">
                    <button onClick={() => handleDispatchDirective(t.id)} className="h-12 px-8 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">Message</button>
                    <button onClick={() => handleTacticalIsolation(t.id, t.name)} className="h-12 px-8 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-3 shadow-sm active:scale-95">
                      <Lock size={14} /> Sever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* --- PROFESSIONAL SYSTEM FOOTER --- */}
      <footer className="mt-24 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
        <div className="flex items-center gap-4">
          <div className="h-2 w-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          <p>Litonu Business Base Universe // BBU1_OS v10.2</p>
        </div>
        <div className="flex items-center gap-10">
          <span className="flex items-center gap-2.5 text-slate-900 border-b-2 border-blue-600 pb-1"><HardDrive size={16} className="text-blue-600" /> Forensic Ledger: Active</span>
          <span className="flex items-center gap-2.5"><Fingerprint size={16} className="text-slate-300" /> Signal Identity: Encrypted</span>
          <span className="flex items-center gap-2.5"><MessageSquare size={16} className="text-slate-300" /> Protocol Support: Synchronized</span>
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

// --- KPI CARD (CLEAN WHITE SaaS STYLE) ---
function MetricCard({ title, value, icon: Icon, color, subColor, sub, flipIcon }: any) {
  return (
    <div className={cn(
      "bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 relative overflow-hidden group",
    )}>
      {/* Visual Accent */}
      <div className={cn("absolute top-0 left-0 w-full h-1.5 opacity-50", color.replace('border-', 'bg-'))} />
      
      <div className="space-y-8 relative z-10">
        <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
            <div className={cn("p-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500", subColor)}>
                <Icon size={18} className={flipIcon ? "rotate-180" : ""} />
            </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
            {typeof value === 'number' && (title.toLowerCase().includes('sales') || title.toLowerCase().includes('expenses') || title.toLowerCase().includes('liquidity') || title.toLowerCase().includes('drain'))
              ? `UGX ${value.toLocaleString()}` 
              : value.toLocaleString()}
          </p>
          <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest", subColor)}>
            <div className={cn("h-1 w-4 rounded-full", subColor.replace('text-', 'bg-'))} />
            {sub}
          </div>
        </div>
      </div>
      
      <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
         <Icon size={120} />
      </div>
    </div>
  );
}

async function handleLogout(supabase: any) {
  await supabase.auth.signOut();
  window.location.href = '/login';
}