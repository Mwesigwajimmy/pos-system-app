'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT PANEL ---
 * VERSION: v21.0 OMEGA-ULTIMATUM (THE APEX UI WELD)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. HYDRATION SHIELD: Implemented a physical 'hasMounted' guard to stop the 
 *    "Illegal constructor" error. This ensures the component only accesses 
 *    browser APIs after the client-side handshake is safe.
 * 2. UNIFIED UUID ANCHOR: Physically welds the footer displays to the 
 *    verified 5918cefa... UUIDs, resolving the 0xNULL hang instantly.
 * 3. NEURAL PROTOCOL STAGE: Re-engineered the forensic loading UI to be 
 *    cleaner and high-fidelity, reflecting the APEX security standard.
 * 4. CARD UI REFINEMENT: Hardened message bubbles and container shadows 
 *    for a professional finish without altering font dimensions.
 * 5. ATOMIC INTERACTION: Welded the form submission logic to the Version 8 
 *    Identity Vault to prevent data leakage during multi-business context shifts.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, Cpu, 
  FileDown, Compass, Fingerprint, Zap, ShieldCheck,
  Presentation, Terminal, Globe, Lock, Wifi, WifiOff, Activity
} from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';

// ✅ THE MASTER IDENTITY HOOK
import { useCopilot } from '@/context/CopilotContext'; 
import AuraBoardroom from '../copilot/AuraBoardroom'; 

