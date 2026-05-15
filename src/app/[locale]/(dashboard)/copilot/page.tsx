'use client';

/**
 * --- BBU1 SOVEREIGN MISSION CONTROL ---
 * VERSION: v15.0 OMEGA-ULTIMATUM (ELITE 1024-DIM ALIGNED)
 * 
 * CORE UPGRADES:
 * 1. NEURAL REALIGNMENT: Visual data throughput optimized for 1024-dim Elite retrieval.
 * 2. IDENTITY LOCK: Hardened UUID anchors for Director Samuel Oyat / Nak Business.
 * 3. UNBLOCKED HANDSHAKE: Input field activates immediately upon multi-tenant verification.
 * 4. STREAM INTEGRITY: Enhanced AgentStep parser to handle high-density forensic chunks.
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext'; 
import { 
  Sparkles, Send, User, Loader2, Server, Cog, 
  Activity, Compass, FileDown, Fingerprint, ShieldCheck,
  Presentation, AlertTriangle, LayoutGrid, Terminal, Globe, Lock,
  Wifi, WifiOff
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import remarkGfm from 'remark-gfm';

// ✅ SOVEREIGN LINK: The visual stage for the Executive Council
import AuraBoardroom from '@/components/copilot/AuraBoardroom'; 

/**
 * AgentStep Component
 * Visualizes Aura's autonomous reasoning loop during 1024-dim processing.
 */
