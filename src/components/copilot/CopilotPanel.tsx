'use client';

import React from 'react';
import { useCopilot } from '@/context/CopilotContext'; // UPDATED
import { Sparkles, Send, Bot, User, Loader2, Cog, Server, Fingerprint, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';

const CopilotPanel = () => {
  // SHARE THE BRAIN
  const { messages, input, handleInputChange, handleSubmit, isLoading, isReady } = useCopilot();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden">
      <header className="p-6 border-b bg-slate-950 text-white flex flex-col gap-1 shrink-0">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter italic">
                <Fingerprint className="h-5 w-5 text-emerald-400 animate-pulse"/> Aura Intelligence
            </h2>
            <Badge className="bg-emerald-600 text-[8px] border-none">v10.5 PRO</Badge>
        </div>
        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Forensic Co-Pilot</p>
      </header>
      
      <ScrollArea className="flex-grow p-4 bg-slate-50/30">
        <div className="space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={cn('flex items-start gap-3', m.role === 'user' ? 'justify-end' : '')}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg shrink-0 border border-emerald-500/20">
                    <Zap className="h-4 w-4 text-emerald-400 fill-current" />
                  </div>
                )}
                <div className={cn(
                    'rounded-2xl p-4 max-w-[85%] text-sm shadow-sm border transition-all',
                    m.role === 'user' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-800 border-slate-100'
                )}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(m.content)}</ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input 
            value={input} 
            onChange={handleInputChange} 
            placeholder="Ask Aura..." 
            className="h-10 rounded-xl bg-slate-50 border-none"
            disabled={!isReady || isLoading}
          />
          <Button type="submit" size="icon" disabled={!isReady || isLoading || !input.trim()} className="h-10 w-10 rounded-xl shadow-xl">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CopilotPanel;