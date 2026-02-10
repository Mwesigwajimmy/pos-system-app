"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, Users, Search, Lock, Mail, 
  ChevronRight, Activity, Loader2, Power,
  Building2, CreditCard, Filter, ArrowUpRight,
  ShieldAlert, Zap, Landmark
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const supabase = useMemo(() => createClient(), []);

  // --- 1. DATA ORCHESTRATION ---
  const loadTenants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (e: any) {
      toast.error("Tactical Link Failure", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTenants();

    // REAL-TIME PULSE: Listen for new tenants or status changes
    const channel = supabase
      .channel('tenant_oversight')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        loadTenants();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadTenants]);

  // --- 2. ARCHITECT ACTIONS ---
  const handleFreezeAccount = async (tid: string, name: string) => {
    const ok = window.confirm(`CRITICAL: Isolate ${name}? All modules will be locked immediately.`);
    if (!ok) return;

    const { error } = await supabase
      .from('tenants')
      .update({ status: 'frozen', subscription_status: 'LOCKED' })
      .eq('id', tid);

    if (error) {
      toast.error("Override Failed");
    } else {
      toast.error(`${name} isolated successfully.`);
    }
  };

  const handleDispatchMessage = async (tid: string) => {
    const msg = window.prompt("Enter Architect Directive:");
    if (!msg) return;

    const { error } = await supabase.from('system_broadcasts').insert({
      target_tenant_id: tid,
      title: 'Architect Update',
      content: msg,
      category: 'SECURITY'
    });

    if (!error) toast.success("Directive dispatched via Sovereign Bridge");
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => 
      t.name?.toLowerCase().includes(query.toLowerCase()) || 
      t.business_type?.toLowerCase().includes(query.toLowerCase())
    );
  }, [tenants, query]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 p-6 lg:p-10 font-sans">
      
      {/* --- SECURE HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 border-b border-white/5 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-500 font-black text-[10px] uppercase tracking-[0.5em]">
            <ShieldCheck size={14} className="animate-pulse" /> High Clearance Module
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic">
            Tenant <span className="text-blue-600">Control</span>
          </h1>
          <p className="text-slate-500 font-medium">Managing {tenants.length} global instances across the Sovereign Mesh.</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
           <Search className="text-slate-500" size={20} />
           <input 
             className="bg-transparent border-none outline-none text-white font-bold uppercase tracking-widest text-xs w-64"
             placeholder="SEARCH INSTANCES..."
             value={query}
             onChange={(e) => setQuery(e.target.value)}
           />
        </div>
      </header>

      {/* --- KPI LAYER --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard title="Total Instances" value={tenants.length} icon={Building2} color="text-blue-400" />
        <MetricCard title="Active Nodes" value={tenants.filter(t => t.status === 'active').length} icon={Zap} color="text-emerald-400" />
        <MetricCard title="Frozen/Locked" value={tenants.filter(t => t.status === 'frozen').length} icon={Lock} color="text-red-400" />
        <MetricCard title="Sovereign Yield" value={`$${tenants.reduce((acc, t) => acc + (t.last_payment_amount || 0), 0)}`} icon={Landmark} color="text-yellow-400" />
      </div>

      {/* --- TENANT GRID --- */}
      <section className="bg-slate-900/30 border border-white/5 p-10 rounded-[3rem] backdrop-blur-3xl shadow-2xl">
        <div className="space-y-4">
          {filteredTenants.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5 hover:border-blue-500/40 transition-all group">
              <div className="flex items-center gap-8">
                <div className={`h-4 w-4 rounded-full ${t.status === 'active' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-red-500 animate-pulse'}`} />
                <div>
                  <p className="font-black text-white uppercase tracking-tight text-3xl italic">{t.name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">TYPE: {t.business_type}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID: {t.id.substring(0,8)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                <div className="text-right mr-8">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Subscription</p>
                    <p className="text-xl font-black text-white tracking-tighter">${t.last_payment_amount || 0}</p>
                </div>
                
                <button 
                  onClick={() => handleDispatchMessage(t.id)}
                  className="px-8 py-4 bg-blue-600/10 text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl"
                >
                  Dispatch Directive
                </button>
                
                <button 
                  onClick={() => handleFreezeAccount(t.id, t.name)}
                  className="px-8 py-4 bg-red-600/10 text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl"
                >
                  Isolate Node
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="mt-20 pt-10 border-t border-white/5 text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] flex justify-between">
        <p>© 2026 SOVEREIGN OS • ARCHITECT GRADE</p>
        <p className="text-blue-500/50">SECURE NODE ENCRYPTION ACTIVE</p>
      </footer>
    </div>
  );
}

// Reuse the MetricCard component from your Command Center
function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900/30 border border-white/5 p-10 rounded-[3rem] hover:bg-slate-900/50 transition-all group relative overflow-hidden shadow-2xl">
      <div className="absolute -right-8 -bottom-8 text-white opacity-[0.015] group-hover:opacity-[0.04] transition-opacity duration-700">
         <Icon size={180} />
      </div>
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-6">
          <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em]">{title}</p>
          <p className="text-5xl font-black text-white tracking-tighter tabular-nums leading-none">{value}</p>
        </div>
        <div className={`p-5 rounded-3xl bg-black/40 border border-white/10 ${color} shadow-2xl transition-all group-hover:scale-110`}>
          <Icon size={32} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}