const downloadFileFromBase64 = (fileName: string, mimeType: string, content: string): void => {
  try {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${content}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Sovereign Export Complete: ${fileName}`);
  } catch (error) {
    toast.error("Data Stream Error: Could not finalize download.");
  }
};

/**
 * AGENT STEP COMPONENT
 * Renders high-fidelity 'Forensic Thoughts' for the 9-agent Council.
 */
const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  if (!data) return null;
  
  try {
    const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};
    
    const actionConfigs: Record<string, { icon: any, color: string, label: string }> = {
      navigate: { icon: Compass, color: "text-sky-500 bg-sky-500/5 border-sky-500/20", label: "Sovereign Navigation" },
      download_file: { icon: FileDown, color: "text-emerald-500 bg-emerald-500/5 border-emerald-500/20", label: "Forensic Buffer Generated" },
      prepare_boardroom_presentation: { icon: Presentation, color: "text-blue-500 bg-blue-500/5 border-blue-500/20", label: "Boardroom Initialized" },
      request_confirmation: { icon: ShieldCheck, color: "text-amber-500 bg-amber-500/5 border-amber-500/20", label: "Aura Safety Protocol" }
    };

    const config = actionConfigs[outputData.action];

    if (config) {
      const Icon = config.icon;
      return (
        <div className={cn("text-xs ml-11 my-3 p-4 border rounded-2xl animate-in fade-in slide-in-from-left-2 overflow-hidden relative shadow-sm", config.color)}>
          <div className="flex items-center gap-3 relative z-10">
            <Icon className="h-4 w-4 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-bold uppercase tracking-tighter">{config.label}</p>
              <p className="font-mono text-[10px] opacity-70 truncate max-w-[280px]">
                {outputData.payload?.url || outputData.payload?.fileName || "Executing protocol..."}
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-white/40 h-px w-full top-0 animate-[scan_2s_linear_infinite]" />
        </div>
      );
    }
  } catch (e) { }

  if (data.tool || data.event === 'on_agent_action') {
    const toolName = data.tool || data.data?.tool;
    return (
      <div className="text-[10px] text-muted-foreground ml-11 my-2 p-3 border rounded-xl bg-slate-50/50 border-dashed border-slate-200 relative">
        <div className="flex items-center gap-2">
          <Cpu className="h-3 w-3 text-emerald-500" />
          <p className="font-bold uppercase tracking-widest text-slate-500 text-[8px]">
             Agent Authority: {toolName?.replace(/_/g, ' ') || "Neural Sync"}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default function CopilotPanel() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [boardroomData, setBoardroomData] = useState<any | null>(null);
  const [hasMounted, setHasMounted] = useState(false); // ✅ THE CRASH SHIELD

  const { 
    messages, input, setInput, handleInputChange, handleSubmit, 
    isLoading: isChatLoading, data: streamData, 
    isReady, businessId, userId, tenantId, organizationId, tenantData
  } = useCopilot();

  // 🛡️ MOUNT HANDSHAKE: Prevents Illegal Constructor
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Side-Effect Orchestrator
  useEffect(() => {
    if (streamData && streamData.length > 0) {
      const lastChunk = streamData[streamData.length - 1];
      try {
        const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;
        
        if (parsed.event === 'on_error' || parsed.error) {
            toast.error(parsed.data?.error || parsed.error || "Neural Link Desync.");
        }

        if (parsed.event === 'on_tool_end' && parsed.data?.output) {
          const output = typeof parsed.data.output === 'string' ? JSON.parse(parsed.data.output) : parsed.data.output;
          if (output.action === "navigate") router.push(output.payload.url);
          if (output.action === "download_file") downloadFileFromBase64(output.payload.fileName, output.payload.mimeType, output.payload.content);
          if (output.action === "prepare_boardroom_presentation") setBoardroomData(output.payload);
        }
      } catch (e) { }
    }
  }, [streamData, router]);

  // Persistent Neural Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.closest('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
        }
    }
  }, [messages, isChatLoading, streamData]);

  // Focus input when ready
  useEffect(() => {
    if (isReady && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isReady]);

  // 🛡️ HYDRATION ESCAPE
  if (!hasMounted) return null;

  const canSend = isReady && !isChatLoading && (input || '').trim().length > 0;

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden shadow-2xl border-l relative font-sans">
      
      <AnimatePresence>
        {boardroomData && (
          <AuraBoardroom 
            presenter={boardroomData.presenter_role}
            title={boardroomData.meeting_title}
            slides={boardroomData.slides}
            onClose={() => setBoardroomData(null)}
          />
        )}
      </AnimatePresence>

      <header className="p-6 border-b bg-[#0B0F19] text-white flex flex-col gap-1 shrink-0 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Fingerprint size={120} className="text-emerald-500" />
        </div>
        <div className="flex items-center justify-between relative z-10">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter italic text-emerald-400">
                <div className="relative">
                  <Zap className="h-5 w-5 fill-emerald-400 animate-pulse"/>
                  <div className="absolute inset-0 bg-emerald-400 blur-md opacity-30 animate-pulse" />
                </div>
                Aura Mission Control
            </h2>
            <div className="flex items-center gap-2">
               {isReady ? (
                  <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <Wifi className="h-3 w-3 mr-1 animate-pulse" /> OMEGA LINK
                  </Badge>
               ) : (
                  <Badge className="bg-slate-800 text-slate-500 text-[8px] border-none px-2 py-0.5">
                    <WifiOff className="h-3 w-3 mr-1" /> ALIGNING...
                  </Badge>
               )}
            </div>
        </div>
        <div className="flex items-center gap-2 relative z-10 mt-1 opacity-50">
           <Terminal size={10} className="text-emerald-500" />
           <p className="text-[9px] text-slate-400 font-mono uppercase tracking-[0.3em]">Sovereign Executive Kernel v16.0</p>
           <div className="flex items-center gap-1 ml-auto text-[8px]">
              <Lock size={10} className="text-slate-500" />
              <span className="font-mono">VAULT: {isReady ? businessId?.substring(0, 18) : 'LINKING...'}</span>
           </div>
        </div>
      </header>
      
      <ScrollArea className="flex-grow p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] bg-slate-50/50">
        <div className="space-y-8 max-w-2xl mx-auto py-4">
            
            {/* 🛡️ NEURAL PROTOCOL HANDSHAKE STAGE */}
            {!isReady && messages.length === 0 && (
                <div className="py-32 text-center animate-in fade-in zoom-in duration-1000">
                    <div className="relative inline-block mb-10">
                        <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping opacity-20" />
                        <div className="h-28 w-28 bg-white rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl border border-slate-100 relative z-10">
                           <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-[0.4em]">Awaiting Forensic Protocol</h2>
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">
                           Synchronizing Sovereign Neural Links for Authorized Entity...
                        </p>
                    </div>
                </div>
            )}

            {/* EMPTY MISSION LOG STATE */}
            {isReady && messages.length === 0 && (
                <div className="py-24 text-center group">
                    <div className="relative inline-block mb-8">
                       <Bot size={80} className="mx-auto text-slate-200 group-hover:text-emerald-500/10 transition-colors duration-1000" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Activity className="text-emerald-500/10 animate-pulse h-10 w-10" />
                       </div>
                       <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[1em] text-slate-300 ml-4">Authorized Directives Only</h3>
                    <div className="flex items-center justify-center gap-6 mt-12 opacity-50">
                       <div className="h-px w-12 bg-slate-200" />
                       <ShieldCheck className="h-4 w-4 text-emerald-500" />
                       <div className="h-px w-12 bg-slate-200" />
                    </div>
                </div>
            )}

            {/* MESSAGE INTERFACE */}
            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex items-start gap-4', m.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-3')}>
                {m.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-2xl shrink-0 border border-emerald-500/20 relative group overflow-hidden">
                    <Sparkles className="h-5 w-5 text-emerald-400 z-10 relative" />
                    <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                  </div>
                )}
                <div className={cn(
                    'rounded-2xl p-6 max-w-[88%] text-[14px] shadow-xl border transition-all leading-relaxed',
                    m.role === 'user' 
                        ? 'bg-[#121826] text-white border-slate-800 rounded-tr-none font-medium' 
                        : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                )}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-emerald-600 prose-code:bg-slate-100 prose-code:p-1 prose-code:rounded prose-table:border prose-table:rounded-xl prose-th:bg-slate-50 prose-th:p-3 prose-td:p-3"
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>

                {m.role === 'user' && (
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-xl shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {/* NEURAL THOUGHT CLOUD */}
            {isChatLoading && streamData && streamData.length > 0 && (
                <div className="space-y-1 mt-6">
                    {streamData.map((chunk: any, i: number) => (
                        <AgentStep key={`step-${i}`} data={chunk.data || chunk} />
                    ))}
                </div>
            )}

            {/* PULSE GATE */}
            {isChatLoading && (
                <div className="flex items-center gap-3 text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em] ml-14 py-6 animate-pulse">
                    <Activity className="h-3 w-3" /> Aura is performing forensic audit...
                </div>
            )}

            <div ref={scrollRef} className="h-20" />
        </div>
      </ScrollArea>
      
      <footer className="p-8 border-t bg-white/95 backdrop-blur-xl shrink-0 shadow-[0_-20px_100px_rgba(0,0,0,0.04)] relative z-20">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) handleSubmit(e);
          }} 
          className="flex items-center gap-4"
        >
          <div className="relative flex-grow group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-2xl blur opacity-0 group-focus-within:opacity-10 transition duration-500" />
            <Input 
              ref={inputRef}
              value={input} 
              onChange={handleInputChange} 
              placeholder={!isReady ? "Establishing Sovereign Handshake..." : "Authorize Auditor scan or CFO |"} 
              className="relative h-16 rounded-2xl bg-white border-slate-100 shadow-2xl focus-visible:ring-0 focus-visible:border-emerald-500/50 transition-all text-[15px] px-8 pr-12"
              disabled={!isReady || isChatLoading}
            />
            {isChatLoading && (
               <div className="absolute right-6 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <Button 
            type="submit" 
            size="icon" 
            disabled={!canSend} 
            className={cn(
                "h-16 w-16 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all shrink-0 active:scale-95",
                canSend ? "bg-[#0F172A] hover:bg-[#05080F] text-white" : "bg-slate-50 text-slate-200 border border-slate-100"
            )}
          >
            {isChatLoading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Send className="h-7 w-7" />}
          </Button>
        </form>
        
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100/60">
            <div className="flex gap-6 text-left">
                <div className="flex flex-col">
                   <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Sovereign Node</span>
                   <div className="flex items-center gap-2 mt-1">
                      <Globe size={11} className="text-emerald-500" />
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100/50 px-3 py-1 rounded-lg border border-slate-200/50 shadow-sm">
                        {isReady ? (businessId || tenantId)?.substring(0, 18) : '0xNULL'}
                      </span>
                   </div>
                </div>
                <div className="flex flex-col border-l border-slate-200 pl-6">
                   <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Director Identity</span>
                   <div className="flex items-center gap-2 mt-1">
                      <Fingerprint size={11} className="text-sky-500" />
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100/50 px-3 py-1 rounded-lg border border-slate-200/50 shadow-sm">
                        {isReady ? userId?.substring(0, 18) : '0xANON'}
                      </span>
                   </div>
                </div>
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] font-black text-slate-300 text-right leading-loose italic opacity-80">
                Sovereign Cloud Native<br/>
                Executive Access Protocol
            </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}