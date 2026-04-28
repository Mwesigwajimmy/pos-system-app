"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  Globe, User, ShieldAlert, CreditCard, LogIn, 
  Activity, Search, Terminal, Info, X, 
  Cpu, Zap, Pulse, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

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

// --- Types ---
type EventCategory = 'VISIT' | 'SIGNUP' | 'ERROR' | 'PAYMENT' | string;

interface TelemetryLog {
  id: string;
  created_at: string;
  event_name: string;
  event_category: EventCategory;
  tenant_id?: string;
  metadata: Record<string, any>;
  tenants?: { name: string }; // Joined data from initial fetch
}

export default function GlobalTelemetryFeed() {
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<TelemetryLog | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  // Cache for tenant names to resolve Realtime payloads that lack joins
  const tenantCache = useRef<Record<string, string>>({});

  const supabase = useMemo(() => createClient(), []);

  // 1. Unified Log Injection (Handles Cache & Formatting)
  const injectLogs = useCallback((newLogs: TelemetryLog[], method: 'prepend' | 'set') => {
    setLogs((prev) => {
      const incoming = newLogs.map(log => {
        // If we have a tenant name in the cache but not in the log, fill it
        if (log.tenant_id && !log.tenants && tenantCache.current[log.tenant_id]) {
          return { ...log, tenants: { name: tenantCache.current[log.tenant_id] } };
        }
        // If the log HAS a tenant name, add it to the cache for future real-time hits
        if (log.tenant_id && log.tenants?.name) {
          tenantCache.current[log.tenant_id] = log.tenants.name;
        }
        return log;
      });

      if (method === 'set') return incoming.slice(0, 50);
      
      // Filter out duplicates (important for real-time edge cases)
      const existingIds = new Set(prev.map(l => l.id));
      const uniqueIncoming = incoming.filter(l => !existingIds.has(l.id));
      return [...uniqueIncoming, ...prev].slice(0, 50);
    });
  }, []);

  // 2. Initial Fetch and Real-time Subscription
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_global_telemetry')
        .select('*, tenants(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (mounted && data) injectLogs(data as TelemetryLog[], 'set');
      if (mounted) setLoading(false);
    };

    init();

    const channel = supabase
      .channel('telemetry-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' },
        (payload) => {
          injectLogs([payload.new as TelemetryLog], 'prepend');
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsLive(true);
        else setIsLive(false);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, injectLogs]);

  return (
    <div className="flex h-[700px] bg-white border border-slate-200 rounded-[32px] overflow-hidden relative shadow-sm font-sans animate-in fade-in duration-1000">
      
      {/* MAIN FEED SECTION */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]/30">
        <header className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Terminal size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Global Telemetry</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="relative flex items-center justify-center">
                   <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-emerald-500" : "bg-slate-300")} />
                   {isLive && <span className="absolute h-4 w-4 bg-emerald-400 rounded-full animate-ping opacity-20" />}
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  {isLive ? 'Stream Active' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="px-3.5 py-1.5 bg-slate-100/50 rounded-full border border-slate-200 text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">
                Nodes: {logs.length} / 50
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {loading ? (
            <div className="flex flex-col gap-3 p-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-20 w-full bg-slate-100 rounded-[20px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <TelemetryItem 
                    key={log.id} 
                    log={log} 
                    isSelected={selectedLog?.id === log.id}
                    onSelect={() => setSelectedLog(log)} 
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* SYSTEM FOOTER INDICATOR */}
        <footer className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Database size={12} className="text-slate-300" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Sovereign Pipeline v10.2</span>
            </div>
            <div className="flex items-center gap-3">
                <Cpu size={12} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Latency: Optmized</span>
            </div>
        </footer>
      </div>

      {/* SIDE INSPECTOR (SLIDE-OVER) */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="absolute right-0 top-0 bottom-0 w-[400px] bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-lg">
                    <Zap size={14} className="text-white" />
                </div>
                <span className="text-xs font-black uppercase text-slate-900 tracking-widest">Signal Metadata</span>
              </div>
              <button 
                onClick={() => setSelectedLog(null)} 
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-8 bg-white">
              <div className="bg-slate-900 rounded-[20px] p-6 shadow-inner relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Database size={60} className="text-white" />
                </div>
                <pre className="text-[12px] font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed relative z-10">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>

              <div className="mt-10 space-y-6">
                <div className="space-y-1.5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precise ISO Timestamp</p>
                   <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-mono font-bold">
                        {new Date(selectedLog.created_at).toISOString()}
                   </div>
                </div>
                <div className="space-y-1.5">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Hash Trace</p>
                   <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 font-mono break-all leading-tight">
                        {selectedLog.id}
                   </div>
                </div>
                <div className="pt-6 border-t border-slate-50">
                    <button className="w-full h-12 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
                        Trace Origin Point
                    </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}

// --- SUB-COMPONENT: TELEMETRY ITEM ---
function TelemetryItem({ log, onSelect, isSelected }: { log: TelemetryLog, onSelect: () => void, isSelected: boolean }) {
  const getCategoryTheme = (cat: EventCategory) => {
    switch (cat) {
      case 'VISIT': return { icon: <Globe size={16} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'SIGNUP': return { icon: <User size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
      case 'ERROR': return { icon: <ShieldAlert size={16} />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
      case 'PAYMENT': return { icon: <CreditCard size={16} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
      default: return { icon: <Activity size={16} />, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
    }
  };

  const theme = getCategoryTheme(log.event_category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={cn(
        "group cursor-pointer p-4 rounded-2xl flex items-center justify-between transition-all duration-300",
        isSelected 
            ? "bg-white border-2 border-blue-500 shadow-xl shadow-blue-100 -translate-y-0.5" 
            : "bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center gap-5 min-w-0">
        <div className={cn("p-3 rounded-2xl shrink-0 transition-all border group-hover:scale-105 shadow-sm", theme.bg, theme.color, theme.border)}>
          {theme.icon}
        </div>
        <div className="truncate">
          <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
            {log.event_name}
          </p>
          <div className="flex items-center gap-3 mt-1">
             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">
               {log.tenants?.name || 'Public_Node'}
             </span>
             <span className="h-1 w-1 rounded-full bg-slate-200" />
             <span className="text-[10px] text-blue-500 font-mono font-bold truncate">
               {log.metadata?.path || '/root'}
             </span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 ml-4 flex flex-col items-end gap-2">
        <div className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[9px] font-black text-slate-500 uppercase tabular-nums">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: false })}
            </p>
        </div>
        <div className={cn(
          "transition-all",
          isSelected ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-100 scale-100"
        )}>
           <Info size={16} className="text-blue-600" />
        </div>
      </div>
    </motion.div>
  );
}