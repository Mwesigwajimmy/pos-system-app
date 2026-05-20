'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT PANEL ---
 * VERSION: v17.0 OMEGA-ULTIMATUM (THE FINAL SEAL)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. IDENTITY AUTO-LOCK: Physically welds the input state to the 
 *    authoritative 'isReady' signal. Prevents "loading" UUIDs from hitting the DB.
 * 2. NEURAL LATENCY SHIELD: High-fidelity transition from "Alignment" to "Active" 
 *    the millisecond UUIDs are verified in the context.
 * 3. OMNISCIENT AGENT PARSER: Hardened for the 9-agent Executive Council 
 *    (Medical, SACCO, Telecom, etc.).
 * 4. INTERACTION WELD: Fixed the 'Enter' key and 'Send' button to fire 
 *    the append() call through the v17.0 forced request body.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, Cog, Server, 
  FileDown, Pilcrow, Compass, Fingerprint, Zap, Activity, ShieldCheck,
  Presentation, AlertTriangle, Cpu, Terminal, Globe, Lock, Wifi, WifiOff
} from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';
import { useCopilot } from '@/context/CopilotContext'; 

// IMPORT: The Visual Boardroom Stage
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
 * Renders high-fidelity 'Forensic Thoughts' for all 9 agents.
 */
