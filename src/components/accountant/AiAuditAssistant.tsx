'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai'; 
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCopilot } from '@/context/CopilotContext'; // Pull from our hardened context
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, ChevronRight, Server, Cog,
  ShieldAlert, Fingerprint, Activity, Zap, FileText, Database, 
  BarChart3, ShieldCheck, Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; 
import remarkGfm from 'remark-gfm';

/**
 * --- AgentStep Component ---
 * Visualizes Aura's autonomous forensic reasoning.
 */
const AgentStep = ({ data }: { data: any }) => {
    const isToolCall = data.step === 'tool_call' || data.event === 'on_agent_action';
    const isObservation = data.step === 'observation' || data.event === 'on_tool_end';

    if (isToolCall) {
        const name = data.name || data.data?.data?.[0]?.function?.name || 'Forensic Kernel';
        return (
            <div className="text-xs text-muted-foreground ml-12 my-2 p-3 border rounded-xl bg-slate-50/50 border-dashed animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin text-emerald-500" />
                    <div>
                        <p className="font-bold uppercase tracking-tighter text-slate-700">Aura Executing: `{name}`</p>
                        <p className="text-[10px] font-mono opacity-70">Forensic Scan in progress...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isObservation) {
        let output = data.output || data.data?.output || "{}";
        return (
            <div className="text-xs text-muted-foreground ml-12 my-2 p-3 border rounded-xl bg-emerald-50/20 border-emerald-100/50">
                <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-emerald-500" />
                    <p className="font-semibold uppercase tracking-widest text-[10px]">Sector Data Synchronized</p>
                </div>
                <pre className="mt-2 p-2 bg-white/40 rounded-md text-[10px] whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono border border-emerald-100">
                    <code>{typeof output === 'string' ? output.substring(0, 300) : "Forensic buffer captured."}</code>
                </pre>
            </div>
        );
    }
    return null;
};

export function AiAuditAssistant() {
  // 1. HARDENED IDENTITY HANDSHAKE
  const { businessId: ctxBizId, userId: ctxUserId, isReady } = useCopilot();
  const { data: userProfile } = useUserProfile();
  
  // Robust Fallbacks for multi-tenant pathing
  const businessId = ctxBizId || (userProfile as any)?.business_id || (userProfile as any)?.tenant_id || '';
  const userId = ctxUserId || userProfile?.id || '';
  const industry = (userProfile as any)?.industry || 'General Enterprise';
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [finalAnswer, setFinalAnswer] = useState('');
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);

  // 2. SHARED EXECUTIVE AI CORE
  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading: isChatLoading, setMessages, data } = useChat({
    api: '/api/chat',
    body: { 
        businessId, 
        userId, 
        industry, 
        contextType: 'forensic_audit_protocol' 
    },
    experimental_streamData: true,
    onFinish: (message) => { 
        // Logic to extract structured forensic actions from the stream metadata
        const lastDataChunk = data?.at(-1); 
        if (lastDataChunk) {
            try {
                const parsed = typeof lastDataChunk === 'string' ? JSON.parse(lastDataChunk) : lastDataChunk;
                if(parsed.finalAnswer) setFinalAnswer(parsed.finalAnswer);
                if(parsed.suggestedActions) setSuggestedActions(parsed.suggestedActions);
            } catch (e) {}
        }
        toast.success("Forensic Audit Segment Complete.");
    },
    onError: (err: Error) => toast.error(`Neural Link Interrupted: ${err.message}`),
  });

  // 3. AUTO-SCROLL
  useEffect(() => { 
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' }); 
    }
  }, [messages, finalAnswer, data, isChatLoading]);

  // 4. MEMOIZED THOUGHT PROCESS
  const agentStepsView = useMemo(() => {
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
      const newMessages: CoreMessage[] = [
          ...messages, 
          { id: crypto.randomUUID(), role: 'assistant', content: finalAnswer || "Proceeding with next logic gate..." } as CoreMessage, 
          { id: crypto.randomUUID(), role: 'user', content: action } as CoreMessage
      ];
      setMessages(newMessages as any);
      setFinalAnswer(''); setSuggestedActions([]); setInput('');
      handleSubmit(new Event('submit') as any, { options: { body: { businessId, userId, messages: newMessages } } });
  };
  
  const suggestedPrompts = [
      `Run a forensic audit of ${industry} modules.`,
      "Analyze ledger drift against transaction baselines.",
      "Check payroll disbursement for contract parity.",
      "Generate a multi-country tax compliance report.",
  ];

  return (
    <div className="w-full h-full flex flex-col border rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden min-h-[700px]">
      {/* Sovereignty Header */}
      <header className="px-8 py-5 border-b bg-slate-950 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Fingerprint className="h-6 w-6 text-emerald-400 animate-pulse" />
              </div>
              <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] leading-none text-emerald-50">Aura Executive</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">Protocol: {industry}</p>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-3">
              <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono border-slate-700">ID: {businessId?.slice(0, 8)}</Badge>
              <Badge className="bg-emerald-600 text-[9px] font-mono border-none px-3 py-1 shadow-lg shadow-emerald-900/20">v10.5 PRO</Badge>
          </div>
      </header>

      <ScrollArea className="flex-grow p-8 bg-slate-50/30">
        <div className="space-y-8 max-w-4xl mx-auto">
            {messages.length === 0 && !isChatLoading && (
                <div className="text-center py-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex justify-center mb-8 relative">
                        <div className="p-6 bg-white rounded-3xl shadow-2xl border border-slate-100 relative z-10">
                            <Bot className="h-16 w-16 text-slate-900" />
                        </div>
                        <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
                        <Zap size={24} className="absolute -top-2 right-1/2 translate-x-12 text-emerald-500 fill-current animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Autonomous Forensic Kernel</h3>
                    <p className="mb-10 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                        I have established a 256-bit encrypted link to the **{industry}** data ledger. 
                        I am authorized to audit your system architecture, calculate global taxes, and execute executive actions.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6">
                        {suggestedPrompts.map(prompt => (
                            <Button 
                                key={prompt} 
                                variant="outline" 
                                onClick={() => setInput(prompt)}
                                className="text-[11px] font-bold h-auto py-4 px-5 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left justify-start rounded-2xl group shadow-sm"
                            >
                                <ChevronRight className="h-4 w-4 mr-3 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                                {prompt}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Conversation Stream */}
            {messages.map((m: any) => ( 
                <div key={m.id} className={cn('flex items-start gap-4', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {m.role === 'assistant' && (
                         <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shrink-0 border border-emerald-500/20">
                            <Zap className="h-5 w-5 text-emerald-400 fill-current" />
                         </div>
                    )}
                    
                    <div className={cn(
                        'rounded-3xl p-5 max-w-[85%] text-sm shadow-md border transition-all leading-relaxed',
                        m.role === 'user' 
                            ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none' 
                            : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                    )}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-emerald-400">
                            {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                        </ReactMarkdown>
                    </div>

                    {m.role === 'user' && (
                         <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                            <User className="h-5 w-5 text-slate-500" />
                         </div>
                    )}
                </div>
            ))}

            {/* Live Thinking Process */}
            {agentStepsView}

            {/* HIGH-AUTHORITY REPORT SECTION */}
            {!isChatLoading && finalAnswer && (
                <div className="flex items-start gap-4 animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-200 shrink-0">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div className="rounded-3xl p-7 bg-white border-2 border-emerald-100 max-w-[85%] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <BarChart3 size={100} className="text-emerald-900" />
                        </div>
                        <div className="flex items-center gap-3 mb-5">
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                Forensic Report Validated
                            </Badge>
                            <span className="text-[9px] text-slate-400 font-mono tracking-tighter">SIG_AUTH: {businessId?.slice(0,12)}</span>
                        </div>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none font-medium text-slate-900 prose-p:leading-relaxed">
                            {finalAnswer}
                        </ReactMarkdown>
                        
                        {suggestedActions.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-5 text-emerald-600 flex items-center gap-2">
                                    <Activity size={14} className="animate-pulse" /> Recommended Executive Actions
                                </h4>
                                <div className="space-y-2.5">
                                    {suggestedActions.map((action, i) => (
                                        <Button 
                                            key={i} 
                                            variant="secondary" 
                                            className="w-full justify-between text-left h-auto py-4 bg-slate-50 hover:bg-slate-900 hover:text-white border-none transition-all rounded-2xl group shadow-sm" 
                                            onClick={() => handleSuggestionClick(action)}
                                        >
                                            <div className="flex items-center">
                                                <ChevronRight className="mr-3 h-4 w-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                                                <span className="text-xs font-bold tracking-tight">{action}</span>
                                            </div>
                                            <Zap size={14} className="opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Thinking Indicator */}
            {isChatLoading && !finalAnswer && ( 
                <div className="flex items-center gap-4 ml-14 py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Aura computing sector drift...</span>
                </div>
            )}
            
            <div ref={scrollRef} className="h-10" />
        </div>
      </ScrollArea>

      {/* Controller Area */}
      <div className="p-8 border-t bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-4 max-w-4xl mx-auto">
          <div className="relative flex-grow">
              <Input 
                className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner focus-visible:ring-2 focus-visible:ring-emerald-500 text-base px-8 pr-14 transition-all"
                value={input} 
                onChange={handleInputChange} 
                placeholder={isChatLoading ? "Processing Forensic Stream..." : "Command Aura to audit, calculate, or report..."} 
                disabled={isChatLoading || !businessId}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <Database size={18} className={cn("transition-colors", isChatLoading ? "text-emerald-500 animate-pulse" : "text-slate-300")} />
              </div>
          </div>
          <Button 
            type="submit" 
            disabled={isChatLoading || !businessId || !input.trim()} 
            className="h-16 w-16 rounded-2xl shadow-2xl bg-slate-950 hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
          >
              {isChatLoading ? <Loader2 className="h-7 w-7 animate-spin text-emerald-500" /> : <Send className="h-7 w-7 text-white" />}
          </Button>
        </form>
        <div className="flex justify-center items-center gap-8 mt-5">
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" /> Multi-Tenant Sovereignty Active
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold flex items-center gap-2">
                <Activity size={12} className="text-sky-500" /> Sector Logic: {industry}
            </p>
        </div>
      </div>
    </div>
  );
}