'use client';

import { FormEvent, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext'; 
import { Sparkles, Send, User, Loader2, Server, Cog, Activity } from 'lucide-react';
import remarkGfm from 'remark-gfm';

/**
 * --- AgentStep Component ---
 * Visualizes Aura's autonomous reasoning loop.
 * Upgraded to show parameters for full transparency.
 */
const AgentStep = ({ data }: { data: any }) => {
    if (!data || !data.event) return null;

    if (data.event === 'on_agent_action') {
        const action = data.data?.data?.[0] || data.data?.[0]; 
        if (!action) return null;
        return (
            <div className="text-xs text-muted-foreground ml-12 my-2 p-3 border rounded-xl bg-slate-50 border-dashed animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin text-emerald-500" />
                    <div>
                        <p className="font-bold uppercase tracking-tighter text-slate-700">
                            Aura Executing: {action?.function?.name || 'Forensic Analysis'}
                        </p>
                        <p className="text-[10px] opacity-70 font-mono truncate max-w-[300px]">
                            Input: {action?.function?.arguments}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (data.event === 'on_tool_end') {
        return (
            <div className="text-[10px] text-muted-foreground ml-12 my-2 p-2 border-l-2 border-emerald-500 bg-emerald-50/30 italic">
                <div className="flex items-center gap-2">
                    <Server className="h-3 w-3" />
                    <span>Observation received from system kernel.</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function MissionControlPage() {
  // CONSUME THE SHARED EXECUTIVE STATE
  const { messages, input, handleInputChange, handleSubmit, isLoading, data, isReady, businessId } = useCopilot();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // High-Precision Auto-scrolling
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTo({
                top: viewport.scrollHeight,
                behavior: 'smooth',
            });
        }
    }
  }, [messages, isLoading, data]);

  // Logic: Process incoming tool-call data chunks
  const agentStepsView = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((chunk: any, i: number) => {
        try {
            const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
            if (parsed.event) return <AgentStep key={`step-${i}`} data={parsed} />;
            return null;
        } catch (e) { return null; }
    }).filter(Boolean);
  }, [data]);

  // Message Streaming Logic
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const streamingContent = isLoading && lastMessage?.role === 'assistant' ? lastMessage.content : null;
  const renderedMessages = isLoading && lastMessage?.role === 'assistant' ? messages.slice(0, -1) : messages;

  const canSend = !isLoading && (input || '').trim().length > 0 && isReady;

  return (
    <div className="flex flex-col h-full bg-white border rounded-2xl shadow-2xl overflow-hidden min-h-[600px]">
      {/* Page Header: Industry DNA */}
      <header className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
              <h1 className="text-sm font-black uppercase tracking-widest text-slate-700">Aura Mission Control</h1>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
              <span>LINK_STATUS: {isReady ? 'ENCRYPTED' : 'INITIALIZING'}</span>
              <span>TENANT_ID: {businessId ? businessId.slice(0, 8) : '----'}</span>
          </div>
      </header>

      <ScrollArea className="flex-1 p-6 bg-slate-50/20" ref={scrollAreaRef}>
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && (
              <div className="py-20 text-center opacity-20 transition-all duration-1000">
                  <Sparkles size={64} className="mx-auto mb-4 animate-pulse text-primary" />
                  <p className="text-xs font-black uppercase tracking-[0.4em]">Awaiting Forensic Instructions</p>
              </div>
          )}

          {/* Past Conversation */}
          {renderedMessages.map((message: any) => ( 
            <div key={message.id} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'assistant' && (
                <Avatar className="h-9 w-9 border-2 border-emerald-100 shadow-sm">
                    <AvatarFallback className="bg-slate-900 text-white">
                        <Sparkles className="h-4 w-4 text-emerald-400"/>
                    </AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                'max-w-[85%] rounded-2xl p-4 text-sm prose dark:prose-invert shadow-sm border transition-all', 
                message.role === 'user' 
                    ? 'bg-primary text-primary-foreground border-primary rounded-tr-none' 
                    : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                </ReactMarkdown>
              </div>
              {message.role === 'user' && (
                <Avatar className="h-9 w-9 border-2 border-slate-100 shadow-sm">
                    <AvatarFallback className="bg-slate-100 text-slate-600">
                        <User className="h-4 w-4"/>
                    </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Autonomous Thought Process */}
          {agentStepsView}

          {/* Active Stream */}
          {isLoading && streamingContent && (
             <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
               <Avatar className="h-9 w-9 border-2 border-emerald-100">
                   <AvatarFallback className="bg-slate-900 text-white">
                       <Sparkles className="h-4 w-4 text-emerald-400"/>
                   </AvatarFallback>
               </Avatar>
               <div className={cn('max-w-[85%] rounded-2xl p-4 text-sm prose dark:prose-invert bg-white border border-emerald-100 rounded-tl-none shadow-sm')}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(streamingContent)}</ReactMarkdown>
                  <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Aura is synthesizing data...
                  </div>
               </div>
             </div>
          )}
          
          {!isReady && (
            <div className="text-center py-20">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-200" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Initializing Neural Link...</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Control Input */}
      <div className="border-t bg-white p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <form 
          onSubmit={(e) => {
              e.preventDefault();
              if (canSend) handleSubmit(e);
          }} 
          className="flex items-center gap-3 max-w-4xl mx-auto"
        >
          <Input 
            value={input} 
            onChange={handleInputChange}
            placeholder={!isReady ? "Establishing Secure Link..." : "Ask Aura to audit your ledger..."} 
            disabled={!isReady || isLoading} 
            className="flex-1 h-14 rounded-2xl bg-slate-50 border-none shadow-inner text-base px-6 focus-visible:ring-emerald-500 transition-all" 
          />
          <Button 
            type="submit" 
            disabled={!canSend} 
            className="h-14 w-14 rounded-2xl shadow-xl bg-slate-900 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
          >
             {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
      </div>
    </div>
  );
}