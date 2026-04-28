"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, Landmark, Banknote, 
  AlertTriangle, Loader2, BarChart3, 
  PieChart, Activity, Fingerprint, RefreshCcw,
  TrendingUp, TrendingDown, Wallet, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Internal Libs
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// --- PRODUCTION COMPONENT IMPORT ---
import FinancialAuditPortal from '@/components/admin/FinancialAuditPortal';

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

// --- STRICT INTERFACES ---
interface FinancialRecord {
  tenant_id: string;
  organization: string;
  expected_monthly_usd: number;
  actually_paid_30d: number;
  last_payment_date: string | null;
  status: 'healthy' | 'leakage' | 'critical';
}

interface FinancialMetrics {
  totalExpected: number;
  totalActual: number;
  leakage: number;
  healthScore: number;
}

export default function GlobalCashflowPage() {
  const [auditData, setAuditData] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // --- 1. DATA ENGINE: AUTHORITATIVE FINANCIAL FETCH ---
  const loadFinancialIntelligence = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setIsSyncing(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('view_admin_financial_audit')
        .select('*');

      if (dbError) throw dbError;

      const validatedData: FinancialRecord[] = (data || []).map(row => ({
        tenant_id: row.tenant_id,
        organization: row.organization,
        expected_monthly_usd: Number(row.expected_monthly_usd) || 0,
        actually_paid_30d: Number(row.actually_paid_30d) || 0,
        last_payment_date: row.last_payment_date,
        status: row.actually_paid_30d >= row.expected_monthly_usd ? 'healthy' : 
                row.actually_paid_30d > 0 ? 'leakage' : 'critical'
      }));

      setAuditData(validatedData);
    } catch (e: any) {
      setError(e.message);
      toast.error("LEDGER_SYNC_FAILURE", { 
        description: "The financial bridge encountered an uplink error." 
      });
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [supabase]);

  // --- 2. REAL-TIME SENTINEL ---
  useEffect(() => {
    loadFinancialIntelligence();
    
    const channel = supabase
      .channel('financial_sentinel')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' }, 
        () => {
          loadFinancialIntelligence(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadFinancialIntelligence]);

  // --- 3. METRIC CALCULATIONS ---
  const metrics = useMemo<FinancialMetrics>(() => {
    const totalExpected = auditData.reduce((acc, curr) => acc + curr.expected_monthly_usd, 0);
    const totalActual = auditData.reduce((acc, curr) => acc + curr.actually_paid_30d, 0);
    const leakage = totalExpected - totalActual;
    const healthScore = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;

    return { totalExpected, totalActual, leakage, healthScore };
  }, [auditData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-6">
        <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
        <div className="text-center">
            <span className="text-[11px] font-black uppercase tracking-[0.6em] text-blue-600 animate-pulse">
            Synchronizing Global Ledgers
            </span>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Authoritative Uplink Active</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 p-8 lg:p-12 font-sans overflow-x-hidden selection:bg-blue-100 animate-in fade-in duration-1000">
      
      {/* --- CLEAN PROFESSIONAL HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-10 border-b border-slate-200 pb-16">
        <div className="space-y-5">
          <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm w-fit">
            <ShieldCheck size={16} className={cn("text-emerald-500", isSyncing ? "animate-pulse" : "")} /> 
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
                Financial Node Active
            </span>
          </div>
          <h1 className="text-8xl font-black tracking-tighter text-slate-900 uppercase leading-none">
            Cash<span className="text-emerald-600">flow</span>
          </h1>
          <p className="text-slate-400 font-bold max-w-xl text-sm uppercase tracking-widest leading-relaxed">
            Enterprise Oversight Terminal: Real-time reconciliation of target yields vs verified bank inflows.
          </p>
        </div>

        <div className="flex gap-4">
           <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex items-center gap-10 transition-all hover:border-blue-200">
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Audit Score</p>
                 <p className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">{metrics.healthScore}%</p>
              </div>
              <div className={cn(
                "h-16 w-16 rounded-[1.5rem] flex items-center justify-center border transition-all duration-500 shadow-sm",
                metrics.healthScore > 90 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100" 
                    : "bg-red-50 text-red-600 border-red-100 shadow-red-100"
              )}>
                 <Activity size={32} />
              </div>
           </div>
           
           <button 
             onClick={() => loadFinancialIntelligence()}
             className="p-6 bg-white border border-slate-200 rounded-[2rem] self-end text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 shadow-sm"
           >
             <RefreshCcw size={24} className={isSyncing ? "animate-spin" : ""} />
           </button>
        </div>
      </header>

      {/* --- INSTITUTIONAL REVENUE METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        <MetricCard 
          title="Projected Yield" 
          value={metrics.totalExpected} 
          icon={Landmark} 
          color="text-blue-600" 
          bg="bg-blue-50"
          sub="Contractual Monthly MRR"
        />
        <MetricCard 
          title="Verified Inflow" 
          value={metrics.totalActual} 
          icon={Banknote} 
          color="text-emerald-600" 
          bg="bg-emerald-50"
          sub="Cleared Funds (30D)"
        />
        <MetricCard 
          title="System Leakage" 
          value={metrics.leakage} 
          icon={AlertTriangle} 
          color="text-red-600" 
          bg="bg-red-50"
          sub="Delta: Expected vs Actual"
        />
        <MetricCard 
          title="Audit Grade" 
          value="Sovereign" 
          isCurrency={false}
          icon={Fingerprint} 
          color="text-purple-600" 
          bg="bg-purple-50"
          sub="Logic Layer: Verified"
        />
      </div>

      {/* --- ENTITY RECON SECTION (SaaS ELITE) --- */}
      <section className="bg-white border border-slate-200 p-2 lg:p-12 rounded-[4.5rem] shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-blue-500/5">
         <div className="p-8 lg:p-0 flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 border-b border-slate-50 pb-12">
            <div className="flex items-center gap-6">
               <div className="p-5 bg-slate-50 rounded-[2rem] text-slate-900 border border-slate-200 shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-500">
                  <BarChart3 size={32} />
               </div>
               <div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Entity Recon</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-blue-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-md">Source: SQL View</span>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">admin_financial_audit</p>
                  </div>
               </div>
            </div>
            <button className="h-12 px-8 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                Generate Full Ledger
            </button>
         </div>

         <div className="min-h-[700px] animate-in fade-in duration-1000">
            <FinancialAuditPortal data={auditData} />
         </div>

         {/* SYSTEM DECORATION */}
         <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-1000">
             <Landmark size={300} className="text-slate-900" />
         </div>
      </section>

      {/* --- SYSTEM FOOTER --- */}
      <footer className="mt-32 pt-16 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
          <div className="flex items-center gap-5">
              <div className="h-2 w-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p>Litonu Business Base Universe // BBU1_OS Financial Terminal v10.2</p>
          </div>
          <div className="flex items-center gap-12">
              <span className="flex items-center gap-3 text-slate-900 border-b-2 border-blue-600 pb-1">
                <PieChart size={16} className="text-blue-600" /> Reconciliation: Autonomous
              </span>
              <span className="flex items-center gap-3">
                <ShieldCheck size={16} className="text-slate-300" /> Ledger Status: Authoritative
              </span>
          </div>
      </footer>
    </div>
  );
}

// --- KPI COMPONENT (CLEAN WHITE) ---
function MetricCard({ title, value, icon: Icon, color, bg, sub, isCurrency = true }: any) {
  return (
    <div className="bg-white border border-slate-200 p-12 rounded-[3.5rem] shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden flex flex-col justify-between h-80 border-b-4 border-b-transparent hover:border-b-blue-600">
      <div className="absolute -right-12 -bottom-12 text-slate-50 opacity-[0.5] group-hover:opacity-100 transition-opacity duration-1000 group-hover:-rotate-12">
         <Icon size={220} />
      </div>
      
      <div className="flex justify-between items-start relative z-10 w-full mb-8">
        <div className="space-y-10 w-full">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">{title}</p>
          <div className="space-y-2">
            <div className="flex items-baseline gap-1.5">
                {isCurrency && typeof value === 'number' && <span className="text-xl font-black text-slate-300">$</span>}
                <p className={cn("text-6xl font-black tracking-tighter tabular-nums leading-none text-slate-900")}>
                    {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value}
                </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
                <ArrowUpRight size={12} className={color} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{sub}</p>
            </div>
          </div>
        </div>
        <div className={cn("p-6 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all group-hover:scale-110", bg, color)}>
          <Icon size={30} strokeWidth={3} />
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <Activity size={12} className="text-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Verified Stream</span>
      </div>
    </div>
  );
}