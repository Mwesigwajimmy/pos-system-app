"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  ShieldCheck, Globe, UserPlus, Zap, AlertOctagon, 
  TrendingUp, CreditCard, MessageSquare, LayoutDashboard, 
  Search, Users, Landmark, Lock, Mail, 
  ChevronRight, Filter, HardDrive, RefreshCcw, Activity, 
  MousePointer2, ArrowUpRight, LayoutGrid, Loader2, Power
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";

// --- Sub-Components (High-Clearance Modules) ---
import SovereignGeoMap from '@/components/admin/SovereignGeoMap';
import LeadInsights from '@/components/admin/LeadInsights';
import FinancialAuditPortal from '@/components/admin/FinancialAuditPortal';
import GlobalTelemetryFeed from '@/components/admin/GlobalTelemetryFeed';

export default function SovereignCommandCenter() {
  const [activeTab, setActiveTab] = useState('war_room');
  const [stats, setStats] = useState<any>({
    daily_visits: 0,
    daily_signups: 0,
    active_users_now: 0
  });
  const [verticals, setVerticals] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [liveLogs, setLiveLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // --- 1. SOVEREIGN DATA ORCHESTRATION ---
  const loadMasterData = async () => {
    try {
      const [metrics, industry, orgs] = await Promise.all([
        supabase.from('view_admin_growth_metrics').select('*').single(),
        supabase.from('view_admin_vertical_performance').select('*'),
        supabase.from('tenants').select('*').order('created_at', { ascending: false })
      ]);

      if (metrics.data) setStats(metrics.data);
      if (industry.data) setVerticals(industry.data);
      if (orgs.data) setTenants(orgs.data);
    } catch (e) {
      console.error("Tactical Link Failure:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadMasterData();

    // --- 2. REAL-TIME PULSE (Subscribing to the entire system) ---
    const channel = supabase
      .channel('sovereign_pulse')
      // Monitor Growth & Visits
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'system_global_telemetry' 
      }, (payload) => {
        if (!isMounted) return;
        setLiveLogs(prev => [payload.new, ...prev].slice(0, 15));
        loadMasterData(); // Live refresh stats on every new visit/action
      })
      // Monitor Signups
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'tenants' 
      }, () => {
          toast.success("NEW ORGANIZATION ONBOARDED", {
            description: "A new tenant has just initialized their ledger.",
            icon: <UserPlus className="text-emerald-500" />
          });
          loadMasterData();
      })
      // Monitor Support Tickets
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'system_support_tickets' 
      }, () => {
          toast.info("PRIORITY SUPPORT REQUIRED", {
             description: "Incoming query from active tenant."
          });
      })
      .subscribe();

    return () => { 
        isMounted = false;
        supabase.removeChannel(channel); 
    };
  }, []);

  // --- 3. ARCHITECT ACTIONS (TACTICAL OVERRIDE) ---
  const handleFreezeAccount = async (tid: string, name: string) => {
    const confirm = window.confirm(`CRITICAL: Do you want to isolate ${name}? All 316 modules will be locked.`);
    if (!confirm) return;

    const { error } = await supabase
      .from('tenants')
      .update({ status: 'frozen', subscription_status: 'LOCKED' })
      .eq('id', tid);

    if (error) {
        toast.error("Override Failed: Scope violation");
    } else {
        toast.error(`${name} isolated successfully.`);
        loadMasterData();
    }
  };

  const handleDispatchMessage = async (tid: string | null = null) => {
    const msg = window.prompt("Enter Directive Content:");
    if (!msg) return;

    const { error } = await supabase.from('system_broadcasts').insert({
      target_tenant_id: tid,
      title: 'Architect Directive',
      content: msg,
      category: tid ? 'UPDATE' : 'SECURITY'
    });

    if (!error) toast.success("Directive dispatched via Sovereign Bridge");
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-[#020205] flex items-center justify-center">
              <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Initializing Sovereign OS...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 p-6 lg:p-10 font-sans selection:bg-blue-500/30">
      
      {/* --- LEVEL 5 SECURE HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 border-b border-white/5 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-[0.5em]">
            <ShieldCheck size={14} className="animate-pulse" /> System Architect Control Center
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic flex items-center gap-4">
            Command <span className="text-blue-600">Center</span>
          </h1>
          <p className="text-slate-500 font-medium">Real-time oversight across 316 tables and 2,808 backend triggers.</p>
        </div>

        {/* TACTICAL NAVIGATION */}
        <nav className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-xl shadow-2xl">
          {[
            { id: 'war_room', label: 'War Room', icon: Activity },
            { id: 'financials', label: 'Audit', icon: Landmark },
            { id: 'leads', label: 'Leads', icon: UserPlus },
            { id: 'tenants', label: 'Tenants', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* --- LAYER 1: THE GROWTH FUNNEL (MERGED KPIs) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard title="Landing Visits" value={stats?.daily_visits || 0} icon={MousePointer2} color="text-blue-400" trend="+12% from 24h" />
        <MetricCard title="New Signups" value={stats?.daily_signups || 0} icon={UserPlus} color="text-emerald-400" trend="Conversion 4.2%" />
        <MetricCard title="Active Sessions" value={stats?.active_users_now || 0} icon={Zap} color="text-yellow-400" trend="Live Pulse" />
        <MetricCard title="Critical Alerts" value="0" icon={AlertOctagon} color="text-red-400" trend="0 unresolved" />
      </div>

      {/* --- LAYER 2: INTERCONNECTED TAB CONTENT --- */}
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {activeTab === 'war_room' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            {/* 24h Traffic Heatmap */}
            <div className="xl:col-span-2 space-y-10">
                <SovereignGeoMap />
                
                {/* Vertical Market Analysis */}
                <section className="bg-slate-900/30 border border-white/5 p-8 rounded-[3rem] backdrop-blur-3xl shadow-2xl">
                    <h3 className="text-xl font-black uppercase tracking-tight mb-10 flex items-center gap-3">
                        <TrendingUp className="text-blue-500" /> Revenue Flow by Business Category
                    </h3>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={verticals}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="business_type" stroke="#475569" fontSize={10} fontWeight="bold" />
                            <YAxis stroke="#475569" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b' }}
                            />
                            <Bar dataKey="processed_revenue" fill="#2563eb" radius={[10, 10, 0, 0]} />
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            {/* Real-time Telemetry Stream */}
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <Zap className="text-yellow-500" size={14} /> Live Telemetry Feed
                    </h3>
                    <div className="flex gap-2">
                        <button className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"><Search size={14}/></button>
                        <button className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"><Filter size={14}/></button>
                    </div>
                </div>
                <GlobalTelemetryFeed />
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="animate-in zoom-in-95 duration-500">
             <FinancialAuditPortal />
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in slide-in-from-right duration-500">
             <div className="lg:col-span-2">
                <LeadInsights />
             </div>
             <div className="bg-slate-900/30 border border-white/5 p-10 rounded-[3rem] flex flex-col justify-center text-center">
                <Globe className="h-20 w-20 text-blue-500 mx-auto mb-8 opacity-20" />
                <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Sovereign Lead Engine</h3>
                <p className="text-slate-500 font-medium leading-relaxed px-6">
                    Tracking 1:1 visitor context. Capturing IP, resolution, and referrer path autonomously.
                </p>
                <button className="mt-10 py-5 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all">
                    Export Marketing Intelligence
                </button>
             </div>
          </div>
        )}

        {activeTab === 'tenants' && (
           <div className="space-y-8 animate-in slide-in-from-left duration-500">
              <section className="bg-slate-900/30 border border-white/5 p-10 rounded-[3rem]">
                <div className="flex items-center justify-between mb-12">
                    <h3 className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                        <LayoutGrid size={32} className="text-blue-600" /> Organization Management
                    </h3>
                    <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                        <div className="px-4 py-2 bg-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20">
                            Total: {tenants.length} Entities
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {tenants.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-6 bg-black/40 rounded-[2.5rem] border border-white/5 hover:border-blue-500/40 transition-all group">
                           <div className="flex items-center gap-8">
                              <div className={`h-4 w-4 rounded-full ${t.status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} />
                              <div>
                                 <p className="font-black text-white uppercase tracking-tight text-2xl">{t.name}</p>
                                 <div className="flex items-center gap-4 mt-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TYPE: {t.business_type || 'STANDARD'}</span>
                                    <span className="h-1 w-1 bg-slate-700 rounded-full" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID: {t.id.substring(0,8)}</span>
                                 </div>
                              </div>
                           </div>
                           
                           {/* DIRECT OVERRIDE CONTROLS */}
                           <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                              <button 
                                onClick={() => handleDispatchMessage(t.id)}
                                className="px-6 py-3 bg-blue-600/10 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              >
                                Message
                              </button>
                              <button 
                                onClick={() => handleFreezeAccount(t.id, t.name)}
                                className="px-6 py-3 bg-red-600/10 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              >
                                <Lock size={12} className="inline mr-2" /> Isolate
                              </button>
                           </div>
                        </div>
                    ))}
                </div>
              </section>
           </div>
        )}

      </div>

      {/* --- SOVEREIGN FOOTER --- */}
      <footer className="mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">
          <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
              <p>© 2026 SOVEREIGN OS • ARCHITECT GRADE INTERCONNECT</p>
          </div>
          <div className="flex items-center gap-10">
              <span className="flex items-center gap-2"><HardDrive size={14} className="text-slate-800" /> 316 GLOBAL TABLES</span>
              <span className="flex items-center gap-2 text-blue-500/80 underline underline-offset-8 decoration-2"><Zap size={14} /> 2,808 ACTIVE SENTINELS</span>
          </div>
      </footer>
    </div>
  );
}

// --- ARCHITECT'S KPI COMPONENT ---
function MetricCard({ title, value, icon: Icon, color, trend }: any) {
  return (
    <div className="bg-slate-900/30 border border-white/5 p-10 rounded-[3rem] hover:bg-slate-900/50 transition-all group relative overflow-hidden shadow-2xl">
      {/* Ghost Icon background */}
      <div className="absolute -right-8 -bottom-8 text-white opacity-[0.015] group-hover:opacity-[0.04] transition-opacity duration-700">
         <Icon size={180} />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-6">
          <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em]">{title}</p>
          <div className="space-y-1">
            <p className="text-5xl font-black text-white tracking-tighter tabular-nums leading-none">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter italic">{trend}</p>}
          </div>
        </div>
        <div className={`p-5 rounded-3xl bg-black/40 border border-white/10 ${color} shadow-2xl transition-all group-hover:scale-110 group-hover:shadow-current/20`}>
          <Icon size={32} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}