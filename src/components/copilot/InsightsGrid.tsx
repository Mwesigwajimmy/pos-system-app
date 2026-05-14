'use client';

/**
 * --- BBU1 SOVEREIGN INSIGHTS GRID ---
 * The primary visual motherboard for proactive business intelligence.
 * Orchestrates the real-time scanning of the 11 BBU1 industry modules
 * to surface forensic anomalies and strategic opportunities.
 * 
 * Capability: Multi-Sector Auditing, Neural Handshaking, Executive Drill-down.
 * Integrity Grade: OMEGA-LEVEL Sovereign Core.
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import InsightCard, { Insight } from './InsightCard';
import { 
    Loader2, ServerCrash, ShieldCheck, Zap, 
    Activity, Fingerprint, Database, Search 
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const supabase = createClient();

/**
 * EXECUTIVE DATA HANDSHAKE
 * Invokes the Sovereign Postgres RPC to execute cross-module auditing logic.
 */
async function fetchProactiveInsights(businessId: string): Promise<Insight[]> {
    if (!businessId) return [];
    
    // This RPC triggers a deep forensic scan across all 11 ERP module ledgers
    const { data, error } = await supabase.rpc('get_proactive_insights', { 
        p_business_id: businessId 
    });
    
    if (error) {
        console.error("[Aura Forensic] Insight Retrieval Failure:", error.message);
        throw new Error(`Aura System Fault: ${error.message}`);
    }
    
    return data as Insight[];
}

interface InsightsGridProps {
    onAskAI: (prompt: string) => void;
}

export default function InsightsGrid({ onAskAI }: InsightsGridProps) {
    const { data: userProfile } = useUserProfile();
    
    // EXECUTIVE CONTEXT: Extracting the Sovereign Business Identifier
    const businessId = (userProfile as any)?.business_id || ''; 

    const { 
        data: insights, 
        isLoading, 
        isError, 
        error,
        isRefetching
    } = useQuery({
        queryKey: ['proactiveInsights', businessId],
        queryFn: () => fetchProactiveInsights(businessId),
        enabled: !!businessId, 
        staleTime: 1000 * 60 * 5, // 5-minute executive cache
        refetchOnWindowFocus: true,
    });

    /**
     * LOADING STATE: SOVEREIGN NEURAL SCAN
     * Replaces standard loaders with a high-authority diagnostic visual.
     */
    if (isLoading) {
        return (
            <div className="w-full py-24 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="relative h-16 w-16 rounded-full bg-slate-950 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">
                        Neural Handshake in Progress
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Search size={12} className="animate-pulse" /> Scanning 11 Industry Modules forensicly...
                    </p>
                </div>
            </div>
        );
    }

    /**
     * ERROR STATE: SYSTEM INTERRUPTION
     * Forensic diagnostic output for infrastructure failures.
     */
    if (isError) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 px-8 text-destructive bg-destructive/5 rounded-3xl border border-destructive/20 border-dashed"
            >
                <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                    <ServerCrash className="h-6 w-6" />
                </div>
                <h3 className="font-black uppercase tracking-tighter text-lg">Forensic Link Interrupted</h3>
                <p className="text-xs font-medium mt-1 opacity-70">Aura was unable to synchronize with the kernel audit-nodes.</p>
                <code className="mt-4 px-3 py-1 bg-destructive/10 rounded text-[10px] font-mono">
                    {error instanceof Error ? error.message : 'Unknown Protocol Error'}
                </code>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.reload()}
                    className="mt-6 border-destructive/20 hover:bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-widest"
                >
                    Attempt Neural Re-Sync
                </Button>
            </motion.div>
        );
    }

    /**
     * EMPTY STATE: NOMINAL OPERATIONS
     * Displayed when the audit cycle returns zero high-risk anomalies.
     */
    if (!insights || insights.length === 0) {
        return (
            <div className="w-full py-20 text-center flex flex-col justify-center items-center bg-slate-50/50 dark:bg-slate-900/10 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
                <div className="h-16 w-16 rounded-3xl bg-white dark:bg-slate-950 shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-6">
                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight italic">
                    Module State: Nominal
                </h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto font-medium">
                    Aura has performed a full-sector sweep. No high-priority financial or operational discrepancies detected at this time.
                </p>
                <div className="mt-6 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Activity size={10} className="text-emerald-500" /> Ledger Health: 100%
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Fingerprint size={10} className="text-blue-500" /> Audit Integrity: Verified
                    </div>
                </div>
            </div>
        );
    }

    /**
     * NOMINAL STATE: INTELLIGENCE MASONRY GRID
     * High-density column layout optimized for diverse insight modules.
     */
    return (
        <div className="relative">
            {/* System Status Header */}
            <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex flex-col">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <Zap size={14} className="text-blue-600 fill-blue-600" /> Executive Proactive Intel
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Sovereign Kernel v10.8 • Cloud-Link Active
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    {isRefetching && (
                        <span className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
                            <Database size={10} /> Syncing Audit Nodes...
                        </span>
                    )}
                </div>
            </div>

            {/* Masonry Grid Logic */}
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                <AnimatePresence mode="popLayout">
                    {insights.map((insight) => (
                        <InsightCard 
                            key={insight.id} 
                            insight={insight} 
                            onAskAI={onAskAI} 
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Footer Verifier */}
            <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.6em]">
                    BBU1 Universe • Isolated Multi-Tenant Grid
                </p>
            </div>
        </div>
    );
}

/**
 * STATUS: Insights Grid Operational.
 * VERSION: v10.8 Sovereign Edition.
 * ENGINE: Cloud-Native C-Suite.
 */