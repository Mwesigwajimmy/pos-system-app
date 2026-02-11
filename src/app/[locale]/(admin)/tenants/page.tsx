"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, Lock, Activity, Loader2, 
  Building2, Zap, Landmark, Search, 
  MessageSquare, X, Send, AlertTriangle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'frozen' | 'pending';
  business_type: string;
  subscription_status: string;
  last_payment_amount: number;
  created_at: string;
}

interface TacticalAction {
  type: 'MESSAGE' | 'ISOLATE';
  tenant: Tenant;
}

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  
  // Tactical Modal States
  const [activeAction, setActiveAction] = useState<TacticalAction | null>(null);
  const [actionInput, setActionInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // --- 1. DATA ORCHESTRATION ---
  const loadTenants = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (e: any) {
      toast.error("DATA_LINK_FAILURE", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTenants();

    const channel = supabase
      .channel('tenant_sentinel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        loadTenants(true); // Silent refresh on background changes
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadTenants]);

  // --- 2. ARCHITECT TACTICAL EXECUTION ---
  const handleExecuteAction = async () => {
    if (!activeAction || (activeAction.type === 'MESSAGE' && !actionInput)) return;
    
    setIsExecuting(true);
    try {
      if (activeAction.type === 'ISOLATE') {
        // CALL AUTHORITATIVE RPC
        const { error } = await supabase.rpc('execute_tenant_isolation', {
          target_tenant_id: activeAction.tenant.id,
          admin_id: '00000000-0000-0000-0000-000000000000', // Replace with real auth user ID
          isolation_reason: actionInput || 'Manual Security Override'
        });
        if (error) throw error;
        toast.error(`${activeAction.tenant.name} Isolated`, { description: "Node has been severly locked from the mesh." });
      } else {
        // DISPATCH SECURE DIRECTIVE
        const { error } = await supabase.from('system_broadcasts').insert({
          target_tenant_id: activeAction.tenant.id,
          title: 'ARCHITECT DIRECTIVE',
          content: actionInput,
          category: 'SECURITY'
        });
        if (error) throw error;
        toast.success("Directive Dispatched", { description: "Message injected into secure node stream." });
      }

      setActiveAction(null);
      setActionInput('');
      loadTenants(true);
    } catch (err: any) {
      toast.error("COMMAND_REFUSED", { description: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredTenants = useMemo(() => {
    const q = query.toLowerCase();
    return tenants.filter(t => t.name?.toLowerCase().includes(q) || t.business_type?.toLowerCase().includes(q));
  }, [tenants, query]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020205] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500/50">Synchronizing Tenant Mesh</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 p-6 lg:p-12 font-sans overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-10 border-b border-white/5 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-blue-500 font-black text-[10px] uppercase tracking-[0.5em]">
            <ShieldCheck size={14} className="animate-pulse" /> Architect Clearance Level 5
          </div>
          <h1 className="text-8xl font-black tracking-tighter text-white uppercase italic leading-none">
            Node<span className="text-blue-600">_Control</span>
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-loose max-w-xl">
            Managing <span className="text-white">{tenants.length}</span> instances across the Sovereign mesh. 
            All actions logged to immutable security ledger.
          </p>
        </div>

        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl flex items-center gap-6 shadow-2xl">
           <Search className="text-slate-500" size={24} />
           <input 
             className="bg-transparent border-none outline-none text-white font-black uppercase tracking-widest text-sm w-72 placeholder:text-slate-700"
             placeholder="FILTER NODES..."
             value={query}
             onChange={(e) => setQuery(e.target.value)}
           />
        </div>
      </header>

      {/* --- KPI --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <MetricCard title="Global Nodes" value={tenants.length} icon={Building2} color="text-blue-400" />
        <MetricCard title="Healthy Puls" value={tenants.filter(t => t.status === 'active').length} icon={Zap} color="text-emerald-400" />
        <MetricCard title="Isolated" value={tenants.filter(t => t.status === 'frozen').length} icon={Lock} color="text-red-400" />
        <MetricCard title="Mesh Yield" value={`$${tenants.reduce((acc, t) => acc + (t.last_payment_amount || 0), 0).toLocaleString()}`} icon={Landmark} color="text-yellow-400" />
      </div>

      {/* --- LIST --- */}
      <div className="space-y-4">
        {filteredTenants.map((t) => (
          <div 
            key={t.id} 
            className={cn(
              "flex flex-col lg:flex-row items-center justify-between p-10 rounded-[3rem] border transition-all duration-300 group",
              t.status === 'frozen' ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.02] border-white/5 hover:border-blue-500/40"
            )}
          >
            <div className="flex items-center gap-10 w-full lg:w-auto">
              <div className={cn(
                "h-4 w-4 rounded-full",
                t.status === 'active' ? "bg-emerald-500 shadow-[0_0_20px_#10b981]" : "bg-red-500 shadow-[0_0_20px_#ef4444] animate-pulse"
              )} />
              <div>
                <h3 className="font-black text-white uppercase tracking-tighter text-4xl italic leading-none">{t.name}</h3>
                <div className="flex items-center gap-6 mt-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                    {t.business_type || 'SYSTEM_NODE'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-widest tabular-nums">
                    UUID: {t.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-10 w-full lg:w-auto mt-10 lg:mt-0">
               <div className="text-right">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Last Settled</p>
                  <p className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                    ${(t.last_payment_amount || 0).toLocaleString()}
                  </p>
               </div>
               <div className="h-12 w-px bg-white/5" />
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveAction({ type: 'MESSAGE', tenant: t })}
                    className="p-5 bg-blue-600/10 text-blue-500 border border-blue-500/10 rounded-2xl hover:bg-blue-600 hover:text-white transition-all group/btn"
                    title="Dispatch Directive"
                  >
                    <MessageSquare size={20} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setActiveAction({ type: 'ISOLATE', tenant: t })}
                    disabled={t.status === 'frozen'}
                    className="p-5 bg-red-600/10 text-red-500 border border-red-500/10 rounded-2xl hover:bg-red-600 hover:text-white disabled:opacity-20 transition-all group/btn"
                    title="Isolate Node"
                  >
                    <Lock size={20} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- TACTICAL MODAL HUD --- */}
      <AnimatePresence>
        {activeAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-[#020617] border border-white/10 rounded-[4rem] p-12 shadow-[0_0_100px_rgba(37,99,235,0.1)] relative"
            >
              <button 
                onClick={() => setActiveAction(null)}
                className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-6 mb-12">
                <div className={cn(
                  "p-5 rounded-3xl",
                  activeAction.type === 'ISOLATE' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {activeAction.type === 'ISOLATE' ? <AlertTriangle size={32} /> : <MessageSquare size={32} />}
                </div>
                <div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                    {activeAction.type} NODE
                  </h2>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                    TARGET: {activeAction.tenant.name}
                  </p>
                </div>
              </div>

              <textarea 
                className="w-full h-48 bg-white/5 border border-white/10 rounded-[2rem] p-8 text-white font-medium focus:border-blue-500/50 outline-none transition-all resize-none mb-10 placeholder:text-slate-800"
                placeholder={activeAction.type === 'ISOLATE' ? "Enter justification for complete mesh isolation..." : "Enter secure directive content..."}
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
              />

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleExecuteAction}
                  disabled={isExecuting || (activeAction.type === 'MESSAGE' && !actionInput)}
                  className={cn(
                    "w-full py-6 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 shadow-2xl",
                    activeAction.type === 'ISOLATE' ? "bg-red-600 hover:bg-red-500 text-white shadow-red-900/40" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
                  )}
                >
                  {isExecuting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  EXECUTE TACTICAL COMMAND
                </button>
                <button 
                  onClick={() => setActiveAction(null)}
                  className="w-full py-4 text-[10px] font-black uppercase text-slate-600 tracking-widest hover:text-white transition-colors"
                >
                  ABORT MISSION
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FOOTER --- */}
      <footer className="mt-40 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-[9px] font-black text-slate-700 uppercase tracking-[0.6em]">
        <div className="flex items-center gap-4">
          <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" />
          <p>© 2026 SOVEREIGN OS // NODE MANAGEMENT CONSOLE</p>
        </div>
        <div className="flex items-center gap-12 text-slate-500">
           <span className="flex items-center gap-2"><ShieldCheck size={12}/> ENCRYPTION: AUTHORITATIVE</span>
           <span className="flex items-center gap-2 text-white"><Activity size={12}/> UPLINK: VERIFIED</span>
        </div>
      </footer>
    </div>
  );
}

// --- KPI COMPONENT ---
function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900/30 border border-white/5 p-12 rounded-[3.5rem] hover:bg-slate-900/50 transition-all group relative overflow-hidden shadow-2xl border-l-4 border-l-transparent hover:border-l-blue-500/50">
      <div className="absolute -right-12 -bottom-12 text-white opacity-[0.015] group-hover:opacity-[0.05] transition-opacity duration-1000">
         <Icon size={220} />
      </div>
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-8">
          <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.5em]">{title}</p>
          <p className={cn("text-6xl font-black text-white tracking-tighter tabular-nums leading-none", color)}>
            {value}
          </p>
        </div>
        <div className={cn("p-6 rounded-[2rem] bg-black/40 border border-white/10 transition-all group-hover:scale-110 shadow-2xl", color)}>
          <Icon size={32} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}