"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Globe, Clock, UserCheck, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function LeadInsights() {
  const [leads, setLeads] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase
        .from('system_marketing_leads')
        .select('*')
        .order('last_visit', { ascending: false })
        .limit(10);
      setLeads(data || []);
    };
    fetchLeads();

    // Real-time listener for new leads from the landing page
    const channel = supabase
      .channel('live_leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_marketing_leads' }, 
      (p) => setLeads(prev => [p.new, ...prev].slice(0, 10)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
      <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
        <UserCheck className="text-blue-500" /> Incoming Global Leads
      </h3>
      
      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-blue-500/50 transition-all">
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
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-600 uppercase">
                    {formatDistanceToNow(new Date(lead.last_visit))} ago
                </p>
                <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase mt-1">
                   <Clock size={10} /> {lead.automation_sent ? 'Welcome Sent' : 'Queued'}
                </div>
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <p className="text-center text-slate-600 py-10 italic">Awaiting your first sovereign lead...</p>
        )}
      </div>
    </div>
  );
}