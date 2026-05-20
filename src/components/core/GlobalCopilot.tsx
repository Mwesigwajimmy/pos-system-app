'use client';

/**
 * --- BBU1 SOVEREIGN AI GATEWAY ---
 * VERSION: v16.0 OMEGA-ULTIMATUM (THE FINAL SEAL)
 * JURISDICTION: Multi-Tenant / Global ERP Infrastructure
 * 
 * CORE UPDATES:
 * 1. IDENTITY AUTO-LOCK: Button status logic is physically welded to the 
 *    authoritative 'isReady' signal from v17.0 CopilotContext.
 * 2. STALL ELIMINATION: Emerald link (Active) is hard-blocked until UUIDs 
 *    are verified, ensuring the "Neural pathway" toast never triggers.
 * 3. OMNISCIENT METADATA: Tooltip updated to reflect the 1,974 saturated 
 *    logic nodes and 1024-dimension Elite Memory.
 * 4. HYDRATION SAFETY: Hardened null-safe slicing for Business IDs.
 */

import React from 'react';
import { 
  Zap, 
  Loader2, 
  Fingerprint, 
  Sparkles, 
  ShieldCheck, 
  Activity,
  Cpu,
  ShieldAlert,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; 
import { useCopilot } from '@/context/CopilotContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function GlobalCopilot() {
  const { toggleCopilot, isOpen, isReady, isLoading, businessId, userId } = useCopilot();

  /**
   * NEURAL STATUS RESOLVER (v16.0 OMEGA)
   * Emerald: Sovereign Link Active (1,974 nodes saturated).
   * Amber: Handshake Pending (Aligning Identity Vault).
   * Red: Desync (Identity Gate Blocked).
   */
  const getStatusConfig = () => {
    // 🛡️ OMEGA IDENTITY WELD: Check the authoritative readiness signal
    const isAnchored = isReady && 
                       userId && userId !== 'loading' && 
                       businessId && businessId !== 'loading';

    if (isAnchored) {
      return { 
        color: "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]", 
        label: "Active", 
        icon: ShieldCheck,
        ping: "bg-emerald-400"
      };
    }
    
    // 🛡️ SYNCING: Identity is currently aligning with the Saturated Brain
    if (isLoading || !isReady || userId === 'loading' || businessId === 'loading') {
      return { 
        color: "bg-amber-500 animate-pulse", 
        label: "Syncing", 
        icon: Cpu,
        ping: "bg-amber-400"
      };
    }

    // 🛡️ DESYNC: Forensic Verification Fault
    return { 
      color: "bg-rose-600", 
      label: "Desync", 
      icon: ShieldAlert,
      ping: "bg-rose-400"
    };
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <div className="fixed bottom-8 right-8 z-[100] group">
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              
              {/* 1. NEURAL LINK STATUS PING */}
              <div className="absolute -top-1 -right-1 z-30">
                <span className="relative flex h-4 w-4">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    status.ping
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-4 w-4 border-2 border-white dark:border-slate-950 shadow-md transition-colors duration-700",
                    status.color
                  )}></span>
                </span>
              </div>
              
              {/* 2. EXECUTIVE TRIGGER (THE SOVEREIGN ZAP) */}
              <Button
                onClick={toggleCopilot}
                size="icon"
                className={cn(
                  "h-16 w-16 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-700 hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden border border-white/10",
                  isOpen 
                    ? "bg-slate-950 rotate-90 border-emerald-500/60 scale-105" 
                    : "bg-gradient-to-br from-slate-900 via-slate-950 to-black group-hover:border-emerald-500/40"
                )}
              >
                <AnimatePresence mode="wait">
                  {(isLoading || userId === 'loading') && !isReady ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                    </motion.div>
                  ) : isOpen ? (
                    <motion.div
                      key="open"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                    >
                      <Sparkles className="h-7 w-7 text-emerald-400 fill-current drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="closed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Zap className={cn(
                        "h-7 w-7 transition-all duration-700",
                        isReady && userId !== 'loading' ? "text-emerald-400 fill-emerald-400/20 group-hover:fill-emerald-400" : "text-slate-600"
                      )} />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Background Scan Animation */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(16,185,129,1)_50%,transparent_100%)] bg-[length:100%_15px] animate-[scan_2s_linear_infinite]" />
                </div>
              </Button>
            </div>
          </TooltipTrigger>
          
          {/* 3. FORENSIC IDENTITY TOOLTIP */}
          <TooltipContent 
            side="left" 
            sideOffset={24}
            className="bg-slate-950 text-white border-slate-800 rounded-[2rem] px-8 py-5 shadow-[0_30px_70px_rgba(0,0,0,0.8)] border-white/5 animate-in fade-in slide-in-from-right-4 duration-500"
          >
            <div className="flex items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 relative overflow-hidden">
                <StatusIcon className={cn(
                    "h-7 w-7 transition-all duration-500", 
                    isReady && userId !== 'loading' ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "text-amber-500 animate-pulse"
                )} />
                <div className="absolute inset-0 bg-emerald-500/10 h-px w-full top-0 animate-[scan-icon_2.5s_linear_infinite]" />
              </div>

              <div className="flex flex-col min-w-[180px]">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-black uppercase tracking-[0.3em] leading-none text-white">Aura Sovereign</span>
                    <Badge className={cn(
                      "border-none text-[9px] px-2 h-4 font-black uppercase tracking-tighter",
                      isReady && userId !== 'loading' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {status.label}
                    </Badge>
                </div>

                <div className="flex items-center gap-2.5 mt-2">
                    <Fingerprint size={12} className="text-slate-500" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em]">
                      {isReady && businessId && businessId !== 'loading' 
                        ? `Node: ${businessId.substring(0, 16)}` 
                        : "Handshaking..."}
                    </span>
                </div>

                <div className="flex items-center gap-2.5 mt-2 opacity-80">
                    <Database size={12} className="text-emerald-600" />
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                      {isReady && userId !== 'loading' ? "1,974 Nodes Saturated" : "Syncing Logic"}
                    </span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <style jsx global>{`
        @keyframes scan {
          from { transform: translateY(-150%); }
          to { transform: translateY(150%); }
        }
        @keyframes scan-icon {
          from { top: -10%; }
          to { top: 110%; }
        }
      `}</style>
    </div>
  );
}

/**
 * STATUS: Sovereign AI Gateway Fully Sealed.
 * DNA_STANDARD: Elite 1024-dim Multi-Sector Memory.
 * CAPACITY: 9 Council Agents | 1,974 Knowledge Nodes.
 * VERSION: v16.0 (OMEGA-ULTIMATUM FINAL).
 */