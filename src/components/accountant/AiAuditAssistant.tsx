'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Corrected import path for Vercel AI SDK React hooks
import { useChat } from '@ai-sdk/react';
// FIX: Using CoreMessage type from 'ai'
import { type CoreMessage } from 'ai'; 
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, ChevronRight, Server, Cog,
  ShieldAlert, Fingerprint, Activity, Zap, FileText, Database
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Refined path
import remarkGfm from 'remark-gfm';

/**
 * --- AgentStep Component ---
 * Visualizes Aura's autonomous reasoning loop.
 * Upgraded to handle both internal "Step" logic and external "Event" logic.
 */
const AgentStep = ({ data }: { data: any }) => {
    // Support for multiple event structures (Standard vs. Forensic)
    const isToolCall = data.step === 'tool_call' || data.event === 'on_agent_action';
    const isObservation = data.step === 'observation' || data.event === 'on_tool_end';

    if (isToolCall) {
        const name = data.name || data.data?.data?.[0]?.function?.name || 'Forensic Kernel';
        const input = data.input || data.data?.data?.[0]?.function?.arguments || '{}';

        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-xl bg-slate-50/50 border-dashed animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin text-primary" />
                    <div>
                        <p className="font-bold uppercase tracking-tighter text-slate-700">Aura Executing: `{name}`</p>
                        <p className="text-[10px] font-mono opacity-70 truncate max-w-[250px]">Target: {JSON.stringify(input)}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isObservation) {
        let output = data.output || data.data?.output || "{}";
        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-xl bg-emerald-50/20 border-emerald-100/50">
                <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-500" />
                    <p className="font-semibold uppercase tracking-widest text-[10px]">Data Stream Synchronized</p>
                </div>
                <pre className="mt-2 p-2 bg-white/50 rounded-md text-[10px] whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono border">
                    <code>{typeof output === 'string' ? output.substring(0, 500) : JSON.stringify(output, null, 2)}</code>
                </pre>
            </div>
        );
    }
    return null;
};

