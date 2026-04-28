"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Mail, Globe, Clock, UserCheck, ArrowRight, 
  ShieldCheck, Loader2, Zap, Send, 
  BarChart3, Target, MousePointer2, ExternalLink
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
interface Lead {
  id: string;
  email: string;
  ip_address: string | null;
  country_code: string | null;
  last_visit: string;
  automation_sent: boolean;
  profile_url?: string;
  source_path?: string;
}

export default function LeadInsights() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // 1. Data Processing Logic (Untouched)
  const handleIncomingLead = useCallback((newLead: Lead) => {
    setLeads((prev) => {
      if (prev.find((l) => l.id === newLead.id)) return prev;
      return [newLead, ...prev].slice(0, 10);
    });
  }, []);

  // 2. Lifecycle Management (Untouched)
  useEffect(() => {
    let isMounted = true;

    const initializeLeads = async () => {
      try {
        setIsLoading(true);
        const { data, error: dbError } = await supabase
          .from('system_marketing_leads')
          .select('*')
          .order('last_visit', { ascending: false })
          .limit(10);

        if (dbError) throw dbError;
        if (isMounted) setLeads(data || []);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Buffer synchronization failed');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeLeads();

    const channel = supabase
      .channel('marketing_intelligence')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_marketing_leads' },
        (payload) => {
          handleIncomingLead(payload.new as Lead);
        }
      )
      .subscribe((status) => {
        if (isMounted) setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, handleIncomingLead]);

  return (
    <section className="relative bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm overflow-hidden group animate-in fade-in duration-1000">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
        <Target size={140} className="text-blue-600" />
      </div>

      <header className="flex items-center justify-between mb-10 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative flex items-center justify-center">
                <span className={cn(
                    "h-2 w-2 rounded-full",
                    isLive ? "bg-emerald-500" : "bg-red-500"
                )} />
                {isLive && <span className="absolute h-4 w-4 bg-emerald-400 rounded-full animate-ping opacity-25" />}
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
              Inbound Pipeline {isLive ? '(Live Stream)' : '(Offline Buffer)'}
            </h3>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
            Lead<span className="text-blue-600">_Insights</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-5 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">System Logic</p>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Autonomous Agent</p>
          </div>
          <div className="bg-white p-2 rounded-xl shadow-sm">
            <ShieldCheck className="text-blue-600" size={20} />
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-8 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-top-2">
          <Loader2 size={16} className="animate-spin" /> {error}
        </div>
      )}

      <div className="space-y-4 relative z-10">
        <AnimatePresence initial={false} mode="popLayout">
          {isLoading ? (
            [...Array(4)].map((_, i) => <LeadSkeleton key={i} />)
          ) : leads.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="py-20 text-center flex flex-col items-center justify-center"
            >
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <MousePointer2 size={32} className="text-slate-200" />
              </div>
              <p className="text-slate-400 font-black text-xs tracking-widest uppercase">
                Awaiting first sovereign signal...
              </p>
            </motion.div>
          ) : (
            leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-10 pt-8 border-t border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-slate-300" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Market Intel v10.2</span>
         </div>
         <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
            View All Conversion Paths
         </button>
      </footer>
    </section>
  );
}

// --- Sub-components for better performance and clean code ---

function LeadCard({ lead }: { lead: Lead }) {
  const timeAgo = formatDistanceToNow(new Date(lead.last_visit), { addSuffix: true });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="flex items-center justify-between p-6 bg-white hover:bg-[#f8fafc] rounded-[2.5rem] border border-slate-100 group/card transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
    >
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="p-5 bg-blue-50 rounded-[1.5rem] text-blue-600 group-hover/card:bg-blue-600 group-hover/card:text-white transition-all duration-500 shadow-sm">
            <Mail size={22} />
          </div>
          {lead.automation_sent && (
            <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full p-1.5 border-4 border-white shadow-sm">
              <Send size={10} className="text-white" />
            </div>
          )}
        </div>
        
        <div>
          <p className="text-base font-black text-slate-900 tracking-tight">{lead.email}</p>
          <div className="flex items-center gap-4 mt-1.5 text-[10px] font-black uppercase tracking-[0.15em]">
            <span className="flex items-center gap-1.5 text-slate-400 group-hover/card:text-blue-500 transition-colors">
              <Globe size={12} /> {lead.country_code || 'GLOBAL_NODE'}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-200" />
            <span className="text-slate-400 font-mono tracking-normal">
              {lead.ip_address ? lead.ip_address.replace(/\d+$/, '***') : 'STATIC_IP'}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-center justify-end gap-2 text-slate-400 mb-3">
          <Clock size={12} />
          <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
            {timeAgo}
          </span>
        </div>
        
        <a
          href={lead.profile_url || `mailto:${lead.email}`}
          className="inline-flex items-center gap-3 px-6 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
        >
          Inspect <ExternalLink size={12} />
        </a>
      </div>
    </motion.div>
  );
}

function LeadSkeleton() {
  return (
    <div className="h-28 w-full bg-slate-50 rounded-[2.5rem] animate-pulse border border-slate-100" />
  );
}