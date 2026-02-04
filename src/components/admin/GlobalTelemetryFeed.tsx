"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Globe, User, ShieldAlert, CreditCard, LogIn } from 'lucide-react';

export default function GlobalTelemetryFeed() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the client so we don't recreate it every render
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    // 1. Initial Load
    const fetchLogs = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('system_global_telemetry')
          .select('*, tenants(name)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (dbError) throw dbError;

        if (mounted) setLogs(data ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchLogs();

    // 2. Real-time Stream
    const channel = supabase
      .channel('public:live_telemetry')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_global_telemetry' },
        (payload) => {
          // Prepend and limit to 50 items
          setLogs((prev) => {
            const next = [payload.new, ...prev];
            return next.slice(0, 50);
          });
        }
      )
      .subscribe((status) => {
        // Optionally handle status changes: subscribed, closed, etc.
        // console.debug('live_telemetry status', status);
      });

    // Cleanup on unmount: unsubscribe/remove the channel
    return () => {
      mounted = false;
      try {
        // channel.unsubscribe() is supported on the channel object,
        // but removeChannel is also safe if available on the client.
        // Use both defensively.
        if (typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        } else if (supabase.removeChannel) {
          supabase.removeChannel(channel);
        }
      } catch (e) {
        // swallow cleanup errors
        // console.warn('Failed to remove channel', e);
      }
    };
  }, [supabase]);

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'VISIT':
        return <Globe className="text-slate-400" size={14} />;
      case 'SIGNUP':
        return <User className="text-emerald-500" size={14} />;
      case 'ERROR':
        return <ShieldAlert className="text-red-500" size={14} />;
      case 'PAYMENT':
        return <CreditCard className="text-blue-500" size={14} />;
      default:
        return <LogIn className="text-slate-500" size={14} />;
    }
  };

  const fmtTimeAgo = (iso?: string) => {
    try {
      if (!iso) return 'unknown';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'unknown';
      return `${formatDistanceToNow(d)} ago`;
    } catch {
      return 'unknown';
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden backdrop-blur-md">
      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
        {loading && (
          <div className="p-6 text-center text-slate-400">Loading telemetry…</div>
        )}

        {error && !loading && (
          <div className="p-4 text-sm text-red-300 bg-red-900/10">{error}</div>
        )}

        {!loading && logs.length === 0 && !error && (
          <div className="p-6 text-center text-slate-500">No telemetry yet.</div>
        )}

        {logs.map((log: any) => (
          <div
            key={log.id}
            className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors flex items-center justify-between group"
          >
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
                {fmtTimeAgo(log.created_at)}
              </p>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                  className="text-[9px] font-bold text-blue-400 hover:underline"
                  onClick={() => {
                    // Lightweight inspector: open a new window with JSON (useful for quick debugging)
                    const details = JSON.stringify(log, null, 2);
                    const w = window.open('', '_blank', 'noopener,noreferrer');
                    if (w) {
                      w.document.title = `Telemetry ${log.id}`;
                      w.document.body.innerHTML = `<pre style="white-space:pre-wrap;font-family:monospace;">${details}</pre>`;
                    }
                  }}
                >
                  Inspect Metadata
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}