export function AiAuditAssistant() {
  const { data: userProfile } = useUserProfile();
  const businessId = (userProfile as any)?.business_id || '';
  const industry = (userProfile as any)?.industry || 'General Enterprise';
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [finalAnswer, setFinalAnswer] = useState('');
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);

  // SHARED EXECUTIVE AI CORE
  const chat: any = useChat({
    api: '/api/chat',
    body: { businessId, industry, contextType: 'forensic_audit' },
    experimental_streamData: true,
    onFinish: (message: any) => { 
        // Logic to extract structured forensic actions from the tail of the stream
        const lastDataChunk = chat.data?.at(-1); 
        if (lastDataChunk) {
            try {
                const parsedData = typeof lastDataChunk === 'string' ? JSON.parse(lastDataChunk) : lastDataChunk;
                if(parsedData.finalAnswer) setFinalAnswer(parsedData.finalAnswer);
                if(parsedData.suggestedActions) setSuggestedActions(parsedData.suggestedActions);
            } catch (e) {}
        }
        toast.success("Forensic Sync Complete.");
    },
    onError: (err: Error) => toast.error(`Neural Link Error: ${err.message}`),
  } as any);

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading: isChatLoading, setMessages, data } = chat;

  // Professional Scroll management
  useEffect(() => { 
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' }); 
    }
  }, [messages, finalAnswer, data, isChatLoading]);

  // Memoized Agent thought steps to prevent UI flicker
  const agentSteps = useMemo(() => {
      if (!data || !Array.isArray(data)) return [];
      return data.map((chunk: any, i: number) => { 
          try { 
              const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
              if(parsed.step || parsed.event) return <AgentStep key={`step-${i}`} data={parsed} />; 
              return null;
          } catch (e) { return null; }
      }).filter(Boolean);
  }, [data]);
  
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFinalAnswer(''); setSuggestedActions([]);
      handleSubmit(e);
  };
  
  const handleSuggestionClick = (action: string) => {
      const newMessages = [
          ...messages, 
          { id: crypto.randomUUID(), role: 'assistant', content: finalAnswer || "Preparing next audit phase..." } as CoreMessage, 
          { id: crypto.randomUUID(), role: 'user', content: action } as CoreMessage
      ];
      setMessages(newMessages);
      setFinalAnswer(''); setSuggestedActions([]); setInput('');
      handleSubmit(new Event('submit') as any, { options: { body: { businessId, messages: newMessages } } });
  };
  
  // Upgrade: Multi-Sector Forensic Prompts
  const suggestedPrompts = [
      `Run a ${industry} forensic audit for the current quarter.`,
      "Detect 90-day ledger drift exceeding 3x moving average.",
      "Analyze payroll disbursement parity against HR contracts.",
      "Prepare a print-ready VAT/Tax compliance report.",
  ];

  return (
    <div className="w-full h-full flex flex-col border rounded-2xl bg-white shadow-2xl overflow-hidden min-h-[600px]">
      {/* Executive Header */}
      <header className="px-6 py-4 border-b bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Fingerprint className="h-5 w-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                  <h2 className="text-sm font-black uppercase tracking-widest leading-none">Aura Executive</h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">FORENSIC_PROTOCOL: {industry.toUpperCase()}</p>
              </div>
          </div>
          <Badge className="bg-emerald-600 text-[10px] font-mono border-none">v10.5 PRO</Badge>
      </header>

      <ScrollArea className="flex-grow p-6 bg-slate-50/30">
        <div className="space-y-6 max-w-4xl mx-auto">
            {messages.length === 0 && !isChatLoading && (
                <div className="text-center py-12">
                    <div className="flex justify-center mb-6 relative">
                        <div className="p-5 bg-white rounded-full shadow-xl border border-slate-100">
                            <Bot className="h-12 w-12 text-slate-900" />
                        </div>
                        <Zap size={20} className="absolute top-0 right-1/2 translate-x-8 text-emerald-500 fill-current animate-bounce" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Autonomous Operational Core</h3>
                    <p className="mb-8 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                        I have established a secure link to the **${industry}** data kernel. I can autonomously audit ledgers, calculate taxes, and generate professional documents.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
                        {suggestedPrompts.map(prompt => (
                            <Button 
                                key={prompt} 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setInput(prompt)}
                                className="text-[11px] h-auto py-3 px-4 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left justify-start"
                            >
                                <ChevronRight className="h-3 w-3 mr-2 text-emerald-500" />
                                {prompt}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Logic */}
            {messages.map((m: any) => ( 
                <div key={m.id} className={cn('flex items-start gap-4', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {m.role === 'assistant' && (
                         <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shrink-0">
                            <Zap className="h-5 w-5 text-emerald-400 fill-current" />
                         </div>
                    )}
                    
                    <div className={cn(
                        'rounded-2xl p-4 max-w-[85%] text-sm shadow-sm border transition-all',
                        m.role === 'user' 
                            ? 'bg-primary text-primary-foreground border-primary rounded-tr-none' 
                            : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                    )}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none prose-p:leading-relaxed">
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

            {/* Tool Execution Steps */}
            {agentSteps}

            {/* Final Answer / Executive Summary */}
            {!isChatLoading && finalAnswer && (
                <div className="flex items-start gap-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shrink-0">
                        <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="rounded-2xl p-5 bg-white border-2 border-emerald-100 max-w-[85%] shadow-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0">OFFICIAL REPORT</Badge>
                            <span className="text-[10px] text-slate-400 font-mono">HASH: {crypto.randomUUID().slice(0,8)}</span>
                        </div>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none font-medium text-slate-900">
                            {finalAnswer}
                        </ReactMarkdown>
                        
                        {suggestedActions.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-emerald-600 flex items-center gap-2">
                                    <Activity size={12} /> Executive Action Required
                                </h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {suggestedActions.map((action, i) => (
                                        <Button key={i} variant="secondary" size="sm" className="w-full justify-start text-left h-auto py-3 bg-slate-50 hover:bg-emerald-600 hover:text-white border-none transition-all group" onClick={() => handleSuggestionClick(action)}>
                                            <ChevronRight className="mr-3 h-4 w-4 flex-shrink-0 text-emerald-500 group-hover:text-white" />
                                            <span className="text-xs font-bold">{action}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Ongoing Thinking/Streaming */}
            {isChatLoading && !finalAnswer && ( 
                <div className="flex items-center gap-3 ml-12 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aura is computing sector drift...</span>
                </div>
            )}
            
            <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Control Input Area */}
      <div className="p-6 border-t bg-white">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="relative flex-grow">
              <Input 
                className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner focus-visible:ring-emerald-500 text-base px-6 pr-12 transition-all"
                value={input} 
                onChange={handleInputChange} 
                placeholder={isChatLoading ? "Kernel processing..." : "Command Aura to audit, file, or report..."} 
                disabled={isChatLoading || !businessId}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Database size={16} className={cn("transition-colors", isChatLoading ? "text-emerald-500 animate-pulse" : "text-slate-300")} />
              </div>
          </div>
          <Button type="submit" size="icon" disabled={isChatLoading || !businessId || !input.trim()} className="h-14 w-14 rounded-2xl shadow-xl bg-slate-900 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95">
              {isChatLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
        <p className="text-center mt-4 text-[9px] uppercase tracking-tighter text-slate-400 font-bold">
            Secure Neural Link Active for Sector: <span className="text-emerald-600">{industry}</span>
        </p>
      </div>
    </div>
  );
}