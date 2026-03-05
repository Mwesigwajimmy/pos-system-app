'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type Message } from 'ai'; 
import { useCopilot } from '@/context/CopilotContext'; 
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, ChevronRight, Server, Cog,
  ShieldAlert, Fingerprint, Activity, Zap, FileText, Database, 
  BarChart3, ShieldCheck, Lock, AlertTriangle, FileDown
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
 * Visualizes Aura's autonomous forensic reasoning loop.
 */
const AgentStep = ({ data }: { data: any }) => {
    if (!data) return null;
    
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
                <div className="flex items-center gap-2 mb-2">
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
  // --- HYDRATION GUARD ---
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  // 1. CONSUME MASTER CONTEXT (Removes dual useChat conflict)
  const copilot = useCopilot();
  const { 
    messages, input, setInput, handleInputChange, handleSubmit, 
    isLoading: isChatLoading, setMessages, data, 
    businessId, userId, isReady: contextReady 
  } = copilot;

  // Derive industry context from modules or default
  const industry = "Accounting & Audit";
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [finalAnswer, setFinalAnswer] = useState('');
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);

  // 2. METADATA EXTRACTION (Parses the JSON chunks from the shared data stream)
  useEffect(() => {
    if (data && Array.isArray(data)) {
        const lastChunk = data[data.length - 1];
        if (lastChunk) {
            try {
                const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;
                if(parsed && parsed.finalAnswer) setFinalAnswer(parsed.finalAnswer);
                if(parsed && Array.isArray(parsed.suggestedActions)) setSuggestedActions(parsed.suggestedActions);
            } catch (e) { /* Metadata is still streaming */ }
        }
    }
  }, [data]);

  // 3. AUTO-SCROLL INTEGRITY
  useEffect(() => { 
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' }); 
    }
  }, [messages, finalAnswer, data, isChatLoading]);

  // 4. THOUGHT PROCESS VISUALIZATION
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
  
  const handleSuggestionClick = (action: string) => {
      const newMessages: Message[] = [
          ...messages, 
          { id: `asst-${Date.now()}`, role: 'assistant', content: finalAnswer || "Proceeding..." }, 
          { id: `user-${Date.now()}`, role: 'user', content: action }
      ] as any;
      setMessages(newMessages);
      setFinalAnswer(''); setSuggestedActions([]); setInput('');
      
      // Submit through context with current business ID security context
      handleSubmit(new Event('submit') as any, { 
          options: { body: { businessId, userId } } 
      });
  };
  
  const suggestedPrompts = [
      `Run forensic audit of financial modules.`,
      "Analyze ledger drift against transaction baselines.",
      "Check payroll disbursement for contract parity.",
      "Calculate Benford's Law frequency check.",
  ];

  // Return loader while component is hydrating to prevent Next.js Client-side exceptions.
  if (!hasMounted) return (
      <div className="w-full h-[700px] flex items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
  );

  /**
   * ROOT FIX: NEURAL UNLOCK
   * We decouple the disabled state from the Handshake (contextReady).
   * This allows immediate typing. We use isInputLocked only for placeholders
   * and to prevent the actual submission until valid IDs are present.
   */
  const isInputLocked = !businessId || !contextReady;
  const canSend = !isChatLoading && (input || '').trim().length > 0;

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
              <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono border-slate-700">ID: {businessId?.slice(0, 8) || 'SYNCING'}</Badge>
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
                        Secure logic link established to industry module map. 
                        Authorized to audit system architecture, calculate global taxes, and execute executive reporting.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6">
                        {suggestedPrompts.map(prompt => (
                            <Button 
                                key={prompt} 
                                variant="outline" 
                                onClick={() => setInput(prompt)}
                                className="text-[11px] font-bold h-auto py-4 px-5 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left justify-start rounded-2xl group shadow-sm bg-white"
                            >
                                <ChevronRight className="h-4 w-4 mr-3 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                                {prompt}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Conversation Flow */}
            {messages.map((m: any, idx: number) => ( 
                <div key={m.id || `msg-${idx}`} className={cn('flex items-start gap-4', m.role === 'user' ? 'justify-end' : 'justify-start')}>
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

            {/* Thought/Action Stream */}
            {agentStepsView}

            {/* FINAL VALIDATED AUDIT REPORT */}
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
                            <span className="text-[9px] text-slate-400 font-mono tracking-tighter">SIG_AUTH: {businessId?.slice(0,12).toUpperCase()}</span>
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
                                            key={`action-${i}`} 
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

            {/* Syncing Indicator */}
            {isChatLoading && !finalAnswer && ( 
                <div className="flex items-center gap-4 ml-14 py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Computing forensic drift...</span>
                </div>
            )}
            
            <div ref={scrollRef} className="h-10" />
        </div>
      </ScrollArea>

      {/* Controller Area */}
      <div className="p-8 border-t bg-white">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            // handleSubmit in context now handles the "Syncing" handshake security check.
            handleSubmit(e);
          }} 
          className="flex items-center gap-4 max-w-4xl mx-auto"
        >
          <div className="relative flex-grow">
              <Input 
                className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner focus-visible:ring-2 focus-visible:ring-emerald-500 text-base px-8 pr-14 transition-all"
                value={input} 
                onChange={handleInputChange} 
                placeholder={isInputLocked ? "Neural Link Synchronizing..." : "Command Aura to audit, calculate, or report..."} 
                // ROOT FIX: Input remains enabled so user can type while handshake finishes.
                disabled={isChatLoading}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <Database size={18} className={cn("transition-colors", isChatLoading ? "text-emerald-500 animate-pulse" : "text-slate-300")} />
              </div>
          </div>
          <Button 
            type="submit" 
            // ROOT FIX: Button activates visually as soon as text is typed.
            disabled={isChatLoading || !input.trim()} 
            className={cn(
                "h-16 w-16 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0",
                (!isChatLoading && input.trim()) ? "bg-slate-950 opacity-100" : "bg-slate-200 opacity-50"
            )}
          >
              {isChatLoading ? <Loader2 className="h-7 w-7 animate-spin text-emerald-500" /> : <Send className="h-7 w-7 text-white" />}
          </Button>
        </form>
      </div>
    </div>
  );
}