'use client';

/**
 * --- BBU1 SOVEREIGN AI GATEWAY ---
 * The definitive executive entry point for the Aura Autonomous C-Suite.
 * This component provides persistent, floating access to the Forensic Kernel.
 * 
 * Capability: Real-time Handshake Visualization, Multi-Tenant ID Display.
 * Integrity Grade: OMEGA-LEVEL Sovereign Core.
 */

import React from 'react';
import { 
  Zap, 
  Loader2, 
  Fingerprint, 
  Sparkles, 
  ShieldCheck, 
  Activity,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopilot } from '@/context/CopilotContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * GlobalCopilot: The Sovereign Command Node.
 * Stays persistent across the dashboard to ensure the Director is never 
 * more than one click away from forensic business intelligence.
 */
export default function GlobalCopilot() {
  // Access the high-authority state from the Sovereign Context
  const { toggleCopilot, isOpen, isReady, isLoading, businessId } = useCopilot();

  /**
   * STATUS ENGINE
   * Emerald: Sovereign Link Established (Ready).
   * Amber: Neural Handshake in Progress (Syncing).
   */
  const statusColor = isReady ? "bg-emerald-500" : "bg-amber-500 animate-pulse";

  return (
    <div className="fixed bottom-8 right-8 z-[100] group">
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              
              {/* 1. NEURAL LINK STATUS PING */}
              <div className="absolute -top-1 -right-1 z-30">
                <span className="relative flex h-4 w-4">
                  {/* Outer Pulse Effect */}
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    isReady ? "bg-emerald-400" : "bg-amber-400"
                  )}></span>
                  {/* Solid Center Node */}
                  <span className={cn(
                    "relative inline-flex rounded-full h-4 w-4 border-2 border-white dark:border-slate-950 shadow-sm",
                    statusColor
                  )}></span>
                </span>
              </div>
              
              {/* 2. EXECUTIVE TRIGGER COMMAND */}
              <Button
                onClick={toggleCopilot}
                size="icon"
                className={cn(
                  "h-16 w-16 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-500 hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-emerald-500/30",
                  isOpen 
                    ? "bg-slate-950 rotate-90" 
                    : "bg-gradient-to-br from-slate-900 via-slate-950 to-black hover:shadow-emerald-500/10"
                )}
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                    >
                      <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                    </motion.div>
                  ) : isOpen ? (
                    <motion.div
                      key="open"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <Sparkles className="h-7 w-7 text-emerald-400 fill-current" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="closed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Zap className="h-7 w-7 text-emerald-400 fill-emerald-400/20 group-hover:fill-emerald-400 transition-all duration-700" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Background Infrastructure Visual (Scanning Effect) */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none group-hover:opacity-10 transition-opacity">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(16,185,129,0.3)_50%,transparent_100%)] bg-[length:100%_4px] animate-scan" />
                </div>
              </Button>
            </div>
          </TooltipTrigger>
          
          {/* 3. FORENSIC IDENTITY TOOLTIP */}
          <TooltipContent 
            side="left" 
            sideOffset={20}
            className="bg-slate-950 text-white border-slate-800 rounded-2xl px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)] animate-in slide-in-from-right-2"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                {isReady ? <ShieldCheck className="text-emerald-400 h-5 w-5" /> : <Cpu className="text-slate-500 h-5 w-5 animate-pulse" />}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none text-white">Aura Sovereign</span>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] px-1.5 h-3.5 font-black uppercase tracking-tighter">Active</Badge>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <Fingerprint size={10} className="text-slate-500" />
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest leading-none">
                      {isReady ? `Vault: ${businessId.slice(0, 16)}` : "Syncing Neural Link..."}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                    <Activity size={10} className="text-slate-500" />
                    <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.1em]">Protocol: Cloud-Native v10.8</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/**
 * STATUS: Global Gateway Active.
 * VERSION: v10.8 (Sovereign Edition).
 * JURISDICTION: Unified Business Dashboard.
 */