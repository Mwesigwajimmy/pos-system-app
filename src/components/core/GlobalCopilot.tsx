'use client';

/**
 * --- BBU1 SOVEREIGN AI GATEWAY ---
 * VERSION: v12.2 Sovereign Edition (EXECUTIVE INTERFACE)
 * 
 * CORE UPDATES:
 * 1. IDENTITY SAFETY: Added null-checks to ID slicing to prevent crash during sync.
 * 2. VISUAL HARMONY: Deepened the scan-line animations for a 'Forensic' feel.
 * 3. STATE SYNC: Directly reflects the verified business node from the context.
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
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Ensure you have this component or use a div
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
  const { toggleCopilot, isOpen, isReady, isLoading, businessId } = useCopilot();

  /**
   * NEURAL STATUS RESOLVER
   * Emerald: Sovereign Link Active.
   * Amber: Forensic Syncing.
   * Red: Desync/Authentication Required.
   */
  const getStatusConfig = () => {
    if (isReady && businessId) return { color: "bg-emerald-500", label: "Active", icon: ShieldCheck };
    if (isLoading) return { color: "bg-amber-500 animate-pulse", label: "Syncing", icon: Cpu };
    return { color: "bg-rose-500", label: "Desync", icon: ShieldAlert };
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
                  {/* Outer Pulse Effect */}
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    isReady ? "bg-emerald-400" : "bg-amber-400"
                  )}></span>
                  {/* Solid Center Node */}
                  <span className={cn(
                    "relative inline-flex rounded-full h-4 w-4 border-2 border-white dark:border-slate-950 shadow-sm transition-colors duration-500",
                    status.color
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
                
                {/* Background Infrastructure Visual (Deep Scan Effect) */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none group-hover:opacity-10 transition-opacity">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(16,185,129,0.5)_50%,transparent_100%)] bg-[length:100%_8px] animate-[scan_2s_linear_infinite]" />
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
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden relative">
                <StatusIcon className={cn("h-5 w-5", isReady ? "text-emerald-400" : "text-amber-500 animate-pulse")} />
                {/* Subtle internal scan line for the icon box */}
                <div className="absolute inset-0 bg-emerald-500/10 h-px w-full top-0 animate-[scan-icon_1.5s_linear_infinite]" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none text-white">Aura Intelligence</span>
                    <Badge className={cn(
                      "border-none text-[8px] px-1.5 h-3.5 font-black uppercase tracking-tighter",
                      isReady ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {status.label}
                    </Badge>
                </div>

                <div className="flex items-center gap-1.5 mt-1.5">
                    <Fingerprint size={10} className="text-slate-500" />
                    <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest leading-none">
                      {isReady && businessId 
                        ? `Node: ${businessId.substring(0, 18)}...` 
                        : "Handshake in Progress..."}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                    <Activity size={10} className="text-slate-500" />
                    <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.1em]">
                      {isReady ? "Executive Kernel Online" : "Stabilizing Neural Pathways"}
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
          from { transform: translateY(-100%); }
          to { transform: translateY(100%); }
        }
        @keyframes scan-icon {
          from { top: 0%; }
          to { top: 100%; }
        }
      `}</style>
    </div>
  );
}