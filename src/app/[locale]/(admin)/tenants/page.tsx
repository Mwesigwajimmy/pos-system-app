"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, Lock, Activity, Loader2, 
  Building2, Zap, Landmark, Search, 
  MessageSquare, X, Send, AlertTriangle,
  Fingerprint, Network, ChevronRight, LayoutGrid,
  Filter, Database
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

  // --- 1. DATA ORCHESTRATION (Logic Untouched) ---
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
        loadTenants(true); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadTenants]);

  // --- 2. ARCHITECT TACTICAL EXECUTION (Logic Untouched) ---
  const handleExecuteAction = async () => {
    if (!activeAction || (activeAction.type === 'MESSAGE' && !actionInput)) return;
    
    setIsExecuting(true);
    try {
      if (activeAction.type === 'ISOLATE') {
        const { error } = await supabase.rpc('execute_tenant_isolation', {
          target_tenant_id: activeAction.tenant.id,
          admin_id: '00000000-0000-0000-0000-000000000000', 
          isolation_reason: actionInput || 'Manual Security Override'
        });
        if (error) throw error;
        toast.error(`${activeAction.tenant.name} Isolated`, { description: "Node has been severely locked from the mesh." });
      } else {
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <Loader2 className="h-14 w-14 animate-spin text-blue-600" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600 animate-pulse">Synchronizing Tenant Mesh</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 p-8 lg:p-12 font-sans selection:bg-blue-100 animate-in fade-in duration-1000">
      
      {/* --- CLEAN PROFESSIONAL HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-12 border-b border-slate-200 pb-16">
        <div className="space-y-5">
          <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm w-fit">
            <ShieldCheck size={16} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Architect Clearance Level 5</span>
          </div>
          <h1 className="text-7xl font-black tracking-tighter text-slate-900 uppercase leading-none">
            Node<span className="text-blue-600">_Control</span>
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest leading-relaxed max-w-2xl flex items-center gap-3">
            <Network size={16} className="text-slate-300" />
            Supervising {tenants.length} instances across the BBU1 Sovereign mesh.
          </p>
        </div>

        <div className="bg-white p-4 rounded-[2.5rem] border border-slate-200 shadow-xl flex items-center gap-6 w-full lg:w-auto group transition-all hover:border-blue-500/30">
           <Search className="text-slate-300 ml-3 group-focus-within:text-blue-600 transition-colors" size={24} />
           <input 
             className="bg-transparent border-none outline-none text-slate-900 font-black uppercase tracking-widest text-sm w-full lg:w-80 placeholder:text-slate-300"
             placeholder="Search Node Index..."
             value={query}
             onChange={(e) => setQuery(e.target.value)}
           />
           <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <Filter size={18} className="text-slate-400" />
           </div>
        </div>
      </header>

      {/* --- INSTITUTIONAL KPI MATRIX --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <MetricCard title="Global Nodes" value={tenants.length} icon={Building2} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard title="Active Puls" value={tenants.filter(t => t.status === 'active').length} icon={Zap} color="text-emerald-600" bg="bg-emerald-50" />
        <MetricCard title="Isolated" value={tenants.filter(t => t.status === 'frozen').length} icon={Lock} color="text-red-600" bg="bg-red-50" />
        <MetricCard title="Mesh Yield" value={`$${tenants.reduce((acc, t) => acc + (t.last_payment_amount || 0), 0).toLocaleString()}`} icon={Landmark} color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* --- NODE LISTING (SaaS ELITE) --- */}
      <div className="space-y-5">
        {filteredTenants.map((t) => (
          <div 
            key={t.id} 
            className={cn(
              "flex flex-col lg:flex-row items-center justify-between p-10 rounded-[3rem] border transition-all duration-500 group",
              t.status === 'frozen' 
                ? "bg-red-50/30 border-red-200" 
                : "bg-white border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1"
            )}
          >
            <div className="flex items-center gap-10 w-full lg:w-auto">
              <div className="relative flex items-center justify-center">
                  <div className={cn(
                    "h-4 w-4 rounded-full",
                    t.status === 'active' ? "bg-emerald-500" : "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                  )} />
                  {t.status === 'active' && <div className="absolute h-6 w-6 bg-emerald-400 rounded-full animate-ping opacity-20" />}
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-3xl leading-none flex items-center gap-4">
                    {t.name}
                    <ChevronRight size={20} className="text-slate-200 group-hover:text-blue-500 transition-all" />
                </h3>
                <div className="flex items-center gap-6 mt-5">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-5 py-2 rounded-full border border-blue-100">
                    {t.business_type || 'STANDARD_NODE'}
                  </span>
                  <div className="flex items-center gap-2">
                      <Database size={12} className="text-slate-300" />
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest tabular-nums">
                        ID: {t.id.slice(0, 18)}
                      </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-12 w-full lg:w-auto mt-10 lg:mt-0 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
               <div className="text-right px-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Last Settled</p>
                  <div className="flex items-baseline justify-end gap-1">
                      <span className="text-xs font-black text-slate-300">$</span>
                      <p className="text-3xl font-mono font-black text-slate-900 tracking-tighter leading-none">
                        {(t.last_payment_amount || 0).toLocaleString()}
                      </p>
                  </div>
               </div>
               <div className="h-14 w-px bg-slate-200" />
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setActiveAction({ type: 'MESSAGE', tenant: t })}
                    className="p-5 bg-white text-blue-600 border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                    title="Dispatch Signal"
                  >
                    <MessageSquare size={22} />
                  </button>
                  <button 
                    onClick={() => setActiveAction({ type: 'ISOLATE', tenant: t })}
                    disabled={t.status === 'frozen'}
                    className="p-5 bg-white text-red-600 border border-slate-200 rounded-2xl hover:bg-red-600 hover:text-white disabled:opacity-20 transition-all shadow-sm active:scale-90"
                    title="Sever Connection"
                  >
                    <Lock size={22} />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- TACTICAL MODAL HUD (CLEAN WHITE) --- */}
      <AnimatePresence>
        {activeAction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="w-full max-w-2xl bg-white border-none rounded-[4rem] p-16 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setActiveAction(null)}
                className="absolute top-12 right-12 p-3 bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all active:scale-90"
              >
                <X size={24} />
              </button>

              <div className="flex items-center gap-8 mb-12">
                <div className={cn(
                  "p-6 rounded-[2rem] shadow-sm border",
                  activeAction.type === 'ISOLATE' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {activeAction.type === 'ISOLATE' ? <AlertTriangle size={40} /> : <MessageSquare size={40} />}
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                    {activeAction.type} NODE
                  </h2>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Entity:</span>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
                        {activeAction.tenant.name}
                    </span>
                  </div>
                </div>
              </div>

              <textarea 
                autoFocus
                className="w-full h-52 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-10 text-slate-900 font-bold placeholder:text-slate-300 outline-none focus:border-blue-500/50 focus:bg-white transition-all resize-none mb-12 shadow-inner leading-relaxed"
                placeholder={activeAction.type === 'ISOLATE' ? "Construct the justification for complete sovereign mesh isolation..." : "Compose secure directive payload for node transmission..."}
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
              />

              <div className="flex flex-col gap-5">
                <button
                  onClick={handleExecuteAction}
                  disabled={isExecuting || (activeAction.type === 'MESSAGE' && !actionInput)}
                  className={cn(
                    "w-full h-20 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-95",
                    activeAction.type === 'ISOLATE' 
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-red-100" 
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"
                  )}
                >
                  {isExecuting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  EXECUTE TACTICAL DIRECTIVE
                </button>
                <button 
                  onClick={() => setActiveAction(null)}
                  className="w-full h-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] hover:text-slate-900 transition-colors"
                >
                  ABORT MISSION SIGNAL
                </button>
              </div>

              {/* SYSTEM WATERMARK */}
              <div className="absolute -bottom-10 -left-10 opacity-5 pointer-events-none">
                 <ShieldCheck size={280} className="text-slate-900" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- INSTITUTIONAL FOOTER --- */}
      <footer className="mt-40 pt-16 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
        <div className="flex items-center gap-5">
          <div className="h-2 w-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          <p>Litonu Business Base Universe // BBU1_OS Management Console</p>
        </div>
        <div className="flex items-center gap-12">
           <span className="flex items-center gap-3 text-slate-900 border-b-2 border-blue-600 pb-1">
             <ShieldCheck size={14} className="text-blue-600" /> ENCRYPTION: AUTHORITATIVE
           </span>
           <span className="flex items-center gap-3 text-slate-400">
             <Fingerprint size={14} /> IDENTITY: VERIFIED
           </span>
           <span className="flex items-center gap-3 text-emerald-600">
             <Activity size={14} /> MESH_UPLINK: ONLINE
           </span>
        </div>
      </footer>
    </div>
  );
}

// --- KPI COMPONENT (CLEAN WHITE) ---
function MetricCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden flex flex-col justify-between h-72 border-b-4 border-b-transparent hover:border-b-blue-600">
      <div className="absolute -right-8 -bottom-8 text-slate-100 opacity-20 group-hover:opacity-40 transition-opacity duration-1000 group-hover:-rotate-12">
         <Icon size={180} />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-10 w-full">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">{title}</p>
          <p className={cn("text-6xl font-black tracking-tighter tabular-nums leading-none", color)}>
            {value}
          </p>
        </div>
        <div className={cn("p-6 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all group-hover:scale-110", bg, color)}>
          <Icon size={28} strokeWidth={3} />
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Activity size={12} className="text-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Real-time Node Signal</span>
      </div>
    </div>
  );
}