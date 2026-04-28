"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Mail, ShieldAlert, CreditCard, Send, Search, 
  RefreshCcw, Loader2, AlertTriangle, X, MessageSquare,
  ShieldCheck, LayoutGrid, Fingerprint, Activity, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Search Logic (Memoized - Untouched)
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return tenants;
    return tenants.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.id.toLowerCase().includes(q)
    );
  }, [tenants, query]);

  // --- Tactical Execution (Logic Untouched) ---
  const handleExecute = async () => {
    if (!activeAction) return;
    setIsExecuting(true);

    try {
      if (activeAction.type === 'FREEZE') {
        const { error } = await supabase.rpc('freeze_tenant_transaction', {
          target_tenant_id: activeAction.tenant.id,
          reason: actionInput || 'No reason provided',
          admin_id: 'Sovereign_Admin_01' 
        });
        if (error) throw error;
        toast.success(`Account ${activeAction.tenant.name} is now FROZEN.`);
      } else {
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
    <div className="relative bg-[#f8fafc] rounded-[3rem] border border-slate-200 p-10 shadow-sm min-h-[700px] animate-in fade-in duration-1000">
      
      {/* 1. HEADER HUD */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-50 p-1.5 rounded-lg border border-red-100">
                <ShieldAlert size={14} className="text-red-500" />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">Tactical Command</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            TENANT<span className="text-blue-600">_CONTROL</span>
          </h2>
          <div className="flex items-center gap-2 mt-4">
             <Fingerprint size={12} className="text-slate-300" />
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Authorized Sovereign Agent Only</span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              placeholder="Filter by name or global identifier..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <button 
            onClick={loadTenants}
            className="p-3.5 bg-slate-900 hover:bg-blue-600 rounded-2xl text-white transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            <RefreshCcw size={20} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* 2. MAIN LIST (SaaS ELITE DESIGN) */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((t) => (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "group relative flex flex-col lg:flex-row items-center justify-between p-8 rounded-[2.5rem] border transition-all duration-500",
                t.status === 'frozen' 
                    ? "bg-red-50/30 border-red-200" 
                    : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
              )}
            >
              <div className="flex items-center gap-8 w-full lg:w-auto">
                <div className="relative flex items-center justify-center">
                    <div className={cn(
                    "h-3 w-3 rounded-full",
                    t.status === 'frozen' ? "bg-red-500" : "bg-emerald-500"
                    )} />
                    {t.status !== 'frozen' && <div className="absolute h-5 w-5 bg-emerald-400 rounded-full animate-ping opacity-20" />}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tight text-xl flex items-center gap-3">
                    {t.name}
                    <ChevronRight size={16} className="text-slate-200 group-hover:text-blue-500 transition-all" />
                  </h4>
                  <div className="flex items-center gap-4 mt-1.5">
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                        ID: {t.id.slice(0, 12)}
                    </p>
                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                        {t.subscription_plan} PLAN
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Visible on Hover */}
              <div className="flex gap-3 my-6 lg:my-0 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                <button 
                  onClick={() => setActiveAction({ type: 'MESSAGE', tenant: t })}
                  className="h-12 px-6 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  <Mail size={14} className="inline mr-2" /> Dispatch Signal
                </button>
                <button 
                  onClick={() => setActiveAction({ type: 'FREEZE', tenant: t })}
                  disabled={t.status === 'frozen'}
                  className="h-12 px-6 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white disabled:opacity-30 transition-all shadow-sm"
                >
                  <ShieldAlert size={14} className="inline mr-2" /> {t.status === 'frozen' ? 'Access Seized' : 'Seize Control'}
                </button>
              </div>

              <div className="text-right w-full lg:w-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[140px]">
                 <div className="flex items-baseline justify-end gap-1">
                    <span className="text-[10px] font-black text-slate-400">$</span>
                    <p className="text-lg font-mono font-black text-slate-900 tracking-tighter">
                    {t.last_payment_amount.toLocaleString()}
                    </p>
                 </div>
                 <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <Activity size={10} className="text-emerald-500" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Current Cycle
                    </p>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 3. TACTICAL ACTION HUD (CLEAN WHITE OVERLAY) */}
      <AnimatePresence>
        {activeAction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xl bg-white border-none rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setActiveAction(null)}
                className="absolute top-10 right-10 p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all active:scale-90"
              >
                <X size={22} />
              </button>

              <div className="flex items-center gap-6 mb-10">
                <div className={cn(
                  "p-5 rounded-3xl shadow-sm border",
                  activeAction.type === 'FREEZE' 
                    ? "bg-red-50 text-red-600 border-red-100" 
                    : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {activeAction.type === 'FREEZE' ? <AlertTriangle size={36} /> : <MessageSquare size={36} />}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                    Confirm {activeAction.type}
                  </h3>
                  <div className="flex items-center gap-2 mt-2.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Entity:</span>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-md">
                        {activeAction.tenant.name}
                    </span>
                  </div>
                </div>
              </div>

              <textarea
                autoFocus
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                placeholder={activeAction.type === 'FREEZE' ? "Analyze and enter justification for account seizure..." : "Construct the directive signal for the tenant ecosystem..."}
                className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-slate-900 text-sm font-bold placeholder:text-slate-300 outline-none focus:border-blue-500/50 focus:bg-white transition-all resize-none mb-10 shadow-inner"
              />

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleExecute}
                  disabled={isExecuting || (activeAction.type === 'MESSAGE' && !actionInput)}
                  className={cn(
                    "w-full h-16 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95",
                    activeAction.type === 'FREEZE' 
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-red-100" 
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"
                  )}
                >
                  {isExecuting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Execute Tactical Directive
                </button>
                <button 
                  onClick={() => setActiveAction(null)}
                  className="w-full h-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] hover:text-slate-900 transition-colors"
                >
                  Abort Operation
                </button>
              </div>
              
              {/* SYSTEM DECORATION */}
              <div className="absolute -bottom-6 -left-6 opacity-5 pointer-events-none">
                <ShieldCheck size={180} className="text-slate-900" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}