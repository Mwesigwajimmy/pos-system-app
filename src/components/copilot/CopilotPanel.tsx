// src/components/copilot/CopilotPanel.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react'; 
import { type CoreMessage } from 'ai';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Cog, 
  Server, 
  FileDown, 
  Pilcrow, 
  Compass, 
  Fingerprint, 
  Zap, 
  Activity 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';

// --- Types ---
type MessageWithId = CoreMessage & { id: string };

// --- Utility: Forensic File Generation ---
const downloadFileFromBase64 = (fileName: string, mimeType: string, content: string): void => {
  try {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${content}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Forensic Report Exported: ${fileName}`);
  } catch (error) {
    toast.error("Neural Export Failed: Data stream corrupted.");
    console.error("Download Error:", error);
  }
};

// --- Component: Neural Process Visualization (Tool Usage) ---
const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  try {
    const outputData = data.output ? JSON.parse(data.output) : {};
    
    if (outputData.action === "navigate") {
        return (
          <div className="text-xs text-sky-500 ml-11 my-2 p-3 border rounded-md bg-sky-500/10 border-sky-500/20 animate-pulse">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-tighter">Autonomous Navigation</p>
                <p className="font-mono text-[10px]">Target: {outputData.payload.url}</p>
              </div>
            </div>
          </div>
        );
    }

    if (outputData.action === "download_file") {
        return (
          <div className="text-xs text-emerald-500 ml-11 my-2 p-3 border rounded-md bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center gap-2">
              <FileDown className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-tighter">Data Extraction Complete</p>
                <p className="text-[10px]">Buffer ready for {outputData.payload.fileName}</p>
              </div>
            </div>
          </div>
        );
    }

    if (outputData.action === "present_draft") {
        return (
          <div className="text-xs text-fuchsia-500 ml-11 my-2 p-3 border rounded-md bg-fuchsia-500/10 border-fuchsia-500/20">
            <div className="flex items-center gap-2">
              <Pilcrow className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-tighter">Synthesizing Communication</p>
                <p className="text-[10px]">Drafting forensic response for review...</p>
              </div>
            </div>
          </div>
        );
    }
  } catch (e) { /* ignore parse errors */ }

  if (data.tool) {
    return (
      <div className="text-[10px] text-muted-foreground ml-11 my-2 p-3 border rounded-md bg-slate-50 border-dashed">
        <div className="flex items-center gap-2">
          <Cog className="h-3 w-3 animate-spin text-emerald-600" />
          <div>
            <p className="font-bold uppercase tracking-widest text-slate-600">Executing Core: {data.tool}</p>
            <p className="opacity-60 truncate max-w-[200px] font-mono">{JSON.stringify(data.toolInput)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.output && typeof data.output === 'string' && data.output.length < 500) {
    return (
      <div className="text-[10px] text-muted-foreground ml-11 my-2 p-2 border-l-2 border-emerald-500 bg-slate-50/50 italic font-mono">
        Observation: {data.output.substring(0, 100)}...
      </div>
    );
  }

  return null;
};

// --- Main Command Center ---
const CopilotPanel = forwardRef((props, ref) => {
  const router = useRouter();
  const { data: userProfile } = useUserProfile();
  const businessId = (userProfile as any)?.business_id || ''; 
  const userId = (userProfile as any)?.id || (userProfile as any)?.user_id || '';

  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [agentSteps, setAgentSteps] = useState<any[]>([]);

  const chat: any = useChat({
    api: '/api/copilot',
    body: { businessId, userId }, 
    onResponse: () => {
      setAgentSteps([]); 
    },
    onData: (chunk: string) => {
      try {
        const parsedEvent = JSON.parse(chunk);
        
        // --- Real-time Autonomous Execution ---
        if (parsedEvent.event === 'on_tool_end' && parsedEvent.data.output) {
          try {
            const toolOutput = JSON.parse(parsedEvent.data.output);
            if (toolOutput.action === "navigate" && toolOutput.payload.url) {
              toast.info(`Aura: Redirecting to ${toolOutput.payload.url}`);
              router.push(toolOutput.payload.url);
            }
            if (toolOutput.action === "download_file" && toolOutput.payload.fileName) {
              const { fileName, mimeType, content } = toolOutput.payload;
              downloadFileFromBase64(fileName, mimeType, content);
            }
            setAgentSteps(prev => [...prev, { output: `Neural Link Processed: ${toolOutput.action}` }]);
          } catch (e) {}
        }
        
        if (parsedEvent.event === 'on_agent_action' || parsedEvent.event === 'on_tool_end') {
          setAgentSteps(prev => [...prev, parsedEvent.data]);
        }
      } catch (e) {}
    },
    onError: (err: Error) => toast.error(`Neural Link Error: ${err.message}`),
  } as any);

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading } = chat;

  useImperativeHandle(ref, () => ({
    startAIAssistance: (prompt: string): void => {
      setInput(prompt);
      setAgentSteps([]);
      setTimeout(() => {
        if (formRef.current) {
            formRef.current.requestSubmit();
        }
      }, 100);
    }
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agentSteps, isLoading]);

  const memoizedAgentSteps = useMemo(() => {
    return agentSteps.map((step, i) => <AgentStep key={`step-${i}`} data={step} />);
  }, [agentSteps]);

  const canSend = !isLoading && businessId && input.trim();
  
  return (
    <div className="h-full w-full flex flex-col bg-white border-l shadow-2xl overflow-hidden">
      {/* Forensic Header */}
      <header className="p-6 border-b bg-slate-950 text-white flex flex-col gap-1 shrink-0">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter italic">
                <Fingerprint className="h-5 w-5 text-emerald-400 animate-pulse"/> Aura Intelligence
            </h2>
            <Badge className="bg-emerald-600 text-[8px] border-none px-2 py-0.5">v10.5 PRO</Badge>
        </div>
        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Autonomous Forensic Co-Pilot</p>
      </header>
      
      {/* Neural Link Feed */}
      <ScrollArea className="flex-grow p-4 bg-slate-50/30">
        <div className="space-y-6">
            {messages.length === 0 && (
                <div className="py-20 text-center opacity-20 grayscale transition-all duration-1000">
                    <Bot size={64} className="mx-auto mb-4 animate-bounce" />
                    <p className="text-xs font-black uppercase tracking-[0.4em]">Awaiting Forensic Command</p>
                </div>
            )}

            {messages.map((m: MessageWithId) => (
              <div key={m.id} className={cn('flex items-start gap-3', m.role === 'user' ? 'justify-end' : '')}>
                {m.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shrink-0 border border-emerald-500/20">
                    <Zap className="h-5 w-5 text-emerald-400 fill-current" />
                  </div>
                )}
                
                <div className={cn(
                    'rounded-2xl p-4 max-w-[85%] text-sm shadow-sm border transition-all',
                    m.role === 'user' 
                        ? 'bg-primary text-white border-primary rounded-tr-none' 
                        : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                )}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-emerald-400">
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
            
            {/* Agent Reasoning visualization */}
            {isLoading && (
              <>
                {memoizedAgentSteps}
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-11 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Aura is processing sector data...
                </div>
              </>
            )}

            <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>
      
      {/* Command Input Area */}
      <div className="p-4 border-t bg-white shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2" ref={formRef}>
          <Input 
            value={input} 
            onChange={handleInputChange} 
            placeholder={!businessId ? "Initializing Neural Link..." : "Ask Aura to analyze ledger drift..."} 
            className="h-12 rounded-xl bg-slate-50 border-none shadow-inner focus-visible:ring-emerald-500 transition-all"
            disabled={!businessId || isLoading}
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
        
        {/* Verification Footer for the 11 Businesses */}
        <div className="flex justify-between items-center mt-3 px-1">
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-muted-foreground">
                <Activity className="h-3 w-3 text-emerald-500" />
                Neural Link: <span className="font-mono text-emerald-600 font-bold">{businessId ? businessId.slice(0, 12) : 'OFFLINE'}</span>
            </div>
            <div className="text-[9px] uppercase tracking-tighter font-bold text-slate-300">
                Secure Forensic Context Isolated
            </div>
        </div>
      </div>
    </div>
  );
});

CopilotPanel.displayName = "CopilotPanel";

export default CopilotPanel;