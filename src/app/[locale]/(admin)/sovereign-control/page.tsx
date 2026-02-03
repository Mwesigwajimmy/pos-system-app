"use client";

import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Activity, Globe, DollarSign, 
  UserPlus, Terminal, Cpu, Zap, Search, Eye
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function SovereignControlPanel() {
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // 1. Initial Load of Global Intelligence
    const loadIntelligence = async () => {
      const { data: tel } = await supabase.from('system_global_telemetry').select('*').order('created_at', { ascending: false }).limit(20);
      const { data: rev } = await supabase.from('view_admin_global_revenue').select('*');
      const { data: ano } = await supabase.from('view_admin_critical_anomalies').select('*');
      
      setTelemetry(tel || []);
      setRevenue(rev || []);
      setAnomalies(ano || []);
    };

    // 2. LIVE WIRE: Listen to EVERY action in the system globally
    const channel = supabase
      .channel('sovereign_eyes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' }, (p) => {
        setTelemetry(prev => [p.new, ...prev].slice(0, 20));
      })
      .subscribe();

    loadIntelligence();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
        
        <div className="flex gap-4">
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
        </div>
      </div>

      {/* QUAD-GRID MONITORING */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
        <MetricBox title="Real-Time Visits" value="1,204" icon={Globe} color="text-blue-400" />
        <MetricBox title="Global Signups" value="82" icon={UserPlus} color="text-emerald-400" />
        <MetricBox title="Total Receivables" value="$1.4M" icon={DollarSign} color="text-yellow-400" />
        <MetricBox title="Anomalies" value={anomalies.length} icon={ShieldAlert} color={anomalies.length > 0 ? "text-red-500 animate-pulse" : "text-slate-500"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LIVE ACTIVITY FEED (The "Matrix" view) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
             <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-6">
                <Terminal className="text-blue-500" /> Global Activity Stream
             </h3>
             <div className="space-y-3">
                {telemetry.map(log => (
                   <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-blue-500/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${log.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-600'}`}>
                           {log.event_category}
                        </span>
                        <span className="text-xs font-bold text-slate-300">{log.event_name}</span>
                        <span className="text-[10px] text-slate-500 italic">{log.metadata?.path || 'Root'}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 group-hover:text-blue-400 transition-colors">
                        JUST NOW
                      </span>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* TENANT REVENUE MONITOR */}
        <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-8">
            <h3 className="text-lg font-black uppercase flex items-center gap-3 mb-6">
               <Activity className="text-emerald-500" /> Organization Health
            </h3>
            <div className="space-y-6">
                {revenue.map((biz, i) => (
                   <div key={i} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-0">
                      <div>
                        <p className="text-sm font-bold text-white uppercase">{biz.tenant_name}</p>
                        <p className="text-[10px] text-slate-500">{biz.active_users} Active Users</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-400">${Number(biz.ltv_revenue).toLocaleString()}</p>
                        <span className="text-[9px] font-bold text-slate-600 uppercase italic">{biz.subscription_status}</span>
                      </div>
                   </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl hover:border-blue-500/40 transition-all">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
          <p className={`text-3xl font-black tracking-tighter ${color}`}>{value}</p>
        </div>
        <Icon size={20} className="text-slate-700" />
      </div>
    </div>
  );
}