'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { ShieldAlert, Activity, Zap, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';

/**
 * SOVEREIGN LIVE GUARD (New Invention Component)
 * Purpose: Real-time observer for the 'fn_core_forensic_ledger_guard' trigger.
 * This component is non-intrusive and connects to the 'sovereign_audit_anomalies' table.
 */
export default function SovereignLiveGuard() {
  const [activeAlerts, setActiveAlerts] = useState<Tables<'sovereign_audit_anomalies'>[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // 1. Listen for real-time insertions from the Backend Forensic Guard
    const channel = supabase
      .channel('ledger_forensics_stream')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sovereign_audit_anomalies' 
      }, (payload) => {
        const anomaly = payload.new as Tables<'sovereign_audit_anomalies'>;
        
        // Immediate UI feedback for CRITICAL fraud indicators
        if (anomaly.severity === 'CRITICAL') {
          toast.error(`AUTONOMOUS FRAUD GUARD: ${anomaly.anomaly_type}`, {
            description: anomaly.description,
            duration: 8000,
            icon: <ShieldAlert className="text-red-500" />
          });
        }
        
        setActiveAlerts(prev => [anomaly, ...prev].slice(0, 5)); // Keep last 5
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-6 z-[60] animate-in slide-in-from-left-5 duration-500">
      <div className="bg-slate-950/90 border border-emerald-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-xl max-w-xs">
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
           <div className="flex items-center gap-2 text-emerald-400">
             <Fingerprint size={16} />
             <span className="text-[10px] font-black uppercase tracking-widest">Sovereign Kernel</span>
           </div>
           <Zap size={12} className="text-emerald-500 animate-pulse fill-current" />
        </div>
        
        <div className="space-y-3">
          {activeAlerts.map(alert => (
            <div key={alert.id} className="flex gap-3 group">
               <div className="mt-1"><Activity size={12} className="text-red-500" /></div>
               <div>
                 <p className="text-[10px] text-white font-bold leading-tight line-clamp-2">
                   {alert.description}
                 </p>
                 <p className="text-[8px] text-slate-500 font-mono mt-1">
                   SIG: {alert.id.substring(0,8)}
                 </p>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}