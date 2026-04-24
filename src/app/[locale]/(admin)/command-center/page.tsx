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

  // --- 2. LIVE SENTINEL (Real-time Orchestration) ---
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

  // --- 3. TACTICAL OVERRIDES (RPC BASED) ---
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
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Initializing Command HQ</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 p-6 lg:p-10 font-sans selection:bg-blue-100">
      
      {/* --- PROFESSIONAL HEADER --- */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
             <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Command Center
            </h1>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              realtimeStatus === 'ONLINE' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-red-50 text-red-600 border-red-100"
            )}>
              <Activity size={12} className={realtimeStatus === 'ONLINE' ? "animate-pulse" : ""} />
              Live Updates Active
            </div>
          </div>
          <p className="text-slate-500 font-medium text-sm">Oversight: 316 Global Tables // 2,808 Active Sentinels</p>
        </div>

        <nav className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 shadow-sm items-center gap-1">
          {['War Room', 'Financials', 'Leads', 'Tenants'].map((label) => {
            const id = label.toLowerCase().replace(' ', '_');
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "px-6 py-2 rounded-lg text-xs font-bold transition-all",
                  isActive ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            );
          })}
          <div className="h-6 w-[1px] bg-slate-200 mx-2" />
          <button onClick={() => window.location.href = '/dashboard'} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><LayoutDashboard size={20} /></button>
          <button onClick={() => handleLogout(supabase)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Power size={20} /></button>
        </nav>
      </header>

      {/* --- CLEAN KPI MATRIX --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MetricCard title="Today's Sales" value={stats.daily_visits} icon={TrendingUp} color="border-emerald-500" subColor="text-emerald-600" sub="Cash Inflow" />
        <MetricCard title="Today's Expenses" value={stats.daily_signups} icon={TrendingUp} color="border-red-500" subColor="text-red-600" sub="Cash Outflow" flipIcon />
        <MetricCard title="Net Position" value={stats.active_users_now} icon={Activity} color="border-blue-500" subColor="text-blue-600" sub="Daily Profit/Loss" />
        <MetricCard title="Transactions" value={0} icon={Search} color="border-slate-300" subColor="text-slate-500" sub="Orders Processed" />
      </div>

      {/* --- CONTENT ENGINE --- */}
      <main className="space-y-10">
        {activeTab === 'war_room' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-1">
                <SovereignGeoMap />
              </div>
              <section className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                  <TrendingUp className="text-blue-600" /> Vertical Performance Ledger
                </h3>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={verticals}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="business_type" stroke="#64748b" fontSize={11} fontWeight="600" axisLine={false} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} fontWeight="600" axisLine={false} tickLine={false} tabularNums />
                      <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="processed_revenue" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
               <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                 <Activity size={14} className="text-blue-600" /> Live Telemetry
               </h3>
               <GlobalTelemetryFeed />
            </div>
          </div>
        )}

        {activeTab === 'financials' && <FinancialAuditPortal />}
        {activeTab === 'leads' && <LeadInsights />}

        {activeTab === 'tenants' && (
          <section className="bg-white border border-slate-200 p-10 rounded-3xl shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Registry</h3>
              <div className="flex gap-2">
                 <button className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors"><Search size={18} /></button>
                 <button className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors"><Filter size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tenants.map(t => (
                <div key={t.id} className="group flex items-center justify-between p-6 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <div className="flex items-center gap-6">
                    <div className={cn("h-3 w-3 rounded-full", t.status === 'active' ? 'bg-emerald-500 shadow-sm' : 'bg-red-500 shadow-sm')} />
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{t.name}</h4>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">UUID: {t.id} // Sector: {t.business_type || 'STANDARD'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <button onClick={() => handleDispatchDirective(t.id)} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all">Message</button>
                    <button onClick={() => handleTacticalIsolation(t.id, t.name)} className="px-5 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2">
                      <Lock size={12} /> Isolate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-20 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
          <p>BBU1 OS v4.2 // Enterprise Operating System</p>
        </div>
        <div className="flex items-center gap-8">
          <span className="flex items-center gap-2 font-black"><HardDrive size={14} /> 316 TABLES</span>
          <span className="flex items-center gap-2 font-black"><MessageSquare size={14} /> SUPPORT: ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}

// --- KPI CARD (CLEAN STYLE) ---
function MetricCard({ title, value, icon: Icon, color, subColor, sub, flipIcon }: any) {
  return (
    <div className={cn(
      "bg-white border border-slate-200 p-8 rounded-2xl shadow-sm transition-all hover:shadow-md border-l-4",
      color
    )}>
      <div className="space-y-6">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <div className="space-y-1">
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {typeof value === 'number' && title.toLowerCase().includes('sales') || title.toLowerCase().includes('expenses') || title.toLowerCase().includes('position') 
              ? `UGX ${value.toLocaleString()}` 
              : value.toLocaleString()}
          </p>
          <div className={cn("flex items-center gap-1.5 text-xs font-bold", subColor)}>
            <Icon size={14} className={flipIcon ? "rotate-180" : ""} />
            {sub}
          </div>
        </div>
      </div>
    </div>
  );
}

async function handleLogout(supabase: any) {
  await supabase.auth.signOut();
  window.location.href = '/login';
}