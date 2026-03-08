'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Sparkles, Send, Bot, User, Loader2, Cog, Server, 
  FileDown, Pilcrow, Compass, Fingerprint, Zap, Activity, ShieldCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';
import { useCopilot } from '@/context/CopilotContext'; 

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

const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  if (!data) return null;
  
  try {
    const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};
    
    if (outputData.action === "navigate") {
        return (
          <div className="text-xs text-sky-500 ml-11 my-2 p-3 border rounded-xl bg-sky-500/5 border-sky-500/20 animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 flex-shrink-0 animate-spin-slow" />
              <div>
                <p className="font-bold uppercase tracking-tighter text-sky-600">Autonomous Navigation</p>
                <p className="font-mono text-[10px] opacity-70">Path: {outputData.payload?.url}</p>
              </div>
            </div>
          </div>
        );
    }

    if (outputData.action === "download_file") {
        return (
          <div className="text-xs text-emerald-500 ml-11 my-2 p-3 border rounded-xl bg-emerald-500/5 border-emerald-500/20 animate-in fade-in slide-in-from-left-2">
            <div className="flex items-center gap-2">
              <FileDown className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-tighter text-emerald-600">Data Extraction Complete</p>
                <p className="text-[10px] opacity-70">Buffer ready: {outputData.payload?.fileName}</p>
              </div>
            </div>
          </div>
        );
    }

    if (outputData.action === "present_draft") {
      return (
        <div className="text-xs text-fuchsia-500 ml-11 my-2 p-3 border rounded-xl bg-fuchsia-500/5 border-fuchsia-500/20 animate-in fade-in slide-in-from-left-2">
          <div className="flex items-center gap-2">
            <Pilcrow className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-bold uppercase tracking-tighter text-fuchsia-600">Synthesizing Communication</p>
              <p className="text-[10px] opacity-70">Forensic draft presented for review.</p>
            </div>
          </div>
        </div>
      );
    }
  } catch (e) { }

  if (data.tool) {
    return (
      <div className="text-[10px] text-muted-foreground ml-11 my-2 p-3 border rounded-xl bg-slate-50 border-dashed animate-pulse">
        <div className="flex items-center gap-2">
          <Cog className="h-3 w-3 animate-spin text-emerald-600" />
          <div>
            <p className="font-bold uppercase tracking-widest text-slate-500">Aura Core Executing: {data.tool}</p>
            <p className="opacity-50 truncate max-w-[200px] font-mono">{JSON.stringify(data.toolInput)}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default function CopilotPanel() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading: isChatLoading, 
    data: streamData, 
    isReady: isContextReady,
    businessId,
    userId
  } = useCopilot();

  useEffect(() => {
    if (streamData && streamData.length > 0) {
      const lastChunk = streamData[streamData.length - 1];
      try {
        const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;
        
        if (parsed.event === 'on_tool_end' && parsed.data?.output) {
          const output = typeof parsed.data.output === 'string' ? JSON.parse(parsed.data.output) : parsed.data.output;
          
          if (output.action === "navigate" && output.payload?.url) {
            toast.info(`Aura: Redirecting to ${output.payload.url}`);
            router.push(output.payload.url);
          }
          
          if (output.action === "download_file" && output.payload?.content) {
            downloadFileFromBase64(
                output.payload.fileName, 
                output.payload.mimeType, 
                output.payload.content
            );
          }
        }
      } catch (e) { }
    }
  }, [streamData, router]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatLoading, streamData]);

  const isLinked = !!businessId && !!userId;
  const canSend = !isChatLoading && (input || '').trim().length > 0;
  const isLocked = !isLinked || !isContextReady;

  useEffect(() => {
    if (!isLocked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLocked]);

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden shadow-2xl border-l">
      <header className="p-6 border-b bg-slate-950 text-white flex flex-col gap-1 shrink-0 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Fingerprint size={80} className="text-emerald-500" />
        </div>
        <div className="flex items-center justify-between relative z-10">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter italic text-emerald-400">
                <Zap className="h-5 w-5 fill-emerald-400 animate-pulse"/> Aura Intelligence
            </h2>
            <div className="flex items-center gap-2">
               {isContextReady && <Badge className="bg-emerald-600 text-[8px] border-none px-2 py-0.5 animate-in fade-in">ENCRYPTED</Badge>}
               <Badge className="bg-slate-800 text-slate-400 text-[8px] border-none px-2 py-0.5">v10.5 PRO</Badge>
            </div>
        </div>
        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest relative z-10">Autonomous Forensic Co-Pilot</p>
      </header>
      
      <ScrollArea className="flex-grow p-6 bg-slate-50/30">
        <div className="space-y-6 max-w-2xl mx-auto">
            {!isContextReady && messages.length === 0 && (
                <div className="py-32 text-center animate-in fade-in duration-700">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-emerald-500 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Synchronizing Forensic ID...</p>
                </div>
            )}

            {isContextReady && messages.length === 0 && (
                <div className="py-24 text-center opacity-10 transition-all duration-1000 grayscale">
                    <Bot size={80} className="mx-auto mb-4 animate-bounce text-slate-950" />
                    <p className="text-xs font-black uppercase tracking-[0.6em] text-slate-950">Awaiting Forensic Instruction</p>
                </div>
            )}

            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex items-start gap-4', m.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-2')}>
                {m.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shrink-0 border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                )}
                <div className={cn(
                    'rounded-2xl p-4 max-w-[85%] text-sm shadow-sm border transition-all leading-relaxed',
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

            {isChatLoading && streamData && streamData.length > 0 && (
                <div className="space-y-2 mt-4">
                    {streamData.map((chunk: any, i: number) => (
                        <AgentStep key={`thought-${i}`} data={chunk.data || chunk} />
                    ))}
                </div>
            )}

            {isChatLoading && (
                <div className="flex items-center gap-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-14 py-4 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" /> Aura is synthesizing sector data...
                </div>
            )}

            <div ref={scrollRef} className="h-10" />
        </div>
      </ScrollArea>
      
      <div className="p-6 border-t bg-white shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] relative z-20">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }} 
          className="flex items-center gap-3"
        >
          <Input 
            ref={inputRef}
            value={input || ''} 
            onChange={handleInputChange} 
            placeholder={isLocked ? "Neural Link Synchronizing..." : "Ask Aura to audit your ledger..."} 
            className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all text-base px-6"
            disabled={isChatLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!canSend} 
            className={cn(
                "h-14 w-14 rounded-2xl shadow-xl transition-all shrink-0 active:scale-95",
                canSend ? "bg-slate-950 hover:bg-slate-800 scale-100" : "bg-slate-100 grayscale opacity-50"
            )}
          >
            {isChatLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
        
        <div className="flex justify-between items-end mt-5 px-1 border-t pt-4 border-slate-50">
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">
                    <Activity className="h-3 w-3 text-emerald-500" /> 
                    Business ID: <span className="font-mono text-emerald-600 bg-emerald-50 px-1 rounded">
                      {businessId ? businessId.slice(0, 18) : 'IDENTIFYING...'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">
                    <Fingerprint className="h-3 w-3 text-sky-500" /> 
                    Forensic ID: <span className="font-mono text-sky-600 bg-sky-50 px-1 rounded">
                      {userId ? userId.slice(0, 18) : 'VERIFYING...'}
                    </span>
                </div>
            </div>
            <div className="text-[8px] uppercase tracking-tighter font-black text-slate-300 text-right leading-tight">
                Isolated Executive Context<br/>11 Industry Logic Active
            </div>
        </div>
      </div>
    </div>
  );
}