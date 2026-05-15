'use client';

/**
 * --- BBU1 SOVEREIGN MISSION CONTROL ---
 * VERSION: v14.5 Master Sovereign Edition (THE OMEGA WELD)
 * 
 * CORE UPGRADES:
 * 1. UNBLOCKED HANDSHAKE: Input actives immediately upon User ID verification.
 * 2. IDENTITY SAFETY: Null-safe UUID slicing for Samuel Oyat / Nak Business.
 * 3. AGENT SATURATION: Deep-links to the v14.5 Recursive Healing Kernel.
 * 4. VISUAL HARMONY: Retained high-density forensic scan animations.
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
  Presentation, AlertTriangle, LayoutGrid, Terminal, Globe, Lock
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import remarkGfm from 'remark-gfm';

// ✅ SOVEREIGN LINK: The visual stage for the Executive Council
import AuraBoardroom from '@/components/copilot/AuraBoardroom'; 

/**
 * AgentStep Component
 * Visualizes Aura's autonomous reasoning loop.
 */
const AgentStep = ({ data }: { data: any }) => {
    if (!data) return null;

    try {
        const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};
        
        if (outputData.action === "navigate") {
            return (
                <div className="text-xs text-sky-500 ml-12 my-2 p-3 border rounded-xl bg-sky-500/5 border-sky-500/20 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 animate-spin-slow" />
                        <div>
                            <p className="font-bold uppercase tracking-tighter text-sky-600">Sovereign Navigation</p>
                            <p className="text-[10px] opacity-70 font-mono text-sky-700">Focus: {outputData.payload?.url}</p>
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
                            <p className="text-[10px] opacity-70 text-emerald-600">File: {outputData.payload?.fileName}</p>
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
                            <p className="font-bold uppercase tracking-tighter text-blue-700">Boardroom Stage Ready</p>
                            <p className="text-[10px] opacity-70 italic text-blue-600">Assembling visual data for Director review...</p>
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
            <div className="text-xs text-muted-foreground ml-12 my-2 p-3 border rounded-xl bg-slate-50 border-dashed animate-in fade-in slide-in-from-left-2 shadow-inner">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin text-emerald-500" />
                    <div>
                        <p className="font-bold uppercase tracking-tighter text-slate-700">Council Task: {toolName}</p>
                        <p className="text-[10px] opacity-50 font-mono truncate max-w-[400px]">Args: {args}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (data.event === 'on_tool_end' || (data.output && data.output.length < 500)) {
        const obs = data.data?.output || data.output || "Observation synchronized.";
        return (
            <div className="text-[10px] text-muted-foreground ml-12 my-2 p-2 border-l-2 border-emerald-500 bg-emerald-50/30 italic animate-in fade-in">
                <div className="flex items-center gap-2">
                    <Server className="h-3 w-3 text-emerald-600 opacity-50" />
                    <span className="font-mono text-emerald-800">{typeof obs === 'string' ? obs.substring(0, 100) : "Forensic data received."}...</span>
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

  // SIDE-EFFECT HANDLER
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

  // SCROLL SYNC
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, data]);

  // FOCUS CONTROL
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
    <div className="flex flex-col h-full bg-white border rounded-3xl shadow-2xl overflow-hidden min-h-[700px] border-slate-100 relative">
      
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

      <header className="px-8 py-5 border-b bg-slate-950 text-white flex items-center justify-between shrink-0 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Fingerprint size={120} className="text-emerald-500" />
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Activity className="h-6 w-6 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-50 italic">Aura Mission Control</h1>
                <p className="text-[10px] text-slate-400 font-mono mt-1 tracking-widest uppercase">Autonomous C-Suite Kernel</p>
              </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono relative z-10">
              <div className="hidden md:flex flex-col items-end mr-4">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-3 py-0.5 rounded-full text-[8px] font-black tracking-widest mb-1">
                   OMEGA PROTOCOL v14.5
                </Badge>
                {/* NULL-SAFE UUID Slicing */}
                <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                  VAULT: {businessId ? businessId.toString().substring(0, 16) : 'LINKING...'}
                </p>
              </div>
              <div className="h-10 w-px bg-slate-800" />
              <div className="flex flex-col items-center ml-4">
                <span className={cn("h-2.5 w-2.5 rounded-full mb-1", isReady ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse")}></span>
                <span className="text-[9px] font-black uppercase text-slate-400">{isReady ? 'Active' : 'Syncing'}</span>
              </div>
          </div>
      </header>

      <ScrollArea className="flex-1 p-8 bg-slate-50/20" ref={scrollAreaRef}>
        <div className="space-y-8 max-w-4xl mx-auto pb-12">
          
          {/* Standby State */}
          {isReady && messages.length === 0 && (
              <div className="py-32 text-center animate-in fade-in duration-1000">
                  <div className="relative inline-block mb-6">
                    <Sparkles size={80} className="text-slate-900 opacity-10 animate-pulse" />
                    <ShieldCheck size={32} className="absolute bottom-0 right-0 text-emerald-500" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-slate-400">Awaiting Executive Directive</p>
              </div>
          )}

          {/* Sync Loader */}
          {!isReady && (
            <div className="text-center py-40 animate-in fade-in">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-500 mb-6" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Establishing Sovereignty...</p>
            </div>
          )}

          {/* Messages */}
          {isReady && renderedMessages.map((message: any) => ( 
            <div key={message.id} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-2')}>
              {message.role === 'assistant' && (
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shrink-0 border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400"/>
                </div>
              )}
              <div className={cn(
                'max-w-[80%] rounded-3xl p-6 text-[14px] shadow-sm border transition-all leading-relaxed', 
                message.role === 'user' 
                    ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none' 
                    : 'bg-white text-slate-800 border-slate-100 rounded-tl-none shadow-inner'
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none prose-p:leading-relaxed prose-table:border prose-table:rounded-xl">
                    {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                </ReactMarkdown>
              </div>
              {message.role === 'user' && (
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                    <User className="h-5 w-5 text-slate-500"/>
                </div>
              )}
            </div>
          ))}

          <div className="space-y-2">{agentStepsView}</div>

          {isLoading && streamingContent && (
             <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shrink-0 border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400"/>
                </div>
               <div className="max-w-[80%] rounded-3xl p-6 text-[14px] bg-white border border-emerald-100 rounded-tl-none shadow-xl">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {String(streamingContent)}
                  </ReactMarkdown>
                  <div className="flex items-center gap-3 mt-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" /> Audit engine active...
                  </div>
               </div>
             </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-white p-8 shadow-[0_-10px_50px_rgba(0,0,0,0.04)] relative z-20">
        <form 
          onSubmit={(e) => {
              e.preventDefault();
              if (canSend) handleSubmit(e);
          }} 
          className="flex items-center gap-4 max-w-5xl mx-auto"
        >
          <div className="relative flex-1 group">
              <Input 
                ref={inputRef}
                value={input} 
                onChange={handleInputChange}
                placeholder={!isReady ? "Aligning Neural Channels..." : "Command Aura-[Agent] to perform forensic audit..."} 
                disabled={isLoading || !isReady} 
                className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner text-[15px] px-8 focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all pr-16" 
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <ShieldCheck size={20} className={cn("transition-all duration-700", isReady ? "text-emerald-500" : "text-slate-300")} />
              </div>
          </div>
          <Button 
            type="submit" 
            disabled={!canSend} 
            className={cn(
                "h-16 w-16 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 shrink-0",
                canSend ? "bg-slate-950 hover:bg-slate-800" : "bg-slate-100 opacity-40"
            )}
          >
             {isLoading ? <Loader2 className="h-7 w-7 animate-spin text-emerald-500" /> : <Send className="h-7 w-7 text-white" />}
          </Button>
        </form>
        
        <div className="flex items-center justify-between mt-5 max-w-5xl mx-auto">
            <div className="flex gap-4">
                <div className="flex flex-col">
                   <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Linked Node</span>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Globe size={10} className="text-emerald-500" />
                      <span className="font-mono text-[9px] text-slate-500">
                        {businessId ? businessId.toString().substring(0, 18) : '0xNULL'}
                      </span>
                   </div>
                </div>
                <div className="flex flex-col border-l pl-4">
                   <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Identity UUID</span>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Fingerprint size={10} className="text-sky-500" />
                      <span className="font-mono text-[9px] text-slate-500">
                        {userId ? userId.toString().substring(0, 18) : '0xANON'}
                      </span>
                   </div>
                </div>
            </div>
            <div className="text-[8px] font-black uppercase text-slate-300 tracking-[0.2em] italic">
                Isolated Executive Environment • Sovereignty v14.5
            </div>
        </div>
      </div>
    </div>
  );
}