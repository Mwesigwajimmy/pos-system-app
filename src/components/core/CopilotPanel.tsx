'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT PANEL ---
 * VERSION: v12.3 Sovereign Edition (FORENSIC CONSOLE)
 * 
 * UPGRADES:
 * 1. DYNAMIC STANDBY: Visual "Wake" sequence when IDs are linked.
 * 2. AGENT SHADOWS: Enhanced "Thought" rendering for autonomous agents.
 * 3. IDENTITY ANCHORS: Hard-linked to verified Supabase Profile UUIDs.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, Cog, Server, 
  FileDown, Pilcrow, Compass, Fingerprint, Zap, Activity, ShieldCheck,
  Presentation, AlertTriangle, Cpu, Terminal
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
 * Renders high-density 'Forensic Thoughts' during the audit stream.
 */
const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  if (!data) return null;
  
  try {
    const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};
    
    // UI Side-Effect Triggers
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
            <Icon className="h-4 w-4 flex-shrink-0" />
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

  if (data.tool) {
    return (
      <div className="text-[10px] text-muted-foreground ml-11 my-2 p-3 border rounded-xl bg-slate-50 border-dashed relative">
        <div className="flex items-center gap-2">
          <Cpu className="h-3 w-3 animate-pulse text-slate-400" />
          <div>
            <p className="font-bold uppercase tracking-widest text-slate-500 text-[8px]">Agent Authority: {data.tool}</p>
            <p className="opacity-50 truncate max-w-[240px] font-mono">{JSON.stringify(data.toolInput)}</p>
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
    messages, input, handleInputChange, handleSubmit, 
    isLoading: isChatLoading, data: streamData, 
    isReady: isContextReady, businessId, userId
  } = useCopilot();

  // Side-Effect Orchestrator (Navigation, Downloads, Boardroom)
  useEffect(() => {
    if (streamData && streamData.length > 0) {
      const lastChunk = streamData[streamData.length - 1];
      try {
        const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;
        if (parsed.event === 'on_tool_end' && parsed.data?.output) {
          const output = typeof parsed.data.output === 'string' ? JSON.parse(parsed.data.output) : parsed.data.output;
          
          if (output.action === "navigate") router.push(output.payload.url);
          if (output.action === "download_file") downloadFileFromBase64(output.payload.fileName, output.payload.mimeType, output.payload.content);
          if (output.action === "prepare_boardroom_presentation") setBoardroomData(output.payload);
        }
      } catch (e) { }
    }
  }, [streamData, router]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading, streamData]);

  const canSend = !isChatLoading && (input || '').trim().length > 0;

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden shadow-2xl border-l relative font-sans">
      
      {/* 🚀 OMEGA BOARDROOM LAYER */}
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
                Aura Intelligence
            </h2>
            <div className="flex items-center gap-2">
               {isContextReady && <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[8px] px-2 py-0.5">ENCRYPTED NODE</Badge>}
               <Badge className="bg-slate-800 text-slate-500 text-[8px] border-none px-2 py-0.5 uppercase">v10.8 PRO</Badge>
            </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
           <Terminal size={10} className="text-emerald-500/50" />
           <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.3em]">Autonomous Executive Kernel</p>
        </div>
      </header>
      
      <ScrollArea className="flex-grow p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] bg-slate-50/50">
        <div className="space-y-6 max-w-2xl mx-auto">
            
            {/* 1. INITIALIZING STATE */}
            {!isContextReady && messages.length === 0 && (
                <div className="py-32 text-center animate-pulse">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-500/40 mb-6" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Linking Neural C-Suite...</p>
                </div>
            )}

            {/* 2. STANDBY STATE (READY BUT IDLE) */}
            {isContextReady && messages.length === 0 && (
                <div className="py-24 text-center group">
                    <div className="relative inline-block mb-8">
                       <Bot size={80} className="mx-auto text-slate-200 group-hover:text-emerald-500/20 transition-colors duration-1000" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Activity className="text-emerald-500/10 animate-pulse h-10 w-10" />
                       </div>
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.6em] text-slate-300 group-hover:text-slate-400 transition-colors">Awaiting Executive Directive</h3>
                    <p className="text-[9px] text-slate-400 mt-4 font-mono opacity-0 group-hover:opacity-100 transition-opacity">Sovereign Node ${businessId?.slice(0,8)} Standby...</p>
                </div>
            )}

            {/* 3. MESSAGE STREAM */}
            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex items-start gap-4', m.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-2')}>
                {m.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-xl shrink-0 border border-emerald-500/20 relative group">
                    <Sparkles className="h-5 w-5 text-emerald-400 group-hover:rotate-12 transition-transform" />
                    <div className="absolute inset-0 bg-emerald-500/5 animate-pulse rounded-2xl" />
                  </div>
                )}
                <div className={cn(
                    'rounded-2xl p-5 max-w-[85%] text-[13px] shadow-md border transition-all leading-relaxed',
                    m.role === 'user' 
                        ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none' 
                        : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                )}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    className="prose prose-sm max-w-none prose-p:leading-relaxed prose-table:border prose-table:rounded-lg prose-th:bg-slate-50 prose-th:p-2 prose-td:p-2 prose-td:border-t"
                  >
                    {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                  </ReactMarkdown>
                </div>

                {m.role === 'user' && (
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {/* 4. AGENT THOUGHT CLOUD */}
            {isChatLoading && streamData && streamData.length > 0 && (
                <div className="space-y-1 mt-4">
                    {streamData.map((chunk: any, i: number) => (
                        <AgentStep key={`thought-${i}`} data={chunk.data || chunk} />
                    ))}
                </div>
            )}

            {isChatLoading && (
                <div className="flex items-center gap-3 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-14 py-4">
                    <Loader2 className="h-3 w-3 animate-spin" /> Audit engine executing strategic scan...
                </div>
            )}

            <div ref={scrollRef} className="h-20" />
        </div>
      </ScrollArea>
      
      <footer className="p-6 border-t bg-white shrink-0 shadow-[0_-20px_60px_rgba(0,0,0,0.03)] relative z-20">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }} 
          className="flex items-center gap-3"
        >
          <div className="relative flex-grow">
            <Input 
              ref={inputRef}
              value={input || ''} 
              onChange={handleInputChange} 
              placeholder={!isContextReady ? "Synchronizing Context..." : "Direct Aura to perform forensic analysis..."} 
              className="h-14 rounded-2xl bg-slate-50 border-slate-100 shadow-inner focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/50 transition-all text-[15px] px-6 pr-12"
              disabled={isChatLoading || !isContextReady}
            />
            {isChatLoading && <div className="absolute right-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
          </div>
          <Button 
            type="submit" 
            size="icon" 
            disabled={!canSend} 
            className={cn(
                "h-14 w-14 rounded-2xl shadow-xl transition-all shrink-0 active:scale-95",
                canSend ? "bg-slate-950 hover:bg-emerald-950 text-white" : "bg-slate-50 text-slate-300"
            )}
          >
            {isChatLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
        
        <div className="flex justify-between items-center mt-6 px-1 border-t pt-4 border-slate-50">
            <div className="flex gap-4">
                <div className="flex flex-col">
                   <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Business Linked</span>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Activity size={10} className="text-emerald-500" />
                      <span className="font-mono text-[9px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {businessId ? businessId.substring(0, 18) : '0xNULL'}
                      </span>
                   </div>
                </div>
                <div className="flex flex-col border-l pl-4">
                   <span className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Forensic ID</span>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Fingerprint size={10} className="text-sky-500" />
                      <span className="font-mono text-[9px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {userId ? userId.substring(0, 18) : '0xANON'}
                      </span>
                   </div>
                </div>
            </div>
            <div className="text-[8px] uppercase tracking-widest font-black text-slate-300 text-right leading-tight italic">
                Sovereign Cloud Native<br/>Executive Access Protocol
            </div>
        </div>
      </footer>

      {/* Global CSS for the Scan Line Animation */}
      <style jsx global>{`
        @keyframes scan {
          from { top: -100%; }
          to { top: 100%; }
        }
      `}</style>
    </div>
  );
}