"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Lock, ShieldAlert, Send, MessageSquare, 
  Power, UserX, CreditCard, Loader2, AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';

interface TacticalProps {
  tenant: { id: string; name: string; status: string };
  adminId: string; 
  onClose: () => void;
}

export default function TacticalOverridePanel({ tenant, adminId, onClose }: TacticalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [msg, setMsg] = useState('');
  
  const supabase = useMemo(() => createClient(), []);

  // REAL RPC CALL: Atomic Transaction
  const handleTacticalAction = async (actionType: 'LOCK' | 'SUSPEND') => {
    setIsProcessing(true);
    const status = actionType === 'LOCK' ? 'locked_payment' : 'suspended_suspicious';
    const reason = actionType === 'LOCK' ? 'Financial Lockout' : 'Security Anomaly';

    try {
      const { error } = await supabase.rpc('execute_tactical_override', {
        target_tenant_id: tenant.id,
        new_status: status,
        override_reason: reason,
        admin_id: adminId
      });

      if (error) throw error;

      toast.success(`Tactical status: ${status.toUpperCase()} deployed.`);
      onClose();
    } catch (err: any) {
      toast.error(`COMMAND_FAILURE: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setConfirmOpen(false);
    }
  };

  const dispatchCommand = async () => {
    if (!msg.trim()) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('system_tactical_comms').insert({
        tenant_id: tenant.id,
        message: msg.trim(),
        is_urgent: true,
        metadata: { dispatched_by: adminId }
      });

      if (error) throw error;
      toast.success("Directive injected into tenant stream.");
      setMsg('');
    } catch (err: any) {
      toast.error("COMM_FAILURE: Signal lost.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed right-6 top-24 w-[420px] bg-[#020617] border border-blue-500/20 rounded-[3rem] p-8 shadow-2xl z-50 backdrop-blur-xl animate-in slide-in-from-right duration-500">
      {/* HUD Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Tactical Interface</span>
          </div>
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{tenant.name}</h3>
          <p className="text-[9px] font-mono text-slate-600 truncate max-w-[200px]">{tenant.id}</p>
        </div>
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
          <Power size={20} />
        </button>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isProcessing}
          className="flex flex-col items-center gap-3 p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl hover:border-amber-500/40 transition-all group"
        >
          <CreditCard className="text-amber-500 group-hover:scale-110 transition-transform" size={24} />
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Financial Lock</span>
        </button>

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isProcessing}
          className="flex flex-col items-center gap-3 p-6 bg-red-500/5 border border-red-500/10 rounded-3xl hover:border-red-500/40 transition-all group"
        >
          <ShieldAlert className="text-red-500 group-hover:scale-110 transition-transform" size={24} />
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Hard Suspend</span>
        </button>
      </div>

      {/* Real-time Messaging */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <MessageSquare size={14} className="text-blue-500" /> Secure Directive
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Enter command directive..."
          className="w-full h-32 bg-black/40 border border-white/5 rounded-3xl p-5 text-sm text-slate-300 focus:border-blue-500/50 outline-none resize-none transition-all"
        />
        <button
          onClick={dispatchCommand}
          disabled={isProcessing || !msg.trim()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 flex items-center justify-center gap-3 transition-all"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Execute Dispatch
        </button>
      </div>

      {/* DOUBLE-LOCK CONFIRMATION OVERLAY */}
      {confirmOpen && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-[3rem] z-10 p-10 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-200">
          <AlertTriangle size={48} className="text-amber-500 mb-4 animate-bounce" />
          <h4 className="text-white font-black uppercase tracking-tighter text-xl mb-2">Authorize Action?</h4>
          <p className="text-xs text-slate-400 mb-8">This will trigger a system-wide status override and notify all associated users.</p>
          <div className="flex flex-col w-full gap-3">
            <button
              onClick={() => handleTacticalAction('LOCK')}
              className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all"
            >
              Confirm Execution
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="w-full py-4 bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10"
            >
              Abort
            </button>
          </div>
        </div>
      )}
    </div>
  );
}