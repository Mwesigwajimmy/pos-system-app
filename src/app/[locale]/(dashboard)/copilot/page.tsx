'use client';

import { FormEvent, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext'; // UPDATED TO USE CONTEXT
import { Sparkles, Send, User, Loader2, Server, Cog } from 'lucide-react';

const AgentStep = ({ data }: { data: any }) => {
    if (!data || !data.event) return null;
    if (data.event === 'on_agent_action') {
        const action = data.data?.data?.[0] || data.data?.[0]; 
        if (!action) return null;
        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-accent">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin" />
                    <div>
                        <p className="font-semibold">Tool Call: `{action.function?.name || 'Processing'}`</p>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function MissionControlPage() {
  // CONSUME THE SHARED STATE
  const { messages, input, handleInputChange, handleSubmit, isLoading, data, isReady } = useCopilot();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, isLoading]);

  // CRASH PREVENTION: Check if last message exists before accessing .content
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const streamingContent = isLoading && lastMessage?.role === 'assistant' ? lastMessage.content : null;
  
  // Filter messages for display
  const renderedMessages = isLoading && lastMessage?.role === 'assistant' ? messages.slice(0, -1) : messages;

  const canSend = !isLoading && input.trim().length > 0 && isReady;

  return (
    <div className="flex flex-col h-full bg-card min-h-[500px]">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {renderedMessages.map((message: any) => ( 
            <div key={message.id} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'assistant' && <Avatar className="h-8 w-8"><AvatarFallback className="bg-slate-900 text-white"><Sparkles className="h-4 w-4 text-emerald-400"/></AvatarFallback></Avatar>}
              <div className={cn('max-w-[85%] rounded-2xl p-4 text-sm prose dark:prose-invert shadow-sm', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                <ReactMarkdown>{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</ReactMarkdown>
              </div>
              {message.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback>U</AvatarFallback></Avatar>}
            </div>
          ))}

          {isLoading && streamingContent && (
             <div className="flex items-start gap-4">
               <Avatar className="h-8 w-8"><AvatarFallback className="bg-slate-900 text-white"><Sparkles className="h-4 w-4 text-emerald-400"/></AvatarFallback></Avatar>
               <div className={cn('max-w-[85%] rounded-2xl p-4 text-sm prose dark:prose-invert bg-muted')}>
                  <ReactMarkdown>{String(streamingContent)}</ReactMarkdown>
                  <Loader2 className="h-3 w-3 animate-spin text-primary mt-2" />
               </div>
             </div>
          )}
          
          {!isReady && (
            <div className="text-center text-muted-foreground text-xs p-10">Initializing Neural Link...</div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t bg-card p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          <Input 
            value={input} 
            onChange={handleInputChange}
            placeholder={!isReady ? "Loading..." : "Ask Aura a question..."} 
            disabled={!isReady || isLoading} 
            className="flex-1 h-12 rounded-xl bg-slate-100/50 border-none shadow-inner" 
          />
          <Button type="submit" disabled={!canSend} className="h-12 w-12 rounded-xl">
             <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}