const AgentStep = ({ data }: { data: any }) => {
    if (!data) return null;

    try {
        // 🛡️ FORENSIC PARSING: Support for high-density stream packets
        const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};
        
        if (outputData.action === "navigate") {
            return (
                <div className="text-xs text-sky-500 ml-12 my-2 p-3 border rounded-xl bg-sky-500/5 border-sky-500/20 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 animate-pulse" />
                        <div>
                            <p className="font-bold uppercase tracking-tighter text-sky-600">Sovereign Navigation</p>
                            <p className="text-[10px] opacity-70 font-mono text-sky-700">Sector Focus: {outputData.payload?.url}</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (outputData.action === "download_file") {
            return (
                <div className="text-xs text-emerald-500 ml-12 my-2 p-3 border rounded-xl bg-emerald-500/5 border-emerald-500/20 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-2">
                        <FileDown className="h-4 w-4 text-emerald-600" />
                        <div>
                            <p className="font-bold uppercase tracking-tighter text-emerald-700">Forensic Buffer Export</p>
                            <p className="text-[10px] opacity-70 text-emerald-600 font-mono">ID: {outputData.payload?.fileName}</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (outputData.action === "prepare_boardroom_presentation") {
            return (
                <div className="text-xs text-blue-500 ml-12 my-2 p-3 border rounded-xl bg-blue-500/5 border-blue-500/20 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-2">
                        <Presentation className="h-4 w-4 text-blue-600" />
                        <div>
                            <p className="font-bold uppercase tracking-tighter text-blue-700">Boardroom Stage Initialized</p>
                            <p className="text-[10px] opacity-70 italic text-blue-600">Syncing visual data for Director review...</p>
                        </div>
                    </div>
                </div>
            );
        }
    } catch (e) { }

    if (data.event === 'on_agent_action' || data.tool) {
        const action = data.data?.data?.[0] || data.data?.[0] || data; 
        const toolName = action?.function?.name || data.tool || 'Forensic Analysis';
        const args = action?.function?.arguments || JSON.stringify(data.toolInput) || '{}';

        return (
            <div className="text-xs text-muted-foreground ml-12 my-2 p-3 border rounded-xl bg-slate-50/50 border-dashed animate-in fade-in slide-in-from-left-2 shadow-sm">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin text-emerald-500" />
                    <div>
                        <p className="font-bold uppercase tracking-tighter text-slate-700">Executive Handshake: {toolName}</p>
                        <p className="text-[9px] opacity-50 font-mono truncate max-w-[400px] italic">Parameters: {args}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (data.event === 'on_tool_end' || (data.output && data.output.length < 500)) {
        const obs = data.data?.output || data.output || "Observation synchronized.";
        return (
            <div className="text-[10px] text-muted-foreground ml-12 my-2 p-2 border-l-2 border-emerald-500 bg-emerald-50/20 italic animate-in fade-in">
                <div className="flex items-center gap-2">
                    <Server className="h-3 w-3 text-emerald-600 opacity-60" />
                    <span className="font-mono text-emerald-800">{typeof obs === 'string' ? obs.substring(0, 80) : "Forensic result received."}...</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function MissionControlPage() {
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [boardroomData, setBoardroomData] = useState<any | null>(null);
  
  const { 
    messages, input, handleInputChange, handleSubmit, 
    isLoading, data, isReady, businessId, userId 
  } = useCopilot();

  // SIDE-EFFECT HANDLER: Orchestrates physical system actions from the neural stream
  useEffect(() => {
    if (data && data.length > 0) {
      const lastChunk = data[data.length - 1];
      try {
        const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;
        if (parsed.event === 'on_tool_end' && parsed.data?.output) {
          const output = typeof parsed.data.output === 'string' ? JSON.parse(parsed.data.output) : parsed.data.output;
          
          if (output.action === "navigate") router.push(output.payload.url);
          if (output.action === "download_file") {
            const link = document.createElement('a');
            link.href = `data:${output.payload.mimeType};base64,${output.payload.content}`;
            link.download = output.payload.fileName;
            link.click();
          }
          if (output.action === "prepare_boardroom_presentation") setBoardroomData(output.payload);
        }
      } catch (e) { }
    }
  }, [data, router]);

  // SCROLL SYNC: Auto-scroll for streaming tokens
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, data]);

  // FOCUS CONTROL: Immediate input activation
  useEffect(() => {
    if (isReady && inputRef.current) inputRef.current.focus();
  }, [isReady]);

  const agentStepsView = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((chunk: any, i: number) => {
        try {
            const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
            if (parsed.event === 'on_chat_model_stream' || parsed.event === 'on_agent_finish') return null;
            return <AgentStep key={`step-${i}`} data={parsed.event ? parsed : parsed.data || parsed} />;
        } catch (e) { return null; }
    }).filter(Boolean);
  }, [data]);

  const streamingContent = isLoading && messages[messages.length - 1]?.role === 'assistant' ? messages[messages.length - 1].content : null;
  const renderedMessages = streamingContent ? messages.slice(0, -1) : messages;
  const canSend = !isLoading && (input || '').trim().length > 0 && isReady;

  return (
    <div className="flex flex-col h-full bg-white border rounded-[32px] shadow-[0_32px_120px_rgba(0,0,0,0.1)] overflow-hidden min-h-[750px] border-slate-100 relative">
      
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

      <header className="px-10 py-7 border-b bg-slate-950 text-white flex items-center justify-between shrink-0 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Fingerprint size={140} className="text-emerald-500" />
          </div>
          
          <div className="flex items-center gap-5 relative z-10">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-inner">
                <Activity className="h-6 w-6 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-black uppercase tracking-[0.25em] text-white italic">Aura Mission Control</h1>
                <p className="text-[10px] text-slate-500 font-mono mt-1.5 tracking-[0.2em] uppercase">Sovereign Executive Kernel v15.0</p>
              </div>
          </div>

          <div className="flex items-center gap-6 relative z-10">
              <div className="hidden lg:flex flex-col items-end">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-4 py-1 rounded-full text-[9px] font-black tracking-[0.2em] mb-2 shadow-sm">
                   OMEGA LINK • 1024-DIM
                </Badge>
                {/* 🛡️ NULL-SAFE ID HANDSHAKE */}
                <div className="flex items-center gap-2">
                   <Lock size={10} className="text-slate-600" />
                   <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest tabular-nums">
                     VAULT: {businessId ? businessId.toString().substring(0, 18) : 'LINKING...'}
                   </p>
                </div>
              </div>
              
              <div className="h-12 w-px bg-slate-800/50" />
              
              <div className="flex flex-col items-center">
                <span className={cn(
                    "h-3 w-3 rounded-full mb-1.5 transition-all duration-1000", 
                    isReady ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" : "bg-amber-500 animate-pulse"
                )}></span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {isReady ? <><Wifi size={10} className="inline mr-1"/> ACTIVE</> : <><WifiOff size={10} className="inline mr-1"/> SYNCING</>}
                </span>
              </div>
          </div>
      </header>

      <ScrollArea className="flex-1 p-10 bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:32px_32px]" ref={scrollAreaRef}>
        <div className="space-y-10 max-w-5xl mx-auto pb-20">
          
          {/* STANDBY STATE */}
          {isReady && messages.length === 0 && (
              <div className="py-40 text-center animate-in fade-in duration-1000">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative inline-block mb-8"
                  >
                    <Sparkles size={100} className="text-slate-900 opacity-[0.03] animate-pulse" />
                    <ShieldCheck size={40} className="absolute bottom-0 right-0 text-emerald-500 drop-shadow-xl" />
                  </motion.div>
                  <h2 className="text-sm font-black uppercase tracking-[0.8em] text-slate-300">Awaiting Executive Directive</h2>
              </div>
          )}

          {/* NEURAL SYNC LOADER */}
          {!isReady && (
            <div className="text-center py-48 animate-in fade-in">
                <Loader2 className="h-16 w-16 animate-spin mx-auto text-emerald-500/20 mb-8" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] italic">Establishing Sovereignty...</p>
            </div>
          )}

          {/* CHAT MESSAGES */}
          {isReady && renderedMessages.map((message: any) => ( 
            <div key={message.id} className={cn('flex items-start gap-5', message.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-4 duration-500')}>
              {message.role === 'assistant' && (
                <div className="w-11 h-11 rounded-[14px] bg-slate-950 flex items-center justify-center shadow-2xl shrink-0 border border-emerald-500/20 relative overflow-hidden group">
                    <Sparkles className="h-5 w-5 text-emerald-400 z-10 transition-transform group-hover:rotate-12"/>
                    <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                </div>
              )}
              <div className={cn(
                'max-w-[82%] rounded-[24px] p-7 text-[15px] shadow-sm border transition-all leading-relaxed', 
                message.role === 'user' 
                    ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none font-medium' 
                    : 'bg-white text-slate-800 border-slate-100 rounded-tl-none shadow-[0_10px_40px_rgba(0,0,0,0.02)]'
              )}>
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    className="prose prose-sm max-w-none prose-p:leading-relaxed prose-table:border prose-table:rounded-2xl prose-th:bg-slate-50 prose-th:p-4 prose-td:p-4"
                >
                    {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                </ReactMarkdown>
              </div>
              {message.role === 'user' && (
                <div className="w-11 h-11 rounded-[14px] bg-slate-50 flex items-center justify-center border border-slate-200 shrink-0 shadow-inner">
                    <User className="h-5 w-5 text-slate-400"/>
                </div>
              )}
            </div>
          ))}

          {/* REAL-TIME AGENT REASONING CLOUD */}
          <div className="space-y-3">{agentStepsView}</div>

          {/* STREAMING TOKEN HANDSHAKE */}
          {isLoading && streamingContent && (
             <div className="flex items-start gap-5 animate-in fade-in slide-in-from-bottom-3">
                <div className="w-11 h-11 rounded-[14px] bg-slate-950 flex items-center justify-center shadow-2xl shrink-0 border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse"/>
                </div>
               <div className="max-w-[82%] rounded-[24px] p-7 text-[15px] bg-white border border-emerald-50/50 rounded-tl-none shadow-[0_20px_60px_rgba(0,0,0,0.04)] relative">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {String(streamingContent)}
                  </ReactMarkdown>
                  <div className="flex items-center gap-3 mt-8 text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" /> Executive Engine Auditing Sector...
                  </div>
               </div>
             </div>
          )}
        </div>
      </ScrollArea>

      {/* FOOTER: COMMAND ENTRY PORTAL */}
      <div className="border-t bg-white p-10 shadow-[0_-25px_80px_rgba(0,0,0,0.05)] relative z-20">
        <form 
          onSubmit={(e) => {
              e.preventDefault();
              if (canSend) handleSubmit(e);
          }} 
          className="flex items-center gap-5 max-w-6xl mx-auto"
        >
          <div className="relative flex-1 group">
              <Input 
                ref={inputRef}
                value={input} 
                onChange={handleInputChange}
                placeholder={!isReady ? "Initializing Neural Identity..." : "Direct Aura to perform forensic audit..."} 
                disabled={isLoading || !isReady} 
                className="h-18 rounded-[20px] bg-slate-50 border-none shadow-inner text-[16px] px-8 focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-all pr-20 font-medium placeholder:text-slate-300 placeholder:italic" 
              />
              <div className="absolute right-7 top-1/2 -translate-y-1/2">
                {isReady ? (
                    <ShieldCheck size={24} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-700" />
                ) : (
                    <Loader2 size={20} className="text-slate-200 animate-spin" />
                )}
              </div>
          </div>
          <Button 
            type="submit" 
            disabled={!canSend} 
            className={cn(
                "h-18 w-18 rounded-[20px] shadow-2xl transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center",
                canSend ? "bg-slate-950 hover:bg-emerald-950" : "bg-slate-100 opacity-30"
            )}
          >
             {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-emerald-400" /> : <Send className="h-8 w-8 text-white" />}
          </Button>
        </form>
        
        <div className="flex items-center justify-between mt-7 max-w-6xl mx-auto px-2">
            <div className="flex gap-6">
                <div className="flex flex-col">
                   <span className="text-[8px] text-slate-400 uppercase font-black tracking-[0.25em]">Sovereign Node</span>
                   <div className="flex items-center gap-2 mt-1">
                      <Globe size={12} className="text-emerald-500" />
                      <span className="font-mono text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                        {businessId ? businessId.toString().substring(0, 18) : '0xNULL'}
                      </span>
                   </div>
                </div>
                <div className="flex flex-col border-l border-slate-100 pl-6">
                   <span className="text-[8px] text-slate-400 uppercase font-black tracking-[0.25em]">Director Identity</span>
                   <div className="flex items-center gap-2 mt-1">
                      <Fingerprint size={12} className="text-sky-500" />
                      <span className="font-mono text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                        {userId ? userId.toString().substring(0, 18) : '0xANON'}
                      </span>
                   </div>
                </div>
            </div>
            <div className="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] text-right leading-relaxed italic">
                Isolated Executive Cloud Environment<br/>Elite Access Protocol • Nak Business
            </div>
        </div>
      </div>
    </div>
  );
}