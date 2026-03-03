'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, Cog, Server, 
  FileDown, Pilcrow, Compass, Fingerprint, Zap, Activity 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';
import { useCopilot } from '@/context/CopilotContext'; 

// --- Component: AgentStep (Original Logic Preserved) ---
const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  try {
    const outputData = data.output ? JSON.parse(data.output) : {};
    if (outputData.action === "navigate") {
        return (
          <div className="text-xs text-sky-500 ml-11 my-2 p-3 border rounded-md bg-sky-500/10 border-sky-500/20 animate-pulse">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4" />
              <div>
                <p className="font-bold uppercase tracking-tighter">Autonomous Navigation</p>
              </div>
            </div>
          </div>
        );
    }
  } catch (e) { }

  if (data.tool) {
    return (
      <div className="text-[10px] text-muted-foreground ml-11 my-2 p-3 border rounded-md bg-slate-50 border-dashed">
        <div className="flex items-center gap-2">
          <Cog className="h-3 w-3 animate-spin text-emerald-600" />
          <div>
            <p className="font-bold uppercase tracking-widest text-slate-600">Executing: {data.tool}</p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// --- Main Panel ---
export default function CopilotPanel() {
  // Pulling state from the Shared Context
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading, 
    data, 
    businessId, 
    isReady 
  } = useCopilot();
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic for deep forensic logs
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  /**
   * NEURAL UNLOCK FIX: 
   * We allow sending if businessId exists, even if isReady is still hydrating.
   * This prevents the "Permanently Disabled" issue.
   */
  const canSend = !isLoading && (businessId || isReady) && (input || '').trim().length > 0;
  const isInputDisabled = isLoading || (!businessId && !isReady);

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      {/* Forensic Header: Identity Preserved */}
      <header className="p-6 border-b bg-slate-950 text-white flex flex-col gap-1 shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter italic text-emerald-400">
                <Fingerprint className="h-5 w-5 animate-pulse"/> Aura Intelligence
            </h2>
            <Badge className="bg-emerald-600 text-[8px] border-none px-2 py-0.5">v10.5 PRO</Badge>
        </div>
        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Autonomous Forensic Co-Pilot</p>
      </header>
      
      {/* Message Feed */}
      <ScrollArea className="flex-grow p-4 bg-slate-50/30">
        <div className="space-y-6">
            {messages.length === 0 && (
                <div className="py-20 text-center opacity-20 transition-all duration-1000">
                    <Bot size={64} className="mx-auto mb-4 animate-bounce" />
                    <p className="text-xs font-black uppercase tracking-[0.4em]">Awaiting Forensic Command</p>
                </div>
            )}

            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex items-start gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shrink-0 border border-emerald-500/20">
                    <Zap className="h-5 w-5 text-emerald-400 fill-current" />
                  </div>
                )}
                <div className={cn(
                    'rounded-2xl p-4 max-w-[85%] text-sm shadow-sm border transition-all',
                    m.role === 'user' 
                        ? 'bg-primary text-primary-foreground border-primary rounded-tr-none' 
                        : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                )}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                  </ReactMarkdown>
                </div>

                {m.role === 'user' && (
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center border shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Tool Execution Visualization */}
            {isLoading && data && data.length > 0 && (
                <div className="space-y-2">
                    {data.map((chunk: any, i: number) => (
                        <AgentStep key={`step-${i}`} data={chunk} />
                    ))}
                </div>
            )}

            {isLoading && (
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-11 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Aura is processing sector data...
                </div>
            )}

            <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>
      
      {/* Input Section: Handshake Logic Updated */}
      <div className="p-4 border-t bg-white shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) handleSubmit(e);
          }} 
          className="flex items-center gap-2"
        >
          <Input 
            value={input} 
            onChange={handleInputChange} 
            placeholder={isInputDisabled ? "Initializing Neural Link..." : "Ask Aura to analyze ledger drift..."} 
            className="h-12 rounded-xl bg-slate-50 border-none shadow-inner focus-visible:ring-emerald-500"
            disabled={isInputDisabled}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!canSend} 
            className="h-12 w-12 rounded-xl shadow-xl bg-slate-950 hover:bg-slate-800 transition-all shrink-0"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
        
        {/* Footer: Multi-Tenant Sovereignty Display */}
        <div className="flex justify-between items-center mt-3 px-1">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-muted-foreground">
                <Activity className="h-3 w-3 text-emerald-500" /> 
                Neural Link: <span className="font-mono text-emerald-600 font-bold">{businessId ? businessId.slice(0, 12) : 'OFFLINE'}</span>
            </div>
            <div className="text-[8px] uppercase tracking-tighter font-bold text-slate-300">
                Secure Forensic Context Isolated
            </div>
        </div>
      </div>
    </div>
  );
}