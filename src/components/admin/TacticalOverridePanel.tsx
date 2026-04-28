"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  Send, 
  MessageSquare, 
  Power, 
  UserX, 
  CreditCard, 
  Loader2, 
  AlertTriangle,
  Command,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

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

  // REAL RPC CALL: Atomic Transaction (Untouched Logic)
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
    <div className="fixed right-8 top-28 w-[440px] bg-white border border-slate-200 rounded-[3.5rem] p-10 shadow-2xl z-50 animate-in slide-in-from-right-8 duration-700 font-sans">
      
      {/* HUD Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                <Command size={14} className="text-blue-600" />
            </div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] leading-none">
                Tactical Interface
            </span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            {tenant.name}
          </h3>
          <div className="flex items-center gap-2 mt-3">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">{tenant.id}</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
        >
          <Power size={22} />
        </button>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-5 mb-10">
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isProcessing}
          className="flex flex-col items-start gap-4 p-7 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100/50 transition-all group active:scale-95"
        >
          <div className="p-3 bg-amber-50 rounded-2xl group-hover:bg-amber-400 group-hover:text-white transition-colors">
            <CreditCard className="text-amber-600 group-hover:text-white transition-transform duration-500" size={24} />
          </div>
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Financial Lock</span>
        </button>

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isProcessing}
          className="flex flex-col items-start gap-4 p-7 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-red-500 hover:shadow-xl hover:shadow-red-100/50 transition-all group active:scale-95"
        >
          <div className="p-3 bg-red-50 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-colors">
            <ShieldAlert className="text-red-600 group-hover:text-white transition-transform duration-500" size={24} />
          </div>
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Hard Suspend</span>
        </button>
      </div>

      {/* Real-time Messaging */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <MessageSquare size={16} className="text-blue-500" /> Secure Directive
            </div>
            <span className="text-[9px] font-bold text-slate-300 uppercase">Encrypted Signal</span>
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Construct command payload for tenant..."
          className="w-full h-36 bg-[#f8fafc] border-2 border-slate-100 rounded-[2rem] p-6 text-sm text-slate-700 font-bold placeholder:text-slate-300 focus:border-blue-500/50 focus:bg-white outline-none resize-none transition-all"
        />
        <button
          onClick={dispatchCommand}
          disabled={isProcessing || !msg.trim()}
          className="w-full h-16 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-4 transition-all active:scale-95"
        >
          {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          Execute Dispatch
        </button>
      </div>

      {/* FOOTER SYSTEM BADGE */}
      <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between opacity-50">
          <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-600" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Auth Code: BBU1-ADMIN</span>
          </div>
          <span className="text-[9px] font-mono text-slate-300 uppercase">Protocol 10.2</span>
      </div>

      {/* DOUBLE-LOCK CONFIRMATION OVERLAY */}
      {confirmOpen && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-[3.5rem] z-20 p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-amber-50 p-6 rounded-full mb-6">
            <AlertTriangle size={56} className="text-amber-500" />
          </div>
          <h4 className="text-slate-900 font-black uppercase tracking-tighter text-2xl mb-3">Authorize Action?</h4>
          <p className="text-sm text-slate-500 font-bold px-4 leading-relaxed mb-10">
            This will trigger a system-wide status override and permanently notify all associated tenant administrators.
          </p>
          <div className="flex flex-col w-full gap-4">
            <button
              onClick={() => handleTacticalAction('LOCK')}
              className="w-full h-14 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-red-700 shadow-xl shadow-red-100 transition-all active:scale-95"
            >
              Confirm Execution
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="w-full h-14 bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
            >
              Abort Signal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}