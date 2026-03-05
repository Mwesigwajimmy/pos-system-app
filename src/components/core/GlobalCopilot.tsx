'use client';

import React from 'react';
import { Zap, Loader2, Fingerprint, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCopilot } from '@/context/CopilotContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * --- GLOBAL COPILOT TRIGGER ---
 * This is the primary executive entry point for Aura.
 * It floats on every page to provide instant access to the forensic kernel.
 */
export default function GlobalCopilot() {
  // Access the Sovereign state from the context we just fixed
  const { toggleCopilot, isOpen, isReady, isLoading, businessId } = useCopilot();

  // If the system isn't mounted or business logic is missing, we show a loading state
  const statusColor = isReady ? "bg-emerald-500" : "bg-amber-500 animate-pulse";

  return (
    <div className="fixed bottom-8 right-8 z-[100] group">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              {/* Handshake Status Ping */}
              <div className={cn(
                "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white z-20 transition-colors",
                statusColor
              )} />
              
              {/* Main Executive Trigger Button */}
              <Button
                onClick={toggleCopilot}
                size="icon"
                className={cn(
                  "h-16 w-16 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden",
                  isOpen 
                    ? "bg-slate-950 rotate-90" 
                    : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                ) : isOpen ? (
                  <Sparkles className="h-7 w-7 text-emerald-400 fill-current" />
                ) : (
                  <Zap className="h-7 w-7 text-emerald-400 fill-current animate-pulse" />
                )}
                
                {/* Background Visual Effect */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent" />
              </Button>
            </div>
          </TooltipTrigger>
          
          <TooltipContent 
            side="left" 
            className="bg-slate-950 text-white border-slate-800 rounded-xl px-4 py-2.5 shadow-2xl mr-4"
          >
            <div className="flex items-center gap-3">
              <Fingerprint className="h-4 w-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Aura Executive</span>
                <span className="text-[9px] text-slate-400 mt-1 font-mono uppercase">
                  {isReady ? `ID: ${businessId.slice(0, 12)}` : "Synchronizing..."}
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}