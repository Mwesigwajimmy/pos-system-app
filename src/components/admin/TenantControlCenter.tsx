"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Mail, ShieldAlert, CreditCard, Send, Search, 
  RefreshCcw, Loader2, AlertTriangle, X, MessageSquare 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- Types ---
interface Tenant {
  id: string;
  name: string;
  status: string;
  business_type: string;
  subscription_plan: string;
  next_payment_date: string;
  last_payment_amount: number;
}

export default function TenantControlCenter() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  
  // Modal / Action States
  const [activeAction, setActiveAction] = useState<{ type: 'MESSAGE' | 'FREEZE'; tenant: Tenant } | null>(null);
  const [actionInput, setActionInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTenants(data || []);
    } catch (err: any) {
      toast.error(`Fetch Failure: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Search Logic (Memoized)
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return tenants;
    return tenants.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.id.toLowerCase().includes(q)
    );
  }, [tenants, query]);

  // --- Tactical Execution ---
  const handleExecute = async () => {
    if (!activeAction) return;
    setIsExecuting(true);

    try {
      if (activeAction.type === 'FREEZE') {
        // CALL REAL RPC
        const { error } = await supabase.rpc('freeze_tenant_transaction', {
          target_tenant_id: activeAction.tenant.id,
          reason: actionInput || 'No reason provided',
          admin_id: 'Sovereign_Admin_01' // In production, get from auth context
        });
        if (error) throw error;
        toast.success(`Account ${activeAction.tenant.name} is now FROZEN.`);
      } else {
        // CALL REAL BROADCAST
        const { error } = await supabase.from('system_broadcasts').insert({
          target_tenant_id: activeAction.tenant.id,
          title: 'DIRECTIVE FROM ARCHITECT',
          content: actionInput,
        });
        if (error) throw error;
        toast.success("Broadcast Dispatched via Secure Bridge.");
      }

      setActiveAction(null);
      setActionInput('');
      loadTenants();
    } catch (err: any) {
      toast.error(`Command Refused: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="relative bg-[#020617] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl min-h-[600px]">
      
      {/* Header HUD */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} className="text-red-500" />
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Tactical Command</span>
          </div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            TENANT<span className="text-blue-600">_CONTROL</span>
          </h2>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              placeholder="Filter by name or ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
          <button 
            onClick={loadTenants}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-slate-400 transition-all"
          >
            <RefreshCcw size={20} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((t) => (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "group relative flex flex-col lg:flex-row items-center justify-between p-6 rounded-3xl border transition-all duration-300",
                t.status === 'frozen' ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.02] border-white/5 hover:border-blue-500/30"
              )}
            >
              <div className="flex items-center gap-6 w-full lg:w-auto">
                <div className={cn(
                  "h-3 w-3 rounded-full",
                  t.status === 'frozen' ? "bg-red-500 shadow-[0_0_10px_#ef4444]" : "bg-emerald-500"
                )} />
                <div>
                  <h4 className="font-black text-white uppercase tracking-tight text-lg">{t.name}</h4>
                  <p className="text-[10px] font-mono text-slate-500 uppercase">
                    ID: {t.id.slice(0, 18)}... • Plan: {t.subscription_plan}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Visible on Hover */}
              <div className="flex gap-2 my-4 lg:my-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setActiveAction({ type: 'MESSAGE', tenant: t })}
                  className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                >
                  <Mail size={14} className="inline mr-2" /> Dispatch
                </button>
                <button 
                  onClick={() => setActiveAction({ type: 'FREEZE', tenant: t })}
                  disabled={t.status === 'frozen'}
                  className="px-4 py-2 bg-red-600/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white disabled:opacity-30 transition-all"
                >
                  <ShieldAlert size={14} className="inline mr-2" /> {t.status === 'frozen' ? 'Frozen' : 'Freeze'}
                </button>
              </div>

              <div className="text-right w-full lg:w-auto">
                 <p className="text-xs font-mono font-bold text-white tracking-tighter">
                   ${t.last_payment_amount.toLocaleString()}
                 </p>
                 <p className="text-[9px] font-black text-slate-600 uppercase italic">
                   Current Cycle
                 </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* TACTICAL ACTION HUD (Overlay) */}
      <AnimatePresence>
        {activeAction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg bg-[#020617] border border-white/10 rounded-[3rem] p-10 shadow-2xl relative"
            >
              <button 
                onClick={() => setActiveAction(null)}
                className="absolute top-8 right-8 text-slate-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className={cn(
                  "p-4 rounded-2xl",
                  activeAction.type === 'FREEZE' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {activeAction.type === 'FREEZE' ? <AlertTriangle size={32} /> : <MessageSquare size={32} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">
                    Confirm {activeAction.type}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">Target: {activeAction.tenant.name}</p>
                </div>
              </div>

              <textarea
                autoFocus
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder={activeAction.type === 'FREEZE' ? "Enter reason for account seizure..." : "Enter directive content..."}
                className="w-full h-40 bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-sm outline-none focus:border-blue-500/50 transition-all resize-none mb-8"
              />

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleExecute}
                  disabled={isExecuting || (activeAction.type === 'MESSAGE' && !actionInput)}
                  className={cn(
                    "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                    activeAction.type === 'FREEZE' 
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40" 
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40"
                  )}
                >
                  {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Execute Tactical Command
                </button>
                <button 
                  onClick={() => setActiveAction(null)}
                  className="w-full py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest hover:text-white transition-colors"
                >
                  Abort Mission
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}