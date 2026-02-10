"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, Landmark, Banknote, TrendingUp, 
  AlertTriangle, CheckCircle2, DollarSign, 
  Search, Loader2, ArrowUpRight, BarChart3, 
  PieChart, Activity, Fingerprint
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// --- PRODUCTION COMPONENT IMPORT ---
import FinancialAuditPortal from '@/components/admin/FinancialAuditPortal';

export default function GlobalCashflowPage() {
  const [auditData, setAuditData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // --- 1. DATA ENGINE: REAL FINANCIAL AGGREGATION ---
  const loadFinancialIntelligence = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('view_admin_financial_audit')
        .select('*');

      if (error) throw error;
      setAuditData(data || []);
    } catch (e: any) {
      toast.error("FINANCIAL_LINK_FAILURE", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadFinancialIntelligence();
    
    // Real-time listener for payment updates
    const channel = supabase
      .channel('financial_sentinel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        loadFinancialIntelligence();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadFinancialIntelligence]);

  // --- 2. ARCHITECT METRICS (CALCULATED FROM REAL DATA) ---
  const financialMetrics = useMemo(() => {
    const totalExpected = auditData.reduce((acc, curr) => acc + (Number(curr.expected_monthly_usd) || 0), 0);
    const totalActual = auditData.reduce((acc, curr) => acc + (Number(curr.actually_paid_30d) || 0), 0);
    const leakage = totalExpected - totalActual;
    const healthScore = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;

    return {
      totalExpected,
      totalActual,
      leakage,
      healthScore
    };
  }, [auditData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500">Decrypting Financial Ledgers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 p-6 lg:p-10 font-sans selection:bg-emerald-500/30">
      
      {/* --- SOVEREIGN HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-6 border-b border-white/5 pb-12">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-[0.5em]">
            <ShieldCheck size={14} className="animate-pulse" /> Financial Audit Bridge
          </div>
          <h1 className="text-7xl font-black tracking-tighter text-white uppercase italic">
            Global <span className="text-emerald-500">Cashflow</span>
          </h1>
          <p className="text-slate-500 font-bold max-w-2xl">
            Sovereign Revenue Oversight: Reconciling expected monthly targets against real-time 30-day collections.
          </p>
        </div>

        <div className="flex gap-4">
           <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 backdrop-blur-3xl flex items-center gap-6">
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Health</p>
                 <p className="text-3xl font-black text-white">{financialMetrics.healthScore}%</p>
              </div>
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20`}>
                 <Activity size={24} />
              </div>
           </div>
        </div>
      </header>

      {/* --- REVENUE METRIC GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <MetricCard 
          title="Projected Yield" 
          value={`$${financialMetrics.totalExpected.toLocaleString()}`} 
          icon={Landmark} 
          color="text-blue-400" 
          sub="Expected Monthly Revenue"
        />
        <MetricCard 
          title="Actual Collections" 
          value={`$${financialMetrics.totalActual.toLocaleString()}`} 
          icon={Banknote} 
          color="text-emerald-400" 
          sub="Verified 30-day Inflow"
        />
        <MetricCard 
          title="Revenue Leakage" 
          value={`$${financialMetrics.leakage.toLocaleString()}`} 
          icon={AlertTriangle} 
          color="text-red-500" 
          sub="Uncollected / Delinquent"
        />
        <MetricCard 
          title="System Integrity" 
          value="Level 5" 
          icon={Fingerprint} 
          color="text-purple-400" 
          sub="Audit Grade: Sovereign"
        />
      </div>

      {/* --- AUDIT TERMINAL SECTION --- */}
      <section className="bg-slate-900/20 border border-white/5 p-12 rounded-[4rem] backdrop-blur-3xl shadow-2xl">
         <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
               <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
                  <BarChart3 size={32} />
               </div>
               <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic">Entity Reconciliation</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Source: view_admin_financial_audit</p>
               </div>
            </div>
            
            <div className="flex gap-3">
               <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {auditData.length} Monitored Entities
               </div>
            </div>
         </div>

         {/* Your Production Audit Portal Component */}
         <div className="min-h-[600px]">
            <FinancialAuditPortal />
         </div>
      </section>

      {/* --- FOOTER INFRASTRUCTURE --- */}
      <footer className="mt-32 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-[10px] font-black text-slate-600 uppercase tracking-[0.6em]">
          <div className="flex items-center gap-4">
              <div className="h-2 w-2 bg-emerald-600 rounded-full shadow-[0_0_10px_#10b981]" />
              <p>SOVEREIGN OS v4.0 • FINANCIAL AUDIT NODE</p>
          </div>
          <div className="flex items-center gap-12">
              <span className="flex items-center gap-2"><PieChart size={14} /> RECONCILIATION: AUTO</span>
              <span className="flex items-center gap-2 text-white"><ShieldCheck size={14} /> LEDGER: VERIFIED</span>
          </div>
      </footer>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-slate-900/20 border border-white/5 p-12 rounded-[4rem] hover:bg-slate-900/40 transition-all group relative overflow-hidden shadow-2xl">
      {/* Dynamic Background Watermark */}
      <div className="absolute -right-12 -bottom-12 text-white opacity-[0.01] group-hover:opacity-[0.03] transition-opacity duration-1000">
         <Icon size={240} />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-8">
          <p className="text-[13px] font-black text-slate-600 uppercase tracking-[0.5em]">{title}</p>
          <div className="space-y-2">
            <p className="text-6xl font-black text-white tracking-tighter tabular-nums leading-none">
              {value}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase italic tracking-tighter">{sub}</p>
          </div>
        </div>
        <div className={`p-6 rounded-[2rem] bg-black/40 border border-white/10 ${color} shadow-2xl transition-all group-hover:scale-110 group-hover:-rotate-6`}>
          <Icon size={36} strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}