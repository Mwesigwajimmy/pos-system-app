"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Mail, Globe, Clock, UserCheck, ArrowRight } from 'lucide-react';

export default function LeadInsights() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize client so we don't recreate it on every render
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchLeads = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('system_marketing_leads')
          .select('*')
          .order('last_visit', { ascending: false })
          .limit(10);

        if (dbError) throw dbError;

        if (mounted) setLeads(data ?? []);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchLeads();

    // Real-time listener for new leads from the landing page
    const channel = supabase
      .channel('public:live_leads')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_marketing_leads' },
        (payload) => {
          setLeads((prev) => [payload.new, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        if (typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        } else if (supabase.removeChannel) {
          supabase.removeChannel(channel);
        }
      } catch {
        // swallow cleanup errors
      }
    };
  }, [supabase]);

  const fmtTimeAgo = useCallback((iso?: string) => {
    try {
      if (!iso) return 'unknown';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'unknown';
      return `${formatDistanceToNow(d)} ago`;
    } catch {
      return 'unknown';
    }
  }, []);

  return (
    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
      <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
        <UserCheck className="text-blue-500" /> Incoming Global Leads
      </h3>

      {loading && <div className="text-slate-400 py-6">Loading leads…</div>}
      {error && <div className="text-red-300 bg-red-900/10 p-3 rounded">{error}</div>}

      <div className="space-y-4">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/10 rounded-xl text-blue-400">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{lead.email}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <Globe size={10} /> {lead.ip_address?.substring(0, 15) || 'Hidden IP'} • {lead.country_code || 'Global'}
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-2">
              <p className="text-[10px] font-black text-slate-600 uppercase">{fmtTimeAgo(lead.last_visit)}</p>
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase mt-1">
                <Clock size={10} /> {lead.automation_sent ? 'Welcome Sent' : 'Queued'}
              </div>

              {/* Action: view details / navigate to lead */}
              <a
                href={lead.profile_url || `mailto:${lead.email}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-xs text-blue-400 hover:underline"
                title="Open lead"
              >
                <span>Open</span>
                <ArrowRight size={12} />
              </a>
            </div>
          </div>
        ))}

        {!loading && leads.length === 0 && (
          <p className="text-center text-slate-600 py-10 italic">Awaiting your first sovereign lead...</p>
        )}
      </div>
    </div>
  );
}