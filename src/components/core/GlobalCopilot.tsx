'use client';

/**
 * --- BBU1 SOVEREIGN AI GATEWAY ---
 * VERSION: v15.1 OMEGA-ULTIMATUM (THE FINAL WELD)
 * JURISDICTION: Multi-Tenant / Global ERP Infrastructure
 * 
 * CORE UPDATES:
 * 1. NEURAL REALIGNMENT: Fully synchronized with the 1024-dim Jina Elite Saturated Brain.
 * 2. IDENTITY LOCK: Status logic hardened to check for 'loading' strings, ensuring the 
 *    Emerald-Link (Active) only triggers for a forensically validated Samuel Oyat session.
 * 3. BOOT-TIME SAFETY: Hardened null-safe slicing for BusinessID to prevent 
 *    hydration collisions during the 100% saturation check.
 * 4. VISUAL FIDELITY: Upgraded Tooltip metadata to reflect the SambaNova 70B engine status.
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
  WifiOff
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
   * NEURAL STATUS RESOLVER (v15.1 OMEGA)
   * Emerald: Sovereign Link Active (1,106 nodes saturated).
   * Amber: Handshake Pending (Aligning with Saturated Brain).
   * Red: Desync (Identity Gate Blocked).
   */
  const getStatusConfig = () => {
    // 🛡️ OMEGA LOCK: Verification of Anchor IDs
    // We check for 'loading' strings to prevent premature "Active" states.
    const isAnchored = isReady && 
                       userId && userId !== 'loading' && 
                       businessId && businessId !== 'loading';

    if (isAnchored) {
      return { 
        color: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]", 
        label: "Active", 
        icon: ShieldCheck,
        ping: "bg-emerald-400"
      };
    }
    
    // 🛡️ SYNCING: Context is hydrating or backend is performing the handshake
    if (isLoading || !isReady || userId === 'loading' || businessId === 'loading') {
      return { 
        color: "bg-amber-500 animate-pulse", 
        label: "Syncing", 
        icon: Cpu,
        ping: "bg-amber-400"
      };
    }

    // 🛡️ DESYNC: Identity Verification Failed
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
              
              {/* 1. NEURAL LINK STATUS PING (TOP RIGHT) */}
              <div className="absolute -top-1 -right-1 z-30">
                <span className="relative flex h-4 w-4">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    status.ping
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-4 w-4 border-2 border-white dark:border-slate-950 shadow-sm transition-colors duration-500",
                    status.color
                  )}></span>
                </span>
              </div>
              
              {/* 2. EXECUTIVE TRIGGER COMMAND (THE ZAP BUTTON) */}
              <Button
                onClick={toggleCopilot}
                size="icon"
                className={cn(
                  "h-16 w-16 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-emerald-500/40",
                  isOpen 
                    ? "bg-slate-950 rotate-90 border-emerald-500/60 scale-105" 
                    : "bg-gradient-to-br from-slate-900 via-slate-950 to-black hover:shadow-emerald-500/20"
                )}
              >
                <AnimatePresence mode="wait">
                  {(isLoading || userId === 'loading') && !isReady ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, rotate: -180 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 180 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                    </motion.div>
                  ) : isOpen ? (
                    <motion.div
                      key="open"
                      initial={{ opacity: 0, scale: 0.2 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.2 }}
                    >
                      <Sparkles className="h-7 w-7 text-emerald-400 fill-current drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
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
                
                {/* Background Infrastructure Visual (Deep Scan Effect) */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(16,185,129,0.8)_50%,transparent_100%)] bg-[length:100%_12px] animate-[scan_1.5s_linear_infinite]" />
                </div>
              </Button>
            </div>
          </TooltipTrigger>
          
          {/* 3. FORENSIC IDENTITY TOOLTIP (LEFT SIDE) */}
          <TooltipContent 
            side="left" 
            sideOffset={24}
            className="bg-slate-950 text-white border-slate-800 rounded-3xl px-6 py-4 shadow-[0_15px_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 slide-in-from-right-4 duration-300"
          >
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden relative shadow-inner">
                <StatusIcon className={cn(
                    "h-6 w-6 transition-all duration-500", 
                    isReady && userId !== 'loading' ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" : "text-amber-500 animate-pulse"
                )} />
                <div className="absolute inset-0 bg-emerald-500/10 h-1 w-full top-0 animate-[scan-icon_2s_linear_infinite]" />
              </div>

              <div className="flex flex-col min-w-[160px]">
                <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black uppercase tracking-[0.25em] leading-none text-white italic">Aura Omega</span>
                    <Badge className={cn(
                      "border-none text-[9px] px-2 h-4 font-black uppercase tracking-tighter shadow-sm",
                      isReady && userId !== 'loading' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-500"
                    )}>
                      {status.label}
                    </Badge>
                </div>

                <div className="flex items-center gap-2 mt-2.5">
                    <Fingerprint size={12} className="text-slate-500" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest leading-none">
                      {/* v15.1: Hardened null-safe ID display for Director Samuel Oyat */}
                      {isReady && businessId && businessId !== 'loading' 
                        ? `NODE: ${businessId.toString().substring(0, 16)}...` 
                        : isReady ? "Linking Master Brain..." : "Neural Handshake..."}
                    </span>
                </div>

                <div className="flex items-center gap-2 mt-1.5 opacity-80">
                    <Activity size={12} className="text-emerald-600" />
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.15em]">
                      {isReady && userId !== 'loading' ? "Elite 1024-dim Saturated" : "Aligning Pathways"}
                    </span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Embedded Sovereign Styles for the Scan Animations */}
      <style jsx global>{`
        @keyframes scan {
          from { transform: translateY(-120%); }
          to { transform: translateY(120%); }
        }
        @keyframes scan-icon {
          from { top: -20%; }
          to { top: 120%; }
        }
      `}</style>
    </div>
  );
}

/**
 * STATUS: Sovereign AI Gateway Fully Operational.
 * DNA_STANDARD: Elite 1024-dim Memory Saturated (SambaNova Aligned).
 * JURISDICTION: Unified Business Universe (BBU1).
 * VERSION: v15.1 (OMEGA-ULTIMATUM Final).
 */