const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  if (!data) return null;
  
  try {
    // 🛡️ FORENSIC PARSING: Supporting both object and stringified stream outputs
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
        <div className={cn("text-xs ml-11 my-2 p-3 border rounded-xl animate-in fade-in slide-in-from-left-2 overflow-hidden relative", config.color)}>
          <div className="flex items-center gap-2 relative z-10">
            <Icon className="h-4 w-4 flex-shrink-0 animate-pulse" />
            <div>
              <p className="font-bold uppercase tracking-tighter">{config.label}</p>
              <p className="font-mono text-[10px] opacity-70 truncate max-w-[280px]">
                {outputData.payload?.url || outputData.payload?.fileName || "Executing strategic task..."}
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
          <div>
            <p className="font-bold uppercase tracking-widest text-slate-500 text-[8px]">
               Agent Authority: {toolName?.replace(/_/g, ' ') || "Neural Sync"}
            </p>
          </div>
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

  const { 
    messages, input, setInput, handleInputChange, handleSubmit, 
    isLoading: isChatLoading, data: streamData, 
    isReady, businessId, userId, tenantData
  } = useCopilot();

  // Side-Effect Orchestrator: Captures tool completion and errors
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

  /**
   * ✅ OMEGA READINESS CHECK:
   * Physically prevents input if the Director Identity is not anchored.
   */
  const canSend = isReady && !isChatLoading && (input || '').trim().length > 0;

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden shadow-2xl border-l relative font-sans">
      
      {/* 🚀 SOVEREIGN BOARDROOM MODAL */}
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

      <header className="p-6 border-b bg-slate-950 text-white flex flex-col gap-1 shrink-0 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Fingerprint size={120} className="text-emerald-500" />
        </div>
        <div className="flex items-center justify-between relative z-10">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter italic text-emerald-400">
                <div className="relative">
                  <Zap className="h-5 w-5 fill-emerald-400 animate-pulse"/>
                  <div className="absolute inset-0 bg-emerald-400 blur-md opacity-30 animate-pulse" />
                </div>
                Aura Sovereign
            </h2>
            <div className="flex items-center gap-2">
               {isReady ? (
                  <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[8px] px-2 py-0.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <Wifi className="h-3 w-3 mr-1 animate-pulse" /> OMEGA LINK
                  </Badge>
               ) : (
                  <Badge className="bg-slate-800 text-slate-500 text-[8px] border-none px-2 py-0.5">
                    <WifiOff className="h-3 w-3 mr-1" /> ALIGNING...
                  </Badge>
               )}
               <Badge className="bg-slate-800 text-slate-400 text-[8px] border-none px-2 py-0.5 uppercase tracking-widest font-mono">v17.0</Badge>
            </div>
        </div>
        <div className="flex items-center gap-2 relative z-10 opacity-50">
           <Terminal size={10} className="text-emerald-500" />
           <p className="text-[9px] text-slate-400 font-mono uppercase tracking-[0.3em]">Elite 1024-dim • 1,974 Nodes Saturated</p>
        </div>
      </header>
      
      <ScrollArea className="flex-grow p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] bg-slate-50/50">
        <div className="space-y-8 max-w-2xl mx-auto">
            
            {/* INITIALIZING IDENTITY STATE (Refined v17.0) */}
            {!isReady && messages.length === 0 && (
                <div className="py-32 text-center animate-in fade-in duration-1000">
                    <div className="relative inline-block mb-6">
                        <Loader2 className="h-14 w-14 animate-spin text-emerald-500/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-emerald-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-400">Aligning Neural Identity</p>
                        <p className="text-[8px] text-slate-300 uppercase tracking-widest">Vault: {tenantData?.businessName || "Requesting Handshake..."}</p>
                    </div>
                </div>
            )}

            {/* READY BUT IDLE STATE */}
            {isReady && messages.length === 0 && (
                <div className="py-24 text-center group">
                    <div className="relative inline-block mb-8">
                       <Bot size={80} className="mx-auto text-slate-200 group-hover:text-emerald-500/10 transition-colors duration-1000" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Activity className="text-emerald-500/10 animate-pulse h-10 w-10" />
                       </div>
                       <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.8em] text-slate-300 group-hover:text-slate-400 transition-colors">Awaiting Executive Directive</h3>
                    <div className="flex items-center justify-center gap-4 mt-8">
                       <div className="h-px w-8 bg-slate-200" />
                       <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">
                          Vault: {businessId?.substring(0, 18) || 'CONNECTING...'}
                       </span>
                       <div className="h-px w-8 bg-slate-200" />
                    </div>
                </div>
            )}

            {/* MESSAGE RENDERING */}
            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex items-start gap-4', m.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-3')}>
                {m.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-xl shrink-0 border border-emerald-500/20 relative group overflow-hidden">
                    <Sparkles className="h-5 w-5 text-emerald-400 z-10 relative" />
                    <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                  </div>
                )}
                <div className={cn(
                    'rounded-2xl p-5 max-w-[85%] text-[14px] shadow-sm border transition-all leading-relaxed',
                    m.role === 'user' 
                        ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none font-medium' 
                        : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                )}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    className="prose prose-sm max-w-none prose-p:leading-relaxed prose-table:border prose-table:rounded-xl prose-th:bg-slate-50 prose-th:p-3 prose-td:p-3 prose-td:border-t"
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>

                {m.role === 'user' && (
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-inner shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {/* AUTONOMOUS AGENT ACTIONS (Real-time Stream) */}
            {isChatLoading && streamData && streamData.length > 0 && (
                <div className="space-y-1 mt-4">
                    {streamData.map((chunk: any, i: number) => (
                        <AgentStep key={`step-${i}`} data={chunk.data || chunk} />
                    ))}
                </div>
            )}

            {/* PROCESSING INDICATOR */}
            {isChatLoading && (
                <div className="flex items-center gap-3 text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em] ml-14 py-4 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Aura is auditing enterprise sectors...
                </div>
            )}

            <div ref={scrollRef} className="h-20" />
        </div>
      </ScrollArea>
      
      <footer className="p-6 border-t bg-white shrink-0 shadow-[0_-20px_80px_rgba(0,0,0,0.03)] relative z-20">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) handleSubmit(e);
          }} 
          className="flex items-center gap-3"
        >
          <div className="relative flex-grow">
            <Input 
              ref={inputRef}
              value={input} 
              onChange={handleInputChange} 
              placeholder={!isReady ? "Verifying Forensic Identity..." : "Authorize Auditor scan or CFO ledger audit..."} 
              className="h-14 rounded-2xl bg-slate-50 border-slate-100 shadow-inner focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/40 transition-all text-[15px] px-6 pr-12"
              disabled={!isReady || isChatLoading}
            />
            {isChatLoading && (
               <div className="absolute right-4 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
          <Button 
            type="submit" 
            size="icon" 
            disabled={!canSend} 
            className={cn(
                "h-14 w-14 rounded-2xl shadow-2xl transition-all shrink-0 active:scale-95",
                canSend ? "bg-slate-950 hover:bg-emerald-950 text-white" : "bg-slate-100 text-slate-300"
            )}
          >
            {isChatLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
        
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50">
            <div className="flex gap-4 text-left">
                <div className="flex flex-col">
                   <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Business Node</span>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Globe size={10} className="text-emerald-500" />
                      <span className="font-mono text-[9px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                        {isReady ? businessId?.substring(0, 18) : '0xLOADING'}
                      </span>
                   </div>
                </div>
                <div className="flex flex-col border-l border-slate-100 pl-4">
                   <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Director ID</span>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Fingerprint size={10} className="text-sky-500" />
                      <span className="font-mono text-[9px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                        {isReady ? userId?.substring(0, 18) : '0xSYNCING'}
                      </span>
                   </div>
                </div>
            </div>
            <div className="text-[8px] uppercase tracking-[0.2em] font-black text-slate-300 text-right leading-relaxed italic">
                Sovereign Cloud Native<br/>Executive Access Protocol
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