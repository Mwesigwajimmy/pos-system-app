'use client';

/**
 * --- BBU1 SOVEREIGN AI GATEWAY ---
 * Floating trigger that opens the Aura copilot panel. Reflects live
 * connection status (Active / Syncing / Desync) from CopilotContext.
 */

import React from 'react';
import {
  Zap,
  Loader2,
  Fingerprint,
  Sparkles,
  ShieldCheck,
  Cpu,
  ShieldAlert,
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

  const getStatusConfig = () => {
    const isAnchored = isReady &&
                       userId && userId !== '' &&
                       businessId && businessId !== '';

    if (isAnchored) {
      return {
        color: "bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.6)]",
        label: "Active",
        icon: ShieldCheck,
        ping: "bg-emerald-400"
      };
    }

    if (isLoading || !isReady) {
      return {
        color: "bg-amber-500 animate-pulse",
        label: "Syncing",
        icon: Cpu,
        ping: "bg-amber-400"
      };
    }

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
    <div
      className={cn(
        "fixed bottom-5 right-4 sm:bottom-8 sm:right-8 z-[100] group transition-all duration-300",
        // The chat panel already has its own close (X) in its header — leaving
        // this trigger visible/interactive while open gave the chat two
        // different "close chat" controls stacked in the same corner.
        isOpen && "opacity-0 scale-75 pointer-events-none"
      )}
    >
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger
            render={
            <div className="relative">

              {/* 1. NEURAL LINK STATUS PING */}
              <div className="absolute -top-1 -right-1 z-30">
                <span className="relative flex h-3.5 w-3.5 sm:h-4 sm:w-4">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    status.ping
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-white dark:border-slate-950 shadow-md transition-all duration-700",
                    status.color
                  )}></span>
                </span>
              </div>

              {/* 2. EXECUTIVE TRIGGER (THE SOVEREIGN ZAP) */}
              <Button
                onClick={toggleCopilot}
                size="icon"
                className={cn(
                  "h-14 w-14 sm:h-16 sm:w-16 rounded-2xl sm:rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-700 hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden border border-white/10",
                  isOpen
                    ? "bg-slate-950 rotate-90 border-emerald-500/60 scale-105"
                    : "bg-gradient-to-br from-slate-900 via-slate-950 to-black group-hover:border-emerald-500/40"
                )}
              >
                <AnimatePresence mode="wait">
                  {isLoading && !isReady ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-emerald-400" />
                    </motion.div>
                  ) : isOpen ? (
                    <motion.div
                      key="open"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                    >
                      <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400 fill-current drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="closed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Zap className={cn(
                        "h-6 w-6 sm:h-7 sm:w-7 transition-all duration-700",
                        isReady ? "text-emerald-400 fill-emerald-400/20 group-hover:fill-emerald-400" : "text-slate-600"
                      )} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(16,185,129,1)_50%,transparent_100%)] bg-[length:100%_15px] animate-[scan_2s_linear_infinite]" />
                </div>
              </Button>
            </div>
            }
          />

          {/* 3. FORENSIC IDENTITY TOOLTIP */}
          <TooltipContent
            side="left"
            sideOffset={24}
            className="bg-slate-950 text-white border-slate-800 rounded-2xl sm:rounded-[2rem] px-5 sm:px-8 py-4 sm:py-6 shadow-[0_40px_80px_rgba(0,0,0,0.9)] border-white/5 animate-in fade-in slide-in-from-right-4 duration-500 max-w-[calc(100vw-2rem)]"
          >
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 relative overflow-hidden shrink-0">
                <StatusIcon className={cn(
                    "h-6 w-6 sm:h-8 sm:w-8 transition-all duration-500",
                    isReady ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]" : "text-amber-500 animate-pulse"
                )} />
                <div className="absolute inset-0 bg-emerald-500/10 h-px w-full top-0 animate-[scan-icon_2.5s_linear_infinite]" />
              </div>

              <div className="flex flex-col min-w-[160px] sm:min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] sm:text-[14px] font-black uppercase tracking-[0.3em] leading-none text-white italic">Aura Apex</span>
                    <Badge className={cn(
                      "border-none text-[9px] px-2 h-4 font-black uppercase tracking-tighter",
                      isReady ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {status.label}
                    </Badge>
                </div>

                <div className="flex items-center gap-2.5 mt-2 overflow-hidden">
                    <Fingerprint size={12} className="text-slate-500 shrink-0" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em] truncate">
                      {isReady ? `Node: ${businessId?.substring(0, 18)}...` : "Aligning Neural Node..."}
                    </span>
                </div>

                <div className="flex items-center gap-2.5 mt-3 opacity-80">
                    <Database size={12} className="text-emerald-600 shrink-0" />
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                      {isReady ? "Registered Identity Saturated" : "Executing Forensic Protocol"}
                    </span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <style jsx global>{`
        @keyframes scan {
          from { transform: translateY(-200%); }
          to { transform: translateY(200%); }
        }
        @keyframes scan-icon {
          from { top: -20%; }
          to { top: 120%; }
        }
      `}</style>
    </div>
  );
}
