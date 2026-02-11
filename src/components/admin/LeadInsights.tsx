"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  Mail, Globe, Clock, UserCheck, ArrowRight, 
  ShieldCheck, Loader2, Zap, Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

  // 1. Data Processing Logic
  const handleIncomingLead = useCallback((newLead: Lead) => {
    setLeads((prev) => {
      // Prevent duplicates from race conditions between initial fetch and subscription
      if (prev.find((l) => l.id === newLead.id)) return prev;
      return [newLead, ...prev].slice(0, 10);
    });
  }, []);

  // 2. Lifecycle Management
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

    // 3. Real-time Channel with Status Monitoring
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
    <section className="relative bg-slate-950 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden group">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Zap size={120} className="text-blue-500" />
      </div>

      <header className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "h-1.5 w-1.5 rounded-full",
              isLive ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Inbound Pipeline {isLive ? '(Live)' : '(Synced)'}
            </h3>
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">
            Lead<span className="text-blue-600">_Insights</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-500 uppercase">System Status</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Autonomous</p>
          </div>
          <ShieldCheck className="text-blue-500" size={20} />
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3">
          <Loader2 size={14} className="animate-spin" /> {error}
        </div>
      )}

      <div className="space-y-3 relative z-10">
        <AnimatePresence initial={false} mode="popLayout">
          {isLoading ? (
            [...Array(3)].map((_, i) => <LeadSkeleton key={i} />)
          ) : leads.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <p className="text-slate-600 font-bold italic text-sm tracking-tight uppercase">
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
    </section>
  );
}

// --- Sub-components for better performance and clean code ---

function LeadCard({ lead }: { lead: Lead }) {
  const timeAgo = formatDistanceToNow(new Date(lead.last_visit), { addSuffix: true });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/[0.05] rounded-3xl border border-white/5 group/card transition-colors"
    >
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-500 group-hover/card:scale-110 transition-transform">
            <Mail size={20} />
          </div>
          {lead.automation_sent && (
            <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-slate-950">
              <Send size={8} className="text-white" />
            </div>
          )}
        </div>
        
        <div>
          <p className="text-sm font-black text-white tracking-tight">{lead.email}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1 text-slate-500">
              <Globe size={10} /> {lead.country_code || 'Global'}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-800" />
            <span className="text-slate-600 font-mono">
              {lead.ip_address ? lead.ip_address.replace(/\d+$/, '***') : 'Direct'}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-center justify-end gap-2 text-slate-500 mb-2">
          <Clock size={10} />
          <span className="text-[10px] font-black uppercase tracking-tighter tabular-nums">
            {timeAgo}
          </span>
        </div>
        
        <a
          href={lead.profile_url || `mailto:${lead.email}`}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
        >
          Inspect <ArrowRight size={12} />
        </a>
      </div>
    </motion.div>
  );
}

function LeadSkeleton() {
  return (
    <div className="h-24 w-full bg-white/5 rounded-3xl animate-pulse border border-white/5" />
  );
}