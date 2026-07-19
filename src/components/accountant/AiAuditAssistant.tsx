'use client';

/**
 * --- AI Audit Assistant ---
 * Forensic-audit-flavored chat console, driven by CopilotContext.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCopilot, type CopilotMessage } from '@/context/CopilotContext';
import {
  Send, Bot, User, Loader2, ChevronRight, Cog,
  Fingerprint, Activity, Zap, Database,
  BarChart3, ShieldCheck,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import remarkGfm from 'remark-gfm';

const AgentStep = ({ data }: { data: any }) => {
    if (!data) return null;

    const isToolCall = data.step === 'tool_call' || data.event === 'on_agent_action';
    const isObservation = data.step === 'observation' || data.event === 'on_tool_end';

    if (isToolCall) {
        const name = data.name || data.data?.data?.[0]?.function?.name || 'Forensic Kernel';
        return (
            <div className="text-xs text-muted-foreground ml-11 sm:ml-12 my-2 p-3 border rounded-xl bg-slate-50/50 border-dashed animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin text-blue-500" />
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
            <div className="text-xs text-muted-foreground ml-11 sm:ml-12 my-2 p-3 border rounded-xl bg-blue-50/20 border-blue-100/50">
                <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <p className="font-semibold uppercase tracking-widest text-[10px]">Sector Data Synchronized</p>
                </div>
                <pre className="mt-2 p-2 bg-white/40 rounded-md text-[10px] whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono border border-blue-100">
                    <code>{typeof output === 'string' ? output.substring(0, 300) : "Forensic buffer captured."}</code>
                </pre>
            </div>
        );
    }
    return null;
};

export function AiAuditAssistant() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  const copilot = useCopilot();
  const {
    messages, input, setInput, handleInputChange, handleSubmit,
    isLoading: isChatLoading, setMessages, data,
    businessId, userId, isReady: contextReady
  } = copilot;

  const industry = "Accounting & Audit";

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [finalAnswer, setFinalAnswer] = useState('');
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);

  useEffect(() => {
    if (data && Array.isArray(data)) {
        const lastChunk = data[data.length - 1];
        if (lastChunk) {
            try {
                const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;
                if(parsed && parsed.finalAnswer) setFinalAnswer(parsed.finalAnswer);
                if(parsed && Array.isArray(parsed.suggestedActions)) setSuggestedActions(parsed.suggestedActions);
            } catch (e) { /* Buffer streaming - skip partial JSON */ }
        }
    }
  }, [data]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, finalAnswer, data, isChatLoading]);

  const agentStepsView = useMemo(() => {
      if (!data || !Array.isArray(data)) return [];
      return data.map((chunk: any, i: number) => {
          if (!chunk) return null;
          try {
              const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
              if (parsed && (parsed.step || parsed.event)) return <AgentStep key={`step-${i}`} data={parsed} />;
              return null;
          } catch (e) { return null; }
      }).filter(Boolean);
  }, [data]);

  useEffect(() => {
    if (contextReady && inputRef.current) {
      inputRef.current.focus();
    }
  }, [contextReady]);

  const handleSuggestionClick = (action: string) => {
      const newMessages: CopilotMessage[] = [
          ...messages,
          { id: `asst-${Date.now()}`, role: 'assistant', content: finalAnswer || "Proceeding..." },
          { id: `user-${Date.now()}`, role: 'user', content: action }
      ] as any;
      setMessages(newMessages);
      setFinalAnswer(''); setSuggestedActions([]); setInput('');
      handleSubmit(new Event('submit') as any, {
          options: { body: { businessId, userId, messages: newMessages } }
      });
  };

  const suggestedPrompts = [
      `Run forensic audit of financial modules.`,
      "Analyze ledger drift against transaction baselines.",
      "Check payroll disbursement for contract parity.",
      "Calculate Benford's Law frequency check.",
  ];

  if (!hasMounted) return (
      <div className="w-full h-[500px] sm:h-[700px] flex items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
  );

  const isInputLocked = !businessId || !contextReady;
  const canSend = !isChatLoading && (input || '').trim().length > 0;

  return (
    <div className="w-full h-full flex flex-col border rounded-2xl sm:rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden min-h-[500px] sm:min-h-[700px]">
      {/* Sovereignty Header */}
      <header className="px-4 sm:px-8 py-4 sm:py-5 border-b bg-slate-950 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-2 sm:p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 shrink-0">
                <Fingerprint className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 animate-pulse" />
              </div>
              <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-none text-blue-50 truncate">Aura Executive</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                      <p className="text-[8px] sm:text-[9px] text-slate-400 font-mono tracking-widest uppercase truncate">Protocol: {industry}</p>
                  </div>
              </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
              <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono border-slate-700">ID: {businessId?.slice(0, 8) || 'SYNCING'}</Badge>
          </div>
      </header>

      <ScrollArea className="flex-grow p-4 sm:p-8 bg-slate-50/30">
        <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
            {messages.length === 0 && !isChatLoading && (
                <div className="text-center py-10 sm:py-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex justify-center mb-6 sm:mb-8 relative">
                        <div className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 relative z-10">
                            <Bot className="h-10 w-10 sm:h-16 sm:w-16 text-slate-900" />
                        </div>
                        <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                        <Zap size={20} className="absolute -top-2 right-1/2 translate-x-8 sm:translate-x-12 text-blue-500 fill-current animate-bounce" />
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-slate-900 mb-3 tracking-tight px-4">Autonomous Forensic Kernel</h3>
                    <p className="mb-8 sm:mb-10 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed px-4">
                        Secure logic link established to industry module map.
                        Authorized to audit system architecture, calculate global taxes, and execute executive reporting.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 px-4 sm:px-6">
                        {suggestedPrompts.map(prompt => (
                            <Button
                                key={prompt}
                                variant="outline"
                                onClick={() => setInput(prompt)}
                                className="text-[11px] font-bold h-auto py-3.5 sm:py-4 px-4 sm:px-5 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left justify-start rounded-xl sm:rounded-2xl group shadow-sm bg-white"
                            >
                                <ChevronRight className="h-4 w-4 mr-2 sm:mr-3 text-blue-500 group-hover:translate-x-1 transition-transform shrink-0" />
                                {prompt}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {messages.map((m: any, idx: number) => (
                <div key={m.id || `msg-${idx}`} className={cn('flex items-start gap-3 sm:gap-4', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {m.role === 'assistant' && (
                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shrink-0 border border-blue-500/20">
                            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 fill-current" />
                         </div>
                    )}

                    <div className={cn(
                        'rounded-2xl sm:rounded-3xl p-4 sm:p-5 max-w-[85%] text-[13px] sm:text-sm shadow-md border transition-all leading-relaxed',
                        m.role === 'user'
                            ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none'
                            : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                    )}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-blue-400">
                            {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                        </ReactMarkdown>
                    </div>

                    {m.role === 'user' && (
                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                         </div>
                    )}
                </div>
            ))}

            {agentStepsView}

            {!isChatLoading && finalAnswer && (
                <div className="flex items-start gap-3 sm:gap-4 animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-200 shrink-0">
                        <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-7 bg-white border-2 border-blue-100 max-w-[85%] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <BarChart3 size={80} className="text-slate-900" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                                Forensic Report Validated
                            </Badge>
                            <span className="text-[9px] text-slate-400 font-mono tracking-tighter">SIG_AUTH: {businessId?.slice(0,12).toUpperCase()}</span>
                        </div>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none font-medium text-slate-900 prose-p:leading-relaxed">
                            {finalAnswer}
                        </ReactMarkdown>

                        {suggestedActions.length > 0 && (
                            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-100">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 sm:mb-5 text-blue-600 flex items-center gap-2">
                                    <Activity size={14} className="animate-pulse" /> Recommended Executive Actions
                                </h4>
                                <div className="space-y-2.5">
                                    {suggestedActions.map((action, i) => (
                                        <Button
                                            key={`action-${i}`}
                                            variant="secondary"
                                            className="w-full justify-between text-left h-auto py-3.5 sm:py-4 bg-slate-50 hover:bg-slate-900 hover:text-white border-none transition-all rounded-xl sm:rounded-2xl group shadow-sm"
                                            onClick={() => handleSuggestionClick(action)}
                                        >
                                            <div className="flex items-center min-w-0">
                                                <ChevronRight className="mr-2 sm:mr-3 h-4 w-4 text-blue-500 group-hover:translate-x-1 transition-transform shrink-0" />
                                                <span className="text-xs font-bold tracking-tight truncate">{action}</span>
                                            </div>
                                            <Zap size={14} className="opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity shrink-0" />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isChatLoading && !finalAnswer && (
                <div className="flex items-center gap-3 sm:gap-4 ml-11 sm:ml-14 py-4 sm:py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400 animate-pulse">Computing forensic drift...</span>
                </div>
            )}

            <div ref={scrollRef} className="h-10" />
        </div>
      </ScrollArea>

      {/* Controller Area */}
      <div className="p-4 sm:p-8 border-t bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
          className="flex items-center gap-3 sm:gap-4 max-w-4xl mx-auto"
        >
          <div className="relative flex-grow">
              <Input
                ref={inputRef}
                className="h-12 sm:h-16 rounded-xl sm:rounded-2xl bg-blue-50/60 border border-blue-200 shadow-inner focus-visible:border-blue-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-100 text-sm sm:text-base px-5 sm:px-8 pr-12 sm:pr-14 transition-all"
                value={input}
                onChange={handleInputChange}
                placeholder={isInputLocked ? "Neural Link Syncing..." : "Command Aura to audit, calculate, or report..."}
                disabled={isChatLoading}
              />
              <div className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2">
                <Database size={16} className={cn("transition-colors", isChatLoading ? "text-blue-500 animate-pulse" : "text-slate-300")} />
              </div>
          </div>
          <Button
            type="submit"
            disabled={!canSend}
            className={cn(
                "h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0",
                canSend ? "bg-slate-950 opacity-100" : "bg-slate-200 opacity-50"
            )}
          >
              {isChatLoading ? <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-blue-500" /> : <Send className="h-6 w-6 sm:h-7 sm:w-7 text-white" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
