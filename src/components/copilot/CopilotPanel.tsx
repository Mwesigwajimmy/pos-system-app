'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, Cog, Server, 
  FileDown, Pilcrow, Compass, Fingerprint, Zap, Activity 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';
import { useCopilot } from '@/context/CopilotContext'; 
import { useUserProfile } from '@/hooks/useUserProfile';

// --- Types ---
type MessageWithId = { id: string; role: string; content: string | any };

// --- Utility: Forensic File Generation ---
const downloadFileFromBase64 = (fileName: string, mimeType: string, content: string): void => {
  try {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${content}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Forensic Export Complete: ${fileName}`);
  } catch (error) {
    toast.error("Data Stream Error: Could not finalize download.");
    console.error("Download Error:", error);
  }
};

// --- Component: AgentStep (Visualizing Autonomous Thinking) ---
const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  try {
    const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};
    
    if (outputData.action === "navigate") {
        return (
          <div className="text-xs text-sky-500 ml-11 my-2 p-3 border rounded-md bg-sky-500/10 border-sky-500/20 animate-pulse">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-tighter">Autonomous Navigation</p>
                <p className="font-mono text-[10px]">Path: {outputData.payload.url}</p>
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
                <p className="text-[10px]">Buffer ready: {outputData.payload.fileName}</p>
              </div>
            </div>
          </div>
        );
    }
  } catch (e) { /* Non-JSON output - handled as raw observation below */ }

  if (data.tool) {
    return (
      <div className="text-[10px] text-muted-foreground ml-11 my-2 p-3 border rounded-md bg-slate-50 border-dashed">
        <div className="flex items-center gap-2">
          <Cog className="h-3 w-3 animate-spin text-emerald-600" />
          <div>
            <p className="font-bold uppercase tracking-widest text-slate-600">Executing: {data.tool}</p>
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
export default function CopilotPanel() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 1. Fetch Real-time Profile Data (The Ground Truth)
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();
  
  // 2. Map IDs based on Enterprise Architecture
  // Note: tenant_id and business_id are usually mirrors in your system
  const businessId = (userProfile as any)?.business_id || ''; 
  const userId = (userProfile as any)?.id || (userProfile as any)?.user_id || '';
  const tenantId = (userProfile as any)?.tenant_id || businessId;

  // 3. Connect to Shared AI State
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading: isChatLoading, 
    data: streamData, 
    isReady: isContextReady 
  } = useCopilot();

  // Handle auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatLoading, streamData]);

  // Logic: Only unlock when all 3 required IDs are resolved
  const isLinked = !!businessId && !!userId;
  const canSend = !isChatLoading && isLinked && (input || '').trim().length > 0;
  const isLocked = !isLinked || isProfileLoading;

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden shadow-2xl">
      {/* Forensic Identity Header */}
      <header className="p-6 border-b bg-slate-950 text-white flex flex-col gap-1 shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter italic text-emerald-400">
                <Fingerprint className="h-5 w-5 animate-pulse"/> Aura Intelligence
            </h2>
            <Badge className="bg-emerald-600 text-[8px] border-none px-2 py-0.5">v10.5 PRO</Badge>
        </div>
        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Autonomous Forensic Co-Pilot</p>
      </header>
      
      {/* Neural Link Feed */}
      <ScrollArea className="flex-grow p-4 bg-slate-50/30">
        <div className="space-y-6">
            {messages.length === 0 && (
                <div className="py-20 text-center opacity-20 transition-all duration-1000">
                    <Bot size={64} className="mx-auto mb-4 animate-bounce text-slate-950" />
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-950">Awaiting Forensic Command</p>
                </div>
            )}

            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex items-start gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shrink-0 border border-emerald-500/20">
                    <Zap className="h-5 w-5 text-emerald-400 fill-current" />
                  </div>
                )}
                <div className={cn(
                    'rounded-2xl p-4 max-w-[85%] text-sm shadow-sm border transition-all',
                    m.role === 'user' 
                        ? 'bg-primary text-primary-foreground border-primary rounded-tr-none' 
                        : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                )}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900">
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

            {/* Visualize Autonomous Thought Steps */}
            {isChatLoading && streamData && streamData.length > 0 && (
                <div className="space-y-2">
                    {streamData.map((chunk: any, i: number) => (
                        <AgentStep key={`thought-${i}`} data={chunk} />
                    ))}
                </div>
            )}

            {isChatLoading && (
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-11 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Aura is processing sector data...
                </div>
            )}

            <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>
      
      {/* Sovereignty Control Area */}
      <div className="p-4 border-t bg-white shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (!isLinked) {
              toast.error("Neural Link Offline: Business context could not be established.");
              return;
            }
            if (canSend) handleSubmit(e);
          }} 
          className="flex items-center gap-2"
        >
          <Input 
            value={input} 
            onChange={handleInputChange} 
            placeholder={isLocked ? "Establishing Secure Link..." : "Ask Aura to analyze ledger drift..."} 
            className="h-12 rounded-xl bg-slate-50 border-none shadow-inner focus-visible:ring-emerald-500"
            disabled={isLocked || isChatLoading}
            autoFocus
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!canSend} 
            className={cn(
                "h-12 w-12 rounded-xl shadow-xl transition-all shrink-0",
                canSend ? "bg-slate-950 hover:bg-slate-800" : "bg-slate-200"
            )}
          >
            {isChatLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
        
        {/* Multi-Tenant Handshake Status */}
        <div className="flex justify-between items-center mt-3 px-1">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">
                    <Activity className="h-3 w-3 text-emerald-500" /> 
                    Business ID: <span className="font-mono text-emerald-600">{businessId ? businessId.slice(0, 15) : 'SEARCHING...'}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">
                    <User className="h-3 w-3 text-sky-500" /> 
                    User ID: <span className="font-mono text-sky-600">{userId ? userId.slice(0, 15) : 'VERIFYING...'}</span>
                </div>
            </div>
            <div className="text-[8px] uppercase tracking-tighter font-bold text-slate-300 text-right">
                11 Sector Logic Active<br/>Isolated Forensic Context
            </div>
        </div>
      </div>
    </div>
  );
}