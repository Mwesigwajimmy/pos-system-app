'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCopilot } from '@/context/CopilotContext'; 
import { 
  Sparkles, Send, User, Loader2, Server, Cog, 
  Activity, Compass, FileDown, Fingerprint, ShieldCheck 
} from 'lucide-react';
import remarkGfm from 'remark-gfm';

/**
 * --- AgentStep Component ---
 * Visualizes Aura's autonomous reasoning loop.
 * Upgraded to show parameters and handle specialized forensic actions.
 */
const AgentStep = ({ data }: { data: any }) => {
    if (!data) return null;

    // Detect specialized output actions (Navigation, Downloads)
    try {
        const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};
        
        if (outputData.action === "navigate") {
            return (
                <div className="text-xs text-sky-500 ml-12 my-2 p-3 border rounded-xl bg-sky-500/5 border-sky-500/20 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 animate-spin-slow" />
                        <div>
                            <p className="font-bold uppercase tracking-tighter">Autonomous Navigation</p>
                            <p className="text-[10px] opacity-70 font-mono">Redirecting: {outputData.payload?.url}</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (outputData.action === "download_file") {
            return (
                <div className="text-xs text-emerald-500 ml-12 my-2 p-3 border rounded-xl bg-emerald-500/5 border-emerald-500/20 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-2">
                        <FileDown className="h-4 w-4" />
                        <div>
                            <p className="font-bold uppercase tracking-tighter">Forensic Buffer Export</p>
                            <p className="text-[10px] opacity-70">Ready: {outputData.payload?.fileName}</p>
                        </div>
                    </div>
                </div>
            );
        }
    } catch (e) { /* Standard step */ }

    // Standard Tool Invocation
    if (data.event === 'on_agent_action' || data.tool) {
        const action = data.data?.data?.[0] || data.data?.[0] || data; 
        const toolName = action?.function?.name || data.tool || 'Forensic Analysis';
        const args = action?.function?.arguments || JSON.stringify(data.toolInput) || '{}';

        return (
            <div className="text-xs text-muted-foreground ml-12 my-2 p-3 border rounded-xl bg-slate-50 border-dashed animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin text-emerald-500" />
                    <div>
                        <p className="font-bold uppercase tracking-tighter text-slate-700">
                            Aura Executing: {toolName}
                        </p>
                        <p className="text-[10px] opacity-50 font-mono truncate max-w-[400px]">
                            Params: {args}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Standard Observation Results
    if (data.event === 'on_tool_end' || (data.output && data.output.length < 500)) {
        const obs = data.data?.output || data.output || "Observation synchronized.";
        return (
            <div className="text-[10px] text-muted-foreground ml-12 my-2 p-2 border-l-2 border-emerald-500 bg-emerald-50/30 italic animate-in fade-in">
                <div className="flex items-center gap-2">
                    <Server className="h-3 w-3 text-emerald-600" />
                    <span>{typeof obs === 'string' ? obs.substring(0, 100) : "Forensic data received."}...</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function MissionControlPage() {
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  /**
   * ENTERPRISE FOCUS REFERENCE
   * Used to programmatically target the command input for high-speed interaction.
   */
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 1. CONSUME THE SHARED EXECUTIVE STATE
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading, 
    data, 
    isReady, 
    businessId,
    userId 
  } = useCopilot();

  // 2. NEURAL ACTION HANDLER (Physical side-effects)
  useEffect(() => {
    if (data && data.length > 0) {
      const lastChunk = data[data.length - 1];
      try {
        const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;
        
        if (parsed.event === 'on_tool_end' && parsed.data?.output) {
          const output = typeof parsed.data.output === 'string' ? JSON.parse(parsed.data.output) : parsed.data.output;
          
          if (output.action === "navigate" && output.payload?.url) {
            toast.info(`Aura: Navigating to ${output.payload.url}`);
            router.push(output.payload.url);
          }
          
          if (output.action === "download_file" && output.payload?.content) {
            const link = document.createElement('a');
            link.href = `data:${output.payload.mimeType};base64,${output.payload.content}`;
            link.download = output.payload.fileName;
            link.click();
            toast.success(`Export Complete: ${output.payload.fileName}`);
          }
        }
      } catch (e) { /* Non-JSON chunk */ }
    }
  }, [data, router]);

  // 3. High-Precision Auto-scrolling
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

  /**
   * ENTERPRISE CONTROLLED FOCUS PROTOCOL
   * Forces the browser to focus the input box immediately once the 
   * forensic link is established.
   */
  useEffect(() => {
    if (isReady && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isReady]);

  // 4. Logic: Process incoming tool-call data chunks
  const agentStepsView = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((chunk: any, i: number) => {
        try {
            const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
            // Filter out chat model streams to focus on agent actions
            if (parsed.event === 'on_chat_model_stream' || parsed.event === 'on_agent_finish') return null;
            return <AgentStep key={`step-${i}`} data={parsed.event ? parsed : parsed.data || parsed} />;
        } catch (e) { return null; }
    }).filter(Boolean);
  }, [data]);

  // 5. Message Streaming Logic
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const streamingContent = isLoading && lastMessage?.role === 'assistant' ? lastMessage.content : null;
  const renderedMessages = streamingContent ? messages.slice(0, -1) : messages;

  /**
   * ROOT FIX: NEURAL UNLOCK
   * Decouple visually from 'isReady' so the button activates as you type.
   * handleSubmit in the context handles the actual link safety check.
   */
  const canSend = !isLoading && (input || '').trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-white border rounded-3xl shadow-2xl overflow-hidden min-h-[700px] border-slate-100">
      {/* Page Header: Forensic Identity Handshake */}
      <header className="px-8 py-5 border-b bg-slate-950 text-white flex items-center justify-between shrink-0 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Fingerprint size={120} className="text-emerald-500" />
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Activity className="h-6 w-6 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-50">Aura Mission Control</h1>
                <p className="text-[10px] text-slate-400 font-mono mt-1 tracking-widest uppercase">Autonomous Operational Kernel</p>
              </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono relative z-10">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-3 py-1">
                STATUS: {isReady ? 'ENCRYPTED' : 'HANDSHAKE'}
              </Badge>
              <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-800/50 px-3 py-1">
                BIZ_ID: {businessId ? businessId.slice(0, 12) : '----'}
              </Badge>
          </div>
      </header>

      <ScrollArea className="flex-1 p-8 bg-slate-50/20" ref={scrollAreaRef}>
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Empty State */}
          {isReady && messages.length === 0 && (
              <div className="py-32 text-center animate-in fade-in duration-1000">
                  <div className="relative inline-block mb-6">
                    <Sparkles size={80} className="text-slate-900 opacity-10 animate-pulse" />
                    <ShieldCheck size={32} className="absolute bottom-0 right-0 text-emerald-500" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.6em] text-slate-400">Awaiting Forensic Protocol</p>
              </div>
          )}

          {/* Identity Sync Loader */}
          {!isReady && (
            <div className="text-center py-40 animate-in fade-in">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-emerald-500 mb-6" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Synchronizing Sovereignty Context...</p>
            </div>
          )}

          {/* Rendered Past Conversation */}
          {isReady && renderedMessages.map((message: any) => ( 
            <div key={message.id} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-left-2')}>
              {message.role === 'assistant' && (
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shrink-0 border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400"/>
                </div>
              )}
              <div className={cn(
                'max-w-[80%] rounded-3xl p-5 text-sm shadow-md border transition-all leading-relaxed', 
                message.role === 'user' 
                    ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none' 
                    : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-emerald-400">
                    {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                </ReactMarkdown>
              </div>
              {message.role === 'user' && (
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                    <User className="h-5 w-5 text-slate-500"/>
                </div>
              )}
            </div>
          ))}

          {/* Live Thought Process Visualization */}
          {agentStepsView}

          {/* Active Streaming Message */}
          {isLoading && streamingContent && (
             <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shrink-0 border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400"/>
                </div>
               <div className={cn('max-w-[80%] rounded-3xl p-5 text-sm bg-white border border-emerald-100 rounded-tl-none shadow-xl')}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
                    {String(streamingContent)}
                  </ReactMarkdown>
                  <div className="flex items-center gap-3 mt-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" /> Aura is synthesizing forensic data...
                  </div>
               </div>
             </div>
          )}
        </div>
      </ScrollArea>

      {/* Controller: Sovereign Command Input */}
      <div className="border-t bg-white p-8 shadow-[0_-10px_50px_rgba(0,0,0,0.04)] relative z-20">
        <form 
          onSubmit={(e) => {
              e.preventDefault();
              if (canSend) handleSubmit(e);
          }} 
          className="flex items-center gap-4 max-w-4xl mx-auto"
        >
          <div className="relative flex-1">
              <Input 
                ref={inputRef}
                value={input} 
                onChange={handleInputChange}
                placeholder={!isReady ? "Initializing Secure Handshake..." : "Command Aura to audit your ledger..."} 
                // ROOT FIX: Only disable during active AI thinking. Keyboard is unlocked during handshake.
                disabled={isLoading} 
                className="h-16 rounded-2xl bg-slate-50 border-none shadow-inner text-base px-8 focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all pr-16" 
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <ShieldCheck size={20} className={cn("transition-colors", isReady ? "text-emerald-500" : "text-slate-300")} />
              </div>
          </div>
          <Button 
            type="submit" 
            disabled={!canSend} 
            className={cn(
                "h-16 w-16 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center shrink-0",
                canSend ? "bg-slate-950 hover:bg-slate-800" : "bg-slate-100 grayscale opacity-40"
            )}
          >
             {isLoading ? <Loader2 className="h-7 w-7 animate-spin text-emerald-500" /> : <Send className="h-7 w-7 text-white" />}
          </Button>
        </form>
        <p className="text-center mt-5 text-[9px] uppercase tracking-[0.3em] text-slate-400 font-bold">
            Multi-Tenant Forensic Isolation Verified • 256-bit Logic Encryption
        </p>
      </div>
    </div>
  );
}