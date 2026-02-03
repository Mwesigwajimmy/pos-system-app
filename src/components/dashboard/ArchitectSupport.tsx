"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageCircle, Bell } from 'lucide-react';

export default function ArchitectSupport({ tenantId }: { tenantId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Listen for broadcasts from you (The Architect)
    const fetchBroadcasts = async () => {
      const { data } = await supabase
        .from('system_broadcasts')
        .select('*')
        .or(`target_tenant_id.eq.${tenantId},target_tenant_id.is.null`)
        .order('created_at', { ascending: false });
      setMessages(data || []);
    };
    fetchBroadcasts();
  }, []);

  return (
    <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
      <h4 className="text-xs font-black text-blue-400 uppercase flex items-center gap-2 mb-4">
        <Bell size={12} /> System Communications
      </h4>
      <div className="space-y-3">
        {messages.map(m => (
          <div key={m.id} className="p-3 bg-white/5 rounded-xl text-xs">
            <p className="font-bold text-white">{m.title}</p>
            <p className="text-slate-400 mt-1">{m.content}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="text-[10px] text-slate-500 italic">No new messages from the Architect.</p>}
      </div>
      <button className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-blue-700 transition-all">
        Open Support Ticket
      </button>
    </div>
  );
}