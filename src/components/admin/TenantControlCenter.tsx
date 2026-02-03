"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, ShieldAlert, CreditCard, Send, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TenantControlCenter() {
  const [tenants, setTenants] = useState<any[]>([]);
  const supabase = createClient();

  const loadTenants = async () => {
    const { data } = await supabase
      .from('tenants')
      .select('*, profiles(count)')
      .order('next_payment_date', { ascending: true });
    setTenants(data || []);
  };

  const sendMessage = async (tid: string) => {
    const msg = prompt("Enter update/message for this tenant:");
    if (msg) {
      await supabase.from('system_broadcasts').insert({
        target_tenant_id: tid,
        title: 'Architect Update',
        content: msg
      });
      alert("Message Dispatched via Sovereign Bridge.");
    }
  };

  useEffect(() => { loadTenants(); }, []);

  return (
    <div className="bg-slate-900/40 rounded-[2rem] border border-white/5 p-8 backdrop-blur-xl">
      <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-2">
        <ShieldAlert className="text-red-500" /> Active Tenant Control
      </h3>
      <div className="space-y-4">
        {tenants.map(t => (
          <div key={t.id} className="flex items-center justify-between p-6 bg-black/40 rounded-2xl border border-white/5 group hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-6">
               <div className={`h-3 w-3 rounded-full ${new Date(t.next_payment_date) < new Date() ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
               <div>
                  <p className="font-black text-white uppercase">{t.name}</p>
                  <p className="text-[10px] text-slate-500">Next Pay: {t.next_payment_date} • {t.business_type}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <Button size="sm" variant="ghost" onClick={() => sendMessage(t.id)} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white">
                  <Send size={14} className="mr-2"/> Dispatch Message
               </Button>
               <Button size="sm" variant="ghost" className="bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white">
                  Freeze Account
               </Button>
            </div>
            
            <div className="text-right">
               <p className="text-sm font-black text-white">${t.last_payment_amount}</p>
               <span className="text-[9px] font-bold text-slate-500 uppercase italic">LTV: {t.subscription_plan}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}