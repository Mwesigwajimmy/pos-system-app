"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, ShieldAlert, Send, MessageSquare, Power, UserX, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function TacticalOverridePanel({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const [processing, setProcessing] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const updateStatus = useCallback(async (newStatus: string, reason: string) => {
    if (!tenant?.id) {
      toast.error('Missing tenant id');
      return;
    }

    const ok = window.confirm(
      `Are you sure you want to set tenant "${tenant.name}" to "${newStatus}"?\nThis is an immediate, irreversible tactical action.`
    );
    if (!ok) return;

    setProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      // Log the tactical action to telemetry (best-effort)
      const { error: telemetryError } = await supabase.from('system_global_telemetry').insert({
        event_category: 'SECURITY',
        event_name: `TENANT_OVERRIDE_${String(newStatus).toUpperCase()}`,
        severity_level: 'CRITICAL',
        tenant_id: tenant.id,
        metadata: { reason, architect_id: 'Sovereign_Root', triggered_at: new Date().toISOString() }
      });

      if (telemetryError) {
        // Non-fatal but inform
        console.warn('Telemetry log failed', telemetryError);
      }

      toast.success(`Tactical status updated: ${newStatus}`);
    } catch (err: any) {
      console.error('Failed to update tenant status', err);
      toast.error(`Failed to update status: ${err?.message ?? String(err)}`);
    } finally {
      setProcessing(false);
    }
  }, [supabase, tenant]);

  const dispatchMessage = useCallback(async () => {
    if (!tenant?.id) {
      toast.error('Missing tenant id');
      return;
    }
    if (!msg || msg.trim().length === 0) {
      toast.error('Enter a message to dispatch');
      return;
    }

    const ok = window.confirm(`Dispatch this tactical directive to ${tenant.name}?`);
    if (!ok) return;

    setProcessing(true);
    try {
      const { error } = await supabase.from('system_tactical_comms').insert({
        tenant_id: tenant.id,
        message: msg.trim(),
        is_architect_reply: true,
        is_urgent: true,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      // Optionally log this comm to telemetry as INFO
      await supabase.from('system_global_telemetry').insert({
        event_category: 'COMM',
        event_name: 'TACTICAL_DIRECTIVE_SENT',
        severity_level: 'HIGH',
        tenant_id: tenant.id,
        metadata: { message_preview: msg.trim().slice(0, 200), architect_id: 'Sovereign_Root' }
      }).catch(() => { /* swallow telemetry errors */ });

      toast.success("Tactical directive dispatched");
      setMsg('');
    } catch (err: any) {
      console.error('Failed to dispatch message', err);
      toast.error(`Failed to dispatch: ${err?.message ?? String(err)}`);
    } finally {
      setProcessing(false);
    }
  }, [supabase, tenant, msg]);

  return (
    <div
      className="fixed right-6 top-24 w-96 bg-slate-950 border border-blue-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(37,99,235,0.2)] p-8 animate-in slide-in-from-right duration-300 z-[100] backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={`Tactical override panel for ${tenant?.name ?? 'tenant'}`}
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="font-black text-white uppercase tracking-tighter text-xl">{tenant?.name ?? 'Unknown Tenant'}</h3>
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">ID: {String(tenant?.id ?? '').substring(0,8)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Use Power icon for close (already imported) */}
          <button
            onClick={onClose}
            aria-label="Close tactical panel"
            disabled={processing}
            className="text-slate-500 hover:text-white p-2 rounded"
            title="Close"
          >
            <Power size={18} />
          </button>
        </div>
      </div>

      {/* OVERRIDE ACTIONS */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => updateStatus('locked_payment', 'Subscription Expired')}
          disabled={processing}
          className="flex flex-col items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl hover:bg-yellow-500/20 transition-all group disabled:opacity-60"
          title="Lock payment (suspend payments)"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="text-yellow-500 group-hover:scale-110 transition-transform" />
            <Lock className="text-yellow-500" />
          </div>
          <span className="text-[10px] font-black text-yellow-500 uppercase">Lock Payment</span>
        </button>

        <button
          onClick={() => updateStatus('suspended_suspicious', 'Fraud Pattern Detected')}
          disabled={processing}
          className="flex flex-col items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all group disabled:opacity-60"
          title="Suspend tenant for suspicious activity"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-500 group-hover:scale-110 transition-transform" />
            <UserX className="text-red-500" />
          </div>
          <span className="text-[10px] font-black text-red-500 uppercase">Suspend (Sus)</span>
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
          aria-label="Tactical message"
          disabled={processing}
        />

        <div className="flex gap-2">
          <button
            onClick={dispatchMessage}
            disabled={processing}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
            title="Dispatch command"
          >
            <Send size={14} /> Dispatch Command
          </button>

          <button
            onClick={() => { setMsg(''); toast('Draft cleared'); }}
            disabled={processing}
            className="px-3 py-3 bg-white/5 hover:bg-white/7 text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest disabled:opacity-60"
            title="Clear message draft"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <p className="text-[9px] text-slate-600 italic font-medium leading-relaxed text-center">
          Execution of override status affects 316 modules and 2,808 triggers for this tenant immediately.
        </p>
      </div>
    </div>
  );
}