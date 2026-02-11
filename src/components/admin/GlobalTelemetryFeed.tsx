"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  Globe, User, ShieldAlert, CreditCard, LogIn, 
  Activity, Search, Terminal, Info, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
    <div className="flex h-[600px] bg-slate-950 border border-white/5 rounded-3xl overflow-hidden relative">
      
      {/* Main Feed Section */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Terminal size={16} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Global Telemetry</h3>
              <div className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-600")} />
                <span className="text-[9px] font-bold text-slate-500 uppercase">{isLive ? 'Live Connection' : 'Offline'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
             <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[10px] font-mono text-slate-400">
                BUFFER: {logs.length}/50
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="flex flex-col gap-2 p-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
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
      </div>

      {/* Side Inspector (Slide-over) */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-white/10 shadow-2xl z-10 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Event Metadata</span>
              <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-white/10 rounded-md text-slate-500">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-[11px] font-mono text-blue-300 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-slate-500 uppercase">Timestamp</p>
                   <p className="text-xs text-slate-300 font-mono">{new Date(selectedLog.created_at).toISOString()}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-slate-500 uppercase">Internal ID</p>
                   <p className="text-xs text-slate-300 font-mono break-all">{selectedLog.id}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-component for clarity and performance ---
function TelemetryItem({ log, onSelect, isSelected }: { log: TelemetryLog, onSelect: () => void, isSelected: boolean }) {
  const getCategoryTheme = (cat: EventCategory) => {
    switch (cat) {
      case 'VISIT': return { icon: <Globe size={14} />, color: 'text-blue-400', bg: 'bg-blue-400/10' };
      case 'SIGNUP': return { icon: <User size={14} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
      case 'ERROR': return { icon: <ShieldAlert size={14} />, color: 'text-red-400', bg: 'bg-red-400/10' };
      case 'PAYMENT': return { icon: <CreditCard size={14} />, color: 'text-amber-400', bg: 'bg-amber-400/10' };
      default: return { icon: <Activity size={14} />, color: 'text-slate-400', bg: 'bg-slate-400/10' };
    }
  };

  const theme = getCategoryTheme(log.event_category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group cursor-pointer p-3 rounded-2xl flex items-center justify-between transition-all",
        isSelected ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-white/5 border border-transparent"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className={cn("p-2 rounded-xl shrink-0 transition-transform group-hover:scale-110", theme.bg, theme.color)}>
          {theme.icon}
        </div>
        <div className="truncate">
          <p className="text-xs font-black text-slate-200 uppercase tracking-tight truncate">
            {log.event_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
             <span className="text-[10px] text-slate-500 font-bold truncate">
               {log.tenants?.name || 'Public'}
             </span>
             <span className="h-1 w-1 rounded-full bg-slate-700" />
             <span className="text-[10px] text-slate-600 font-mono truncate">
               {log.metadata?.path || '/'}
             </span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0 ml-4">
        <p className="text-[9px] font-black text-slate-600 uppercase tabular-nums">
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: false })}
        </p>
        <div className={cn(
          "flex justify-end mt-1 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
           <Info size={12} className="text-blue-500" />
        </div>
      </div>
    </motion.div>
  );
}