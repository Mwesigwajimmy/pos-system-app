"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  ShieldAlert, Activity, Globe, DollarSign, 
  UserPlus, Terminal, Cpu, Zap, Search, Eye
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SovereignControlPanel() {
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSensitive, setShowSensitive] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Fetch initial intelligence
  const loadIntelligence = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: tel }, { data: rev }, { data: ano }] = await Promise.all([
        supabase.from('system_global_telemetry').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('view_admin_global_revenue').select('*'),
        supabase.from('view_admin_critical_anomalies').select('*')
      ]);
      setTelemetry(tel || []);
      setRevenue(rev || []);
      setAnomalies(ano || []);
    } catch (e) {
      console.error('Failed to load intelligence', e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    loadIntelligence();

    // Live wire: subscribe to global telemetry inserts
    const channel = supabase
      .channel('sovereign_eyes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' }, (payload) => {
        if (!mounted) return;
        setTelemetry(prev => [payload.new, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => {
      mounted = false;
      try {
        if (typeof channel.unsubscribe === 'function') channel.unsubscribe();
        else if (supabase.removeChannel) supabase.removeChannel(channel);
      } catch (e) {
        // swallow cleanup errors
      }
    };
  }, [supabase, loadIntelligence]);

  // Small derived sparkline data from telemetry timestamps (counts per minute)
  const sparkData = useMemo(() => {
    // build simple last-10 buckets from telemetry created_at
    const now = Date.now();
    const buckets = new Array(10).fill(0);
    telemetry.forEach((t) => {
      const ts = new Date(t.created_at).getTime();
      const age = Math.max(0, Math.floor((now - ts) / 60000)); // minutes ago
      if (age < 10) buckets[9 - age] += 1;
    });
    return buckets.map((v, i) => ({ i, v }));
  }, [telemetry]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-8 font-mono">
      {/* TOP COMMAND BAR */}
      <div className="flex justify-between items-center mb-12 border-b border-blue-500/20 pb-8">
        <div>
          <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-[0.5em]">
            <Cpu size={14} className="animate-spin-slow" /> Sovereign OS Architecture
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            Command <span className="text-blue-600">Center</span>
          </h1>
        </div>

        <div className="flex gap-4 items-center">
          <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-xl flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">System Integrity</span>
              <span className="text-emerald-400 font-bold">100% SEALED</span>
            </div>
            <div className="h-10 w-px bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Global Triggers</span>
              <span className="text-white font-bold">2,808 Active</span>
            </div>
          </div>

          {/* Search and a show-sensitive toggle (uses Search + Eye icons) */}
          <div className="flex items-center gap-2">
            <button title="Search" className="p-3 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"><Search size={16} /></button>
            <button
              title={showSensitive ? "Hide sensitive" : "Show sensitive"}
              onClick={() => setShowSensitive(s => !s)}
              className="p-3 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Eye size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* QUAD-GRID MONITORING */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
        <MetricBox title="Real-Time Visits" value={telemetry.length.toLocaleString()} icon={Globe} color="text-blue-400" sparkData={sparkData} />
        <MetricBox title="Global Signups" value={revenue.reduce((acc, r) => acc + (r.signups ?? 0), 0)} icon={UserPlus} color="text-emerald-400" sparkData={sparkData} />
        <MetricBox title="Total Receivables" value={(() => {
          const total = revenue.reduce((acc, r) => acc + (Number(r.ltv_revenue) || 0), 0);
          return `$${(total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toString())}`;
        })()} icon={DollarSign} color="text-yellow-400" sparkData={sparkData} />
        <MetricBox title="Anomalies" value={anomalies.length} icon={ShieldAlert} color={anomalies.length > 0 ? "text-red-500 animate-pulse" : "text-slate-500"} sparkData={sparkData} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LIVE ACTIVITY FEED (The "Matrix" view) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
            <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-6">
              <Terminal className="text-blue-500" /> Global Activity Stream
            </h3>

            <div className="space-y-3">
              {loading && <div className="text-slate-400 p-4">Loading telemetry…</div>}
              {!loading && telemetry.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-blue-500/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${String(log.severity_level ?? log.severity).toUpperCase() === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-600'}`}>
                      {log.event_category}
                    </span>
                    <span className="text-xs font-bold text-slate-300">{log.event_name}</span>
                    <span className="text-[10px] text-slate-500 italic">{log.metadata?.path || 'Root'}</span>
                  </div>
                  <span className="text-[10px] text-slate-600 group-hover:text-blue-400 transition-colors">
                    {new Date(log.created_at).toLocaleTimeString()}
                    {showSensitive ? ` • ${log.tenant_id ?? '—'}` : ''}
                  </span>
                </div>
              ))}
              {!loading && telemetry.length === 0 && <div className="text-slate-500 p-4">No activity yet.</div>}
            </div>
          </div>
        </div>

        {/* TENANT REVENUE MONITOR */}
        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8">
          <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-6">
            <Activity className="text-emerald-500" /> Organization Health
          </h3>
          <div className="space-y-6">
            {revenue.length === 0 && <div className="text-slate-500">No revenue data.</div>}
            {revenue.map((biz: any, i: number) => (
              <div key={i} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-0">
                <div>
                  <p className="text-sm font-bold text-white uppercase">{biz.tenant_name}</p>
                  <p className="text-[10px] text-slate-500">{biz.active_users ?? 0} Active Users</p>
                </div>

                <div className="text-right w-40">
                  <p className="text-sm font-black text-emerald-400">${Number(biz.ltv_revenue || 0).toLocaleString()}</p>
                  <span className="text-[9px] font-bold text-slate-600 uppercase italic">{biz.subscription_status || 'N/A'}</span>

                  {/* Small sparkline using AreaChart (uses LineChart/AreaChart imports) */}
                  <div className="h-14 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={Array.from({length: 8}, (_, idx) => ({ x: idx, y: (biz.history?.[idx] ?? 0) }))}>
                        <Area type="monotone" dataKey="y" stroke="#34d399" fill="#10b9811a" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* MetricBox: uses Globe, Zap, etc., and renders a tiny sparkline if sparkData is provided */
function MetricBox({ title, value, icon: Icon, color, sparkData }: any) {
  return (
    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl hover:border-blue-500/40 transition-all">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
          <p className={`text-3xl font-black tracking-tighter ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Icon size={20} className="text-slate-700" />

          {/* show a tiny sparkline (uses LineChart import when sparkData present) */}
          {Array.isArray(sparkData) && sparkData.length > 0 && (
            <div className="w-28 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <XAxis dataKey="i" hide />
                  <YAxis hide domain={[0, 'dataMax']} />
                  <Tooltip formatter={(val: any) => [val, 'events']} />
                  <Line type="monotone" dataKey="v" stroke="#60a5fa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* subtle footer: uses Zap icon to indicate live pulse */}
      <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
        <Zap size={12} /> Live pulse
      </div>
    </div>
  );
}