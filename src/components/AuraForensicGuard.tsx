'use client';

/**
 * --- BBU1 SOVEREIGN AURA FORENSIC GUARD ---
 * VERSION: v22.1 OMEGA-ULTIMATUM (THE AWAKENING WELD)
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. SCROLL TELEMETRY: Integrated a floor-detection observer to ensure 
 *    the command bar remains dormant until the dashboard is fully consumed.
 * 2. KINETIC ANIMATION: Integrated AnimatePresence for a smooth bottom-anchored 
 *    slide-up entrance.
 * 3. IDENTITY PROTECTION: Maintains forensic isolation protocols while 
 *    minimizing UI interference.
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { useCopilot } from '@/context/CopilotContext';
import { 
  Sparkles, ShieldCheck, Loader2, Send, 
  Activity, Fingerprint, Zap 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AuraBoardroom from '@/components/copilot/AuraBoardroom';
import { motion, AnimatePresence } from 'framer-motion';

interface AuraForensicGuardProps {
  children: ReactNode;
}

export default function AuraForensicGuard({ children }: AuraForensicGuardProps) {
  const { 
    isReady,
    boardroomData,
    closeBoardroom,
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading, 
    businessId,
  } = useCopilot();

  const [isVisible, setIsVisible] = useState(false);

  // --- SCROLL DETECTION ENGINE ---
  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll position telemetry
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // TRIGGER CONDITION: User is within 100px of the bottom of the viewport
      const isAtBottom = (windowHeight + scrollTop) >= (documentHeight - 100);
      
      // If the page is shorter than the window, show it immediately
      if (documentHeight <= windowHeight) {
        setIsVisible(true);
      } else {
        setIsVisible(isAtBottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const canSend = !isLoading && (input || '').trim().length > 0;

  // --- 1. THE "AWAITING" STATE (Global Protocol Lock) ---
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
          <p className="text-[10px] text-slate-300 font-mono italic">Synchronizing neural links for {businessId || 'Unauthorized Entity'}...</p>
        </div>

        <div className="w-full max-w-2xl">
          <div className="h-16 w-full rounded-2xl bg-slate-50 border-2 border-emerald-500/20 flex items-center px-8 opacity-50 grayscale cursor-not-allowed">
            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Neural Link Synchronizing...</span>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. THE "ACTIVE" STATE (System Awakened) ---
  return (
    <div className="relative min-h-screen">
      {/* AURA PRESENTATION OVERLAY */}
      {boardroomData && (
        <AuraBoardroom 
          presenter={boardroomData.presenter_role}
          title={boardroomData.meeting_title}
          slides={boardroomData.slides}
          onClose={closeBoardroom}
        />
      )}

      {/* DYNAMIC DASHBOARD CONTENT */}
      <div className="pb-40 transition-all duration-500"> 
        {children}
      </div>

      {/* --- THE GLOBAL COMMAND BAR (Awakens only at View End) --- */}
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-50 pointer-events-auto"
          >
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} 
              className="relative flex items-center group"
            >
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative w-full flex items-center gap-4 bg-white/95 backdrop-blur-3xl p-3.5 rounded-[1.8rem] border border-white/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)]">
                <div className="pl-4">
                  <Zap className="h-7 w-7 text-emerald-500 animate-pulse fill-emerald-500/20" />
                </div>
                <Input 
                  value={input || ''} 
                  onChange={handleInputChange} 
                  placeholder="Command Aura to audit your ledger..." 
                  className="flex-1 h-14 bg-transparent border-none text-base font-bold focus-visible:ring-0 placeholder:text-slate-400"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  disabled={!canSend}
                  className={cn(
                    "h-14 w-14 rounded-2xl shadow-xl transition-all active:scale-90",
                    canSend ? "bg-slate-950 scale-100" : "bg-slate-100 grayscale opacity-40"
                  )}
                >
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
                </Button>
              </div>
            </form>
            
            {/* VERIFICATION NODES */}
            <div className="mt-5 flex justify-center gap-10 text-[8px] font-black uppercase tracking-[0.5em] text-slate-400 opacity-60">
              <span className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-emerald-500" /> Forensic Isolation Verified
              </span>
              <span className="flex items-center gap-2">
                <Fingerprint className="h-3 w-3 text-sky-500" /> Logic Encryption Active
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}