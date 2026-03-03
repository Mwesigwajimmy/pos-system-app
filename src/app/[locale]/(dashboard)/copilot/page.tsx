'use client';

import { useState, FormEvent, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Vercel AI SDK Imports (The Core) ---
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
// --- Custom Hook for REAL Business Context ---
import { useUserProfile } from '@/hooks/useUserProfile';
// --- Lucide Icons for Agent Steps ---
import { Sparkles, Send, User, Loader2, Server, Cog } from 'lucide-react';

// --- AgentStep Component (Renders the real-time tool execution) ---
const AgentStep = ({ data }: { data: any }) => {
    // FIX: Added safety check to ensure data and event exist
    if (!data || !data.event) return null;

    if (data.event === 'on_agent_action') {
        const action = data.data?.data?.[0] || data.data?.[0]; 
        if (!action) return null;
        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-accent">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin" />
                    <div>
                        <p className="font-semibold">Tool Call: `{action?.function?.name || 'Unknown'}`</p>
                        <p>Input: `{action?.function?.arguments || '{}'}`</p>
                    </div>
                </div>
            </div>
        );
    }
    if (data.event === 'on_tool_end') {
        const observation = data.data?.output;
        if (!observation) return null;
        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-accent">
                <div className="flex items-center gap-2"><Server className="h-4 w-4" /><p className="font-semibold">Observation Received</p></div>
                <pre className="mt-2 p-2 bg-background/50 rounded-md text-xs whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                    <code>{
                        (() => {
                            try {
                                const parsed = typeof observation === 'string' ? JSON.parse(observation) : observation;
                                const pretty = JSON.stringify(parsed, null, 2);
                                return pretty.length > 500 ? pretty.substring(0, 500) + '\n...' : pretty;
                            } catch {
                                return String(observation).length > 500 ? String(observation).substring(0, 500) + '...' : String(observation);
                            }
                        })()
                    }</code>
                </pre>
            </div>
        );
    }
    return null;
};

export default function MissionControlPage() {
  // --- REAL DATA: Get Business Context ---
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  // FIX: Ensure these have fallback values to prevent undefined errors in the API body
  const businessId = (userProfile as any)?.business_id || '';
  const userId = (userProfile as any)?.id || '';

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // --- useChat Hook Integration ---
  const chat: any = useChat({
    api: '/api/chat', 
    body: { businessId, userId }, 
    experimental_streamData: true, 
    onError: (err: Error) => {
      console.error("Aura Stream Error:", err);
      toast.error(`Neural Link Error: ${err.message}`);
    },
  } as any); 
  
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading: isChatLoading, 
    data
  } = chat;

  // FIX: Robust scrolling logic
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages, data, isChatLoading]);
  
  const agentSteps = useMemo(() => {
      if (!data || !Array.isArray(data)) return [];
      return data.map((chunk: any, i: number) => { 
          try { 
              // Safety: data chunks can be objects or strings depending on provider
              const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
              if(parsed && parsed.event) return <AgentStep key={`step-${i}-${parsed.event}`} data={parsed} />; 
              return null;
          } catch (e) { 
              return null;
          }
      }).filter(Boolean);
  }, [data]);
  
  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSend) return;
      handleSubmit(event);
  };
  
  // FIX: Safe access to the last message content
  const streamingContent = isChatLoading && messages.length > 0 
    ? (messages[messages.length - 1] as CoreMessage).content 
    : null;

  const renderedMessages = isChatLoading && messages.length > 0 
    ? messages.slice(0, -1) 
    : messages;

  // UI States
  const canSend = !isChatLoading && input && input.trim() && businessId;
  const isDisabled = isChatLoading || isProfileLoading || !businessId;

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6 pb-4">
          {renderedMessages.map((message: any) => ( 
            <div key={message.id} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-slate-950">
                    <Sparkles className="h-4 w-4 text-emerald-400"/>
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                'max-w-[85%] rounded-2xl p-4 text-sm prose dark:prose-invert shadow-sm border', 
                message.role === 'user' ? 'bg-primary text-primary-foreground border-primary rounded-tr-none' : 'bg-muted border-border rounded-tl-none'
              )}>
                <ReactMarkdown>
                    {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                </ReactMarkdown>
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-accent text-accent-foreground">U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {/* Renders Cog wheels and Tool Observations */}
          {agentSteps.length > 0 && (
             <div className="flex flex-col space-y-2">{agentSteps}</div>
          )}

          {/* Renders the "typing" assistant message */}
          {isChatLoading && streamingContent && (
             <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
               <Avatar className="h-8 w-8 border">
                 <AvatarFallback className="bg-slate-950">
                   <Sparkles className="h-4 w-4 text-emerald-400"/>
                 </AvatarFallback>
               </Avatar>
               <div className={cn('max-w-[85%] rounded-2xl p-4 text-sm prose dark:prose-invert bg-muted border rounded-tl-none')}>
                  {typeof streamingContent === 'string' ? (
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  ) : (
                    <p>Generating forensic analysis...</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">
                    <Loader2 className="h-3 w-3 animate-spin" /> Aura is thinking...
                  </div>
               </div>
             </div>
          )}

          {/* Fallback for missing context */}
          {!businessId && !isProfileLoading && (
            <div className="text-center text-amber-600 text-xs p-6 border border-dashed rounded-xl bg-amber-50 mx-auto max-w-sm">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-bold uppercase tracking-tighter">Neural Link Offline</p>
              <p className="opacity-70">Please ensure you are logged into a business sector to activate Aura.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-background p-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-5xl mx-auto">
          <Input 
            type="text" 
            value={input} 
            onChange={handleInputChange}
            placeholder={isDisabled ? "Initializing Neural context..." : "Ask Aura to audit ledger drift..."} 
            disabled={isDisabled} 
            className="flex-1 h-12 rounded-xl bg-muted/50 border-none shadow-inner" 
            autoComplete="off" 
          />
          <Button 
            type="submit" 
            disabled={!canSend} 
            className="h-12 w-12 rounded-xl shadow-xl transition-all active:scale-95"
            size="icon"
          >
            {isChatLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}