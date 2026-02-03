"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Globe, User, ShieldAlert, CreditCard, LogIn } from 'lucide-react';

export default function GlobalTelemetryFeed() {
  const [logs, setLogs] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // 1. Initial Load
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('system_global_telemetry')
        .select('*, tenants(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setLogs(data);
    };
    fetchLogs();

    // 2. Real-time Stream
    const channel = supabase
      .channel('live_telemetry')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'VISIT': return <Globe className="text-slate-400" size={14} />;
      case 'SIGNUP': return <User className="text-emerald-500" size={14} />;
      case 'ERROR': return <ShieldAlert className="text-red-500" size={14} />;
      case 'PAYMENT': return <CreditCard className="text-blue-500" size={14} />;
      default: return <LogIn className="text-slate-500" size={14} />;
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden backdrop-blur-md">
      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
        {logs.map((log) => (
          <div key={log.id} className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors flex items-center justify-between group">
            <div className="flex items-center gap-4">
               <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {getIcon(log.event_category)}
               </div>
               <div>
                  <p className="text-xs font-black text-slate-300 uppercase tracking-tight">
                    {log.event_name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {log.tenants?.name || 'Public Visitor'} • {log.metadata?.path || 'App root'}
                  </p>
               </div>
            </div>
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-600 uppercase">
                    {formatDistanceToNow(new Date(log.created_at))} ago
                </p>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="text-[9px] font-bold text-blue-400 hover:underline">Inspect Metadata</button>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}