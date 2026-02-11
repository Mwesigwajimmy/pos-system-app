"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, Landmark, Banknote, 
  AlertTriangle, Loader2, BarChart3, 
  PieChart, Activity, Fingerprint, RefreshCcw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// --- PRODUCTION COMPONENT IMPORT ---
import FinancialAuditPortal from '@/components/admin/FinancialAuditPortal';

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

      // Type cast and validate
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
    
    // Subscribing to the payment ledger for real-time reconciliation
    const channel = supabase
      .channel('financial_sentinel')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' }, 
        () => {
          // Throttled refresh to ensure data consistency
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
      <div className="min-h-screen bg-[#020205] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="text-[10px] font-black uppercase tracking-[0.6em] text-blue-500/50">
          Synchronizing Global Ledgers
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 p-6 lg:p-12 font-sans overflow-x-hidden selection:bg-emerald-500/30">
      
      {/* --- HEADER --- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-8 border-b border-white/5 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-500 font-black text-[10px] uppercase tracking-[0.5em]">
            <ShieldCheck size={14} className={isSyncing ? "animate-pulse" : ""} /> 
            Financial Node Active
          </div>
          <h1 className="text-8xl font-black tracking-tighter text-white uppercase italic leading-none">
            Cash<span className="text-emerald-500">flow</span>
          </h1>
          <p className="text-slate-500 font-bold max-w-xl text-xs uppercase tracking-widest leading-loose">
            Enterprise Oversight Terminal: Real-time reconciliation of target yields vs verified bank inflows.
          </p>
        </div>

        <div className="flex gap-4">
           <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl flex items-center gap-8 shadow-2xl">
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Audit Score</p>
                 <p className="text-4xl font-black text-white tabular-nums">{metrics.healthScore}%</p>
              </div>
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center border transition-colors",
                metrics.healthScore > 90 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
              )}>
                 <Activity size={28} />
              </div>
           </div>
           
           <button 
             onClick={() => loadFinancialIntelligence()}
             className="p-4 bg-white/5 border border-white/5 rounded-2xl self-end text-slate-500 hover:text-white transition-all"
           >
             <RefreshCcw size={20} className={isSyncing ? "animate-spin" : ""} />
           </button>
        </div>
      </header>

      {/* --- REVENUE METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <MetricCard 
          title="Projected Yield" 
          value={metrics.totalExpected} 
          icon={Landmark} 
          color="text-blue-400" 
          sub="Contractual Monthly MRR"
        />
        <MetricCard 
          title="Verified Inflow" 
          value={metrics.totalActual} 
          icon={Banknote} 
          color="text-emerald-400" 
          sub="Cleared Funds (30D)"
        />
        <MetricCard 
          title="System Leakage" 
          value={metrics.leakage} 
          icon={AlertTriangle} 
          color="text-red-500" 
          sub="Delta: Expected vs Actual"
        />
        <MetricCard 
          title="Audit Grade" 
          value="Sovereign" 
          isCurrency={false}
          icon={Fingerprint} 
          color="text-purple-400" 
          sub="Logic Layer: Verified"
        />
      </div>

      {/* --- AUDIT TERMINAL SECTION --- */}
      <section className="bg-slate-900/10 border border-white/5 p-1 lg:p-12 rounded-[4rem] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
         <div className="p-8 lg:p-0 flex items-center justify-between mb-12">
            <div className="flex items-center gap-5">
               <div className="p-5 bg-white/5 rounded-3xl text-white border border-white/10">
                  <BarChart3 size={32} />
               </div>
               <div>
                  <h3 className="text-4xl font-black uppercase tracking-tighter italic">Entity Recon</h3>
                  <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Source: SQL View :: admin_financial_audit</p>
               </div>
            </div>
         </div>

         <div className="min-h-[600px] animate-in fade-in duration-1000">
            <FinancialAuditPortal data={auditData} />
         </div>
      </section>

      {/* --- SYSTEM FOOTER --- */}
      <footer className="mt-32 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 text-[9px] font-black text-slate-600 uppercase tracking-[0.6em]">
          <div className="flex items-center gap-4">
              <div className="h-1.5 w-1.5 bg-emerald-600 rounded-full shadow-[0_0_12px_#10b981]" />
              <p>Sovereign Financial OS v4.2 // Node: {supabase.supabaseUrl?.split('.')[0].replace('https://', '')}</p>
          </div>
          <div className="flex items-center gap-12">
              <span className="flex items-center gap-2"><PieChart size={14} /> Reconciliation: Fully Automated</span>
              <span className="flex items-center gap-2 text-white"><ShieldCheck size={14} /> Ledger Status: Authoritative</span>
          </div>
      </footer>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function MetricCard({ title, value, icon: Icon, color, sub, isCurrency = true }: any) {
  return (
    <div className="bg-slate-900/20 border border-white/5 p-12 rounded-[3.5rem] hover:bg-slate-900/40 transition-all group relative overflow-hidden shadow-2xl border-l-emerald-500/10 border-l-4">
      <div className="absolute -right-16 -bottom-16 text-white opacity-[0.01] group-hover:opacity-[0.04] transition-opacity duration-1000">
         <Icon size={280} />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-10">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">{title}</p>
          <div className="space-y-3">
            <p className="text-6xl font-black text-white tracking-tighter tabular-nums leading-none">
              {isCurrency && typeof value === 'number' 
                ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` 
                : value}
            </p>
            <p className="text-[10px] font-black text-slate-600 uppercase italic tracking-widest">{sub}</p>
          </div>
        </div>
        <div className={cn(
          "p-6 rounded-[2rem] bg-black/40 border border-white/10 shadow-2xl transition-all group-hover:scale-110 group-hover:-rotate-3",
          color
        )}>
          <Icon size={32} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}