'use client';

import React, { ReactNode } from 'react';
import { useCopilot } from '@/context/CopilotContext';
import { 
  Sparkles, ShieldCheck, Loader2, Send, 
  Activity, Fingerprint, Zap 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AuraForensicGuardProps {
  children: ReactNode;
}

export default function AuraForensicGuard({ children }: AuraForensicGuardProps) {
  const { 
    isReady, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading, 
    businessId,
    userId 
  } = useCopilot();

  const canSend = !isLoading && (input || '').trim().length > 0;

  // --- 1. THE "AWAITING" STATE (Global Lock) ---
  if (!isReady) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center p-6 space-y-12 animate-in fade-in duration-700">
        <div className="relative group">
          <div className="absolute -inset-4 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative h-40 w-40 flex items-center justify-center">
            <Sparkles size={120} className="text-slate-900 opacity-5" />
            <ShieldCheck size={48} className="absolute text-emerald-500 animate-bounce" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-xs font-black uppercase tracking-[0.8em] text-slate-400">Awaiting Forensic Protocol</h2>
          <p className="text-[10px] text-slate-300 font-mono italic">Synchronizing sovereign neural links for {businessId || 'Unauthorized Entity'}...</p>
        </div>

        <div className="w-full max-w-2xl">
          <div className="h-16 w-full rounded-2xl bg-slate-50 border-2 border-emerald-500/20 flex items-center px-8 opacity-50 grayscale cursor-not-allowed">
            <span className="text-slate-400 font-medium">Neural Link Synchronizing...</span>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. THE "ACTIVE" STATE (System Awakened) ---
  return (
    <div className="relative min-h-screen">
      {/* The Dashboard Content (Retail, Sacco, etc.) */}
      <div className="pb-32"> 
        {children}
      </div>

      {/* --- THE GLOBAL COMMAND BAR (Awakens Typing & Sending) --- */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-40">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} 
          className="relative flex items-center group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative w-full flex items-center gap-4 bg-white/90 backdrop-blur-2xl p-3 rounded-2xl border border-white/50 shadow-2xl">
            <div className="pl-4">
              <Zap className="h-6 w-6 text-emerald-500 animate-pulse" />
            </div>
            <Input 
              value={input || ''} 
              onChange={handleInputChange} 
              placeholder="Command Aura to audit your ledger..." 
              className="flex-1 h-14 bg-transparent border-none text-base font-medium focus-visible:ring-0 placeholder:text-slate-400"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={!canSend}
              className={cn(
                "h-14 w-14 rounded-xl shadow-xl transition-all",
                canSend ? "bg-slate-950 scale-100" : "bg-slate-100 grayscale opacity-50"
              )}
            >
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
            </Button>
          </div>
        </form>
        
        {/* Verification Badges */}
        <div className="mt-4 flex justify-center gap-8 text-[8px] font-black uppercase tracking-[0.4em] text-slate-300">
          <span className="flex items-center gap-2"><Activity className="h-3 w-3" /> Forensic Isolation Verified</span>
          <span className="flex items-center gap-2"><Fingerprint className="h-3 w-3" /> Logic Encryption Active</span>
        </div>
      </div>
    </div>
  );
}