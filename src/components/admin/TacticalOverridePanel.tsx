"use client";

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, ShieldAlert, Send, MessageSquare, Power, UserX, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function TacticalOverridePanel({ tenant, onClose }: any) {
  const [msg, setMsg] = useState('');
  const supabase = createClient();

  const updateStatus = async (newStatus: string, reason: string) => {
    const { error } = await supabase
      .from('tenants')
      .update({ status: newStatus })
      .eq('id', tenant.id);

    if (!error) {
      // Log the tactical action to telemetry
      await supabase.from('system_global_telemetry').insert({
        event_category: 'SECURITY',
        event_name: `TENANT_OVERRIDE_${newStatus.toUpperCase()}`,
        severity_level: 'CRITICAL',
        tenant_id: tenant.id,
        metadata: { reason, architect_id: 'Sovereign_Root' }
      });
      toast.error(`Tactical Status Updated: ${newStatus}`);
    }
  };

  const dispatchMessage = async () => {
    if (!msg) return;
    const { error } = await supabase.from('system_tactical_comms').insert({
      tenant_id: tenant.id,
      message: msg,
      is_architect_reply: true,
      is_urgent: true
    });
    if (!error) {
      toast.success("Tactical Directive Dispatched");
      setMsg('');
    }
  };

  return (
    <div className="fixed right-6 top-24 w-96 bg-slate-950 border border-blue-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(37,99,235,0.2)] p-8 animate-in slide-in-from-right duration-300 z-[100] backdrop-blur-2xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="font-black text-white uppercase tracking-tighter text-xl">{tenant.name}</h3>
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">ID: {tenant.id.substring(0,8)}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><Power size={18}/></button>
      </div>

      {/* OVERRIDE ACTIONS */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button 
          onClick={() => updateStatus('locked_payment', 'Subscription Expired')}
          className="flex flex-col items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl hover:bg-yellow-500/20 transition-all group"
        >
          <CreditCard className="text-yellow-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black text-yellow-500 uppercase">Lock Payment</span>
        </button>
        <button 
          onClick={() => updateStatus('suspended_suspicious', 'Fraud Pattern Detected')}
          className="flex flex-col items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all group"
        >
          <ShieldAlert className="text-red-500 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black text-red-500 uppercase">Suspend Scam</span>
        </button>
      </div>

      {/* TACTICAL CHAT */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
          <MessageSquare size={14} /> Sovereign Messaging
        </div>
        <textarea 
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Dispatch directive to tenant..."
          className="w-full h-32 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-medium text-slate-300 focus:border-blue-500/50 focus:ring-0 resize-none transition-all"
        />
        <button 
          onClick={dispatchMessage}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
        >
          <Send size={14} /> Dispatch Command
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
         <p className="text-[9px] text-slate-600 italic font-medium leading-relaxed text-center">
           Execution of override status affects 316 modules and 2,808 triggers for this tenant immediately.
         </p>
      </div>
    </div>
  );
}