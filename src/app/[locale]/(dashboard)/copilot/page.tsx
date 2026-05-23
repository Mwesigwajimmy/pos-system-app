'use client';

/**
 * --- BBU1 SOVEREIGN MISSION CONTROL ---
 * VERSION: v24.1 OMEGA-ULTIMATUM (THE APEX PROTOCOL SEAL)
 * JURISDICTION: Global ERP / Director Level / Multi-Node
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. ATOMIC SUBMISSION BRIDGE: Refactored the form to extract raw text before 
 *    calling context. This bypasses the 'w/j is not a function' SDK crash caused 
 *    by React 19 event-pooling changes.
 * 2. PROTOCOL ALIGNMENT: Wired the AgentStep and ThoughtCloud to render 
 *    the v23.1 Backend protocol (0: text, 8: metadata).
 * 3. HYDRATION SHIELD: Hardened the 'identityIsAnchored' logic to ensure 
 *    UI activation occurs the millisecond the forensic handshake is READY.
 * 4. INCOGNITO OPTIMIZATION: Refined session lookup to prioritize physical 
 *    UUID anchors over fragmented cookies.
 */

import { useEffect, useRef, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext'; 
import { 
  Sparkles, Send, User, Loader2, Server, Cog, 
  Activity, Compass, FileDown, Fingerprint, ShieldCheck,
  Presentation, Terminal, Globe, Lock,
  Wifi, WifiOff
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import remarkGfm from 'remark-gfm';

// ✅ SOVEREIGN LINK: The visual stage for the Executive Council
import AuraBoardroom from '@/components/copilot/AuraBoardroom'; 

/**
 * AgentStep Component
 * Visualizes Aura's autonomous reasoning loop during processing.
 */
const AgentStep = ({ data }: { data: any }) => {
    if (!data) return null;

    try {
        const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};
        
        const actionConfigs: Record<string, { icon: any, color: string, label: string }> = {
            navigate: { icon: Compass, color: "text-sky-500 bg-sky-500/5 border-sky-500/20", label: "Sovereign Navigation" },
            download_file: { icon: FileDown, color: "text-emerald-500 bg-emerald-500/5 border-emerald-500/20", label: "Forensic Buffer Generated" },
            prepare_boardroom_presentation: { icon: Presentation, color: "text-blue-500 bg-blue-500/5 border-blue-500/20", label: "Boardroom Initialized" }
        };

        const config = actionConfigs[outputData.action];

        if (config) {
            const Icon = config.icon;
            return (
                <div className={cn("text-xs ml-12 my-2 p-3 border rounded-xl animate-in fade-in slide-in-from-left-2", config.color)}>
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 animate-pulse" />
                        <div>
                            <p className="font-bold uppercase tracking-tighter">{config.label}</p>
                            <p className="text-[10px] opacity-70 font-mono">{outputData.payload?.url || outputData.payload?.fileName || "Executing protocol..."}</p>
                        </div>
                    </div>
                </div>
            );
        }
    } catch (e) { }

    if (data.event === 'on_agent_action' || data.tool) {
        const toolName = data.tool || data.data?.tool || 'Forensic Analysis';
        return (
            <div className="text-xs text-muted-foreground ml-12 my-2 p-3 border rounded-xl bg-slate-50/50 border-dashed animate-in fade-in slide-in-from-left-2 shadow-sm">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin text-emerald-500" />
                    <div>
                        <p className="font-bold uppercase tracking-tighter text-slate-700">Executive Handshake: {toolName.replace(/_/g, ' ')}</p>
                        <p className="text-[9px] opacity-50 font-mono italic">Aura is seating context in the vault...</p>
                    </div>
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
    isLoading, data: streamData, isReady, businessId, userId, tenantData 
  } = useCopilot();

  // SYSTEM ACTIONS ORCHESTRATOR
  useEffect(() => {
    if (streamData && streamData.length > 0) {
      const lastChunk = streamData[streamData.length - 1];
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
  }, [streamData, router]);

  // AUTO-SCROLL
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, streamData]);

  useEffect(() => {
    if (isReady && inputRef.current) inputRef.current.focus();
  }, [isReady]);

  const identityIsAnchored = useMemo(() => {
    return (!!userId && userId !== '') && (!!businessId && businessId !== '');
  }, [userId, businessId]);

  /**
   * ✅ ATOMIC SUBMISSION FIX:
   * We intercept the form event and pass ONLY the string 'cleanContent'.
   * This physically bypasses the SDK's internal React 19 event parsing crash.
   */
  const onAttemptSubmit = (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanContent = (input || '').trim();
    
    if (cleanContent.length > 0 && !isLoading && identityIsAnchored) {
        handleSubmit(cleanContent); // 🛡️ Passing raw string bridge
    }
  };

  const agentStepsView = useMemo(() => {
    if (!streamData || !Array.isArray(streamData)) return [];
    return streamData.map((chunk: any, i: number) => {
        try {
            const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
            if (parsed.event === 'on_chat_model_stream') return null;
            return <AgentStep key={`step-${i}`} data={parsed} />;
        } catch (e) { return null; }
    }).filter(Boolean);
  }, [streamData]);

  const canSend = !isLoading && (input || '').trim().length > 0 && identityIsAnchored;

  return (
    <div className="flex flex-col h-full bg-white border rounded-[32px] shadow-[0_32px_120px_rgba(0,0,0,0.1)] overflow-hidden min-h-[750px] border-slate-100 relative">
      
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
                <p className="text-[10px] text-slate-500 font-mono mt-1.5 tracking-[0.2em] uppercase">Sovereign Executive Kernel v24.1</p>
              </div>
          </div>

          <div className="flex items-center gap-6 relative z-10">
              <div className="hidden lg:flex flex-col items-end">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-4 py-1 rounded-full text-[9px] font-black tracking-[0.2em] mb-2 shadow-sm">
                   OMEGA LINK • ACTIVE
                </Badge>
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
                    identityIsAnchored ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" : "bg-amber-500 animate-pulse"
                )}></span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {identityIsAnchored ? "ACTIVE" : "SYNCING"}
                </span>
              </div>
          </div>
      </header>

      <ScrollArea className="flex-1 p-10 bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:32px_32px]" ref={scrollAreaRef}>
        <div className="space-y-10 max-w-5xl mx-auto pb-20">
          
          {identityIsAnchored && messages.length === 0 && (
              <div className="py-40 text-center animate-in fade-in duration-1000">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative inline-block mb-8">
                    <Sparkles size={100} className="text-slate-900 opacity-[0.03] animate-pulse" />
                    <ShieldCheck size={40} className="absolute bottom-0 right-0 text-emerald-500 drop-shadow-xl" />
                  </motion.div>
                  <h2 className="text-sm font-black uppercase tracking-[0.8em] text-slate-300">Awaiting Executive Directive</h2>
              </div>
          )}

          {!identityIsAnchored && (
            <div className="text-center py-48 animate-in fade-in zoom-in duration-700">
                <Loader2 className="h-20 w-20 animate-spin mx-auto text-emerald-500/20 mb-10" />
                <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-[0.4em]">Awaiting Forensic Protocol</h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] italic mt-4">
                   Synchronizing neural links...
                </p>
            </div>
          )}

          {messages.map((message: any) => ( 
            <div key={message.id} className={cn('flex items-start gap-5', message.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-4 duration-500')}>
              {message.role === 'assistant' && (
                <div className="w-11 h-11 rounded-[14px] bg-slate-950 flex items-center justify-center shadow-2xl shrink-0 border border-emerald-500/20 relative overflow-hidden group">
                    <Sparkles className="h-5 w-5 text-emerald-400 z-10"/>
                    <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                </div>
              )}
              <div className={cn(
                'max-w-[82%] rounded-[24px] p-7 text-[15px] shadow-sm border transition-all leading-relaxed', 
                message.role === 'user' ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none' : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {message.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          <div className="space-y-3">{agentStepsView}</div>

          {isLoading && messages[messages.length-1]?.role === 'assistant' && (
             <div className="flex items-start gap-5 animate-in fade-in slide-in-from-bottom-3">
                <div className="w-11 h-11 rounded-[14px] bg-slate-950 flex items-center justify-center border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse"/>
                </div>
               <div className="max-w-[82%] rounded-[24px] p-7 text-[15px] bg-white border border-emerald-50/50 rounded-tl-none shadow-sm relative">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {messages[messages.length-1].content}
                  </ReactMarkdown>
                  <div className="flex items-center gap-3 mt-8 text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" /> Auditing Node Buffer...
                  </div>
               </div>
             </div>
          )}
        </div>
      </ScrollArea>

      <footer className="border-t bg-white p-10 shadow-[0_-25px_80px_rgba(0,0,0,0.05)] relative z-20">
        <form onSubmit={onAttemptSubmit} className="flex items-center gap-5 max-w-6xl mx-auto">
          <div className="relative flex-1 group">
              <Input 
                ref={inputRef}
                value={input} 
                onChange={handleInputChange}
                placeholder={!identityIsAnchored ? "Establishing Handshake..." : "Direct Aura to perform forensic audit..."} 
                disabled={isLoading || !identityIsAnchored} 
                className="h-18 rounded-[20px] bg-slate-50 border-none shadow-inner text-[16px] px-8 focus-visible:ring-2 focus-visible:ring-emerald-500/50" 
              />
              <div className="absolute right-7 top-1/2 -translate-y-1/2">
                {identityIsAnchored ? <ShieldCheck size={24} className="text-emerald-500" /> : <Loader2 size={20} className="text-slate-200 animate-spin" />}
              </div>
          </div>
          <Button 
            type="submit" 
            disabled={!canSend} 
            className={cn("h-18 w-18 rounded-[20px] shadow-2xl transition-all", canSend ? "bg-slate-950 hover:bg-emerald-950" : "bg-slate-100 opacity-30")}
          >
             {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-emerald-400" /> : <Send className="h-8 w-8 text-white" />}
          </Button>
        </form>
        
        <div className="flex items-center justify-between mt-7 max-w-6xl mx-auto px-2">
            <div className="flex gap-6">
                <div className="flex flex-col">
                   <span className="text-[8px] text-slate-400 uppercase font-black tracking-[0.25em]">Sovereign Node</span>
                   <span className="font-mono text-[10px] text-slate-600 mt-1">{businessId ? businessId.toString().substring(0, 18) : '0xNULL'}</span>
                </div>
                <div className="flex flex-col border-l border-slate-100 pl-6">
                   <span className="text-[8px] text-slate-400 uppercase font-black tracking-[0.25em]">Director Identity</span>
                   <span className="font-mono text-[10px] text-slate-600 mt-1">{userId ? userId.toString().substring(0, 18) : '0xANON'}</span>
                </div>
            </div>
            <div className="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] text-right italic">
                Isolated Executive Environment<br/>Elite Protocol • Nak Business
            </div>
        </div>
      </footer>
    </div>
  );
}