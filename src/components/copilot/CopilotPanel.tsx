'use client';

/**
 * --- AURA COPILOT PANEL ---
 * The chat surface itself (header + thread + composer). Mounted inside
 * CopilotDock, which handles the responsive slide-in (desktop) / full
 * popup (mobile) shell and backdrop around it.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Sparkles, Send, User, Loader2, Cpu,
  FileDown, Compass, X, ShieldCheck,
  Presentation,
} from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';

import { useCopilot } from '@/context/CopilotContext';
import AuraBoardroom from './AuraBoardroom';

const downloadFileFromBase64 = (fileName: string, mimeType: string, content: string): void => {
  try {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${content}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${fileName}`);
  } catch (error) {
    toast.error("Couldn't finish that download.");
  }
};

const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  if (!data) return null;

  try {
    const outputData = data.output ? (typeof data.output === 'string' ? JSON.parse(data.output) : data.output) : {};

    const actionConfigs: Record<string, { icon: any, color: string, label: string }> = {
      navigate: { icon: Compass, color: "text-sky-600 bg-sky-50 border-sky-100", label: "Navigating" },
      download_file: { icon: FileDown, color: "text-emerald-600 bg-emerald-50 border-emerald-100", label: "File ready" },
      prepare_boardroom_presentation: { icon: Presentation, color: "text-blue-600 bg-blue-50 border-blue-100", label: "Preparing boardroom" },
      request_confirmation: { icon: ShieldCheck, color: "text-amber-600 bg-amber-50 border-amber-100", label: "Needs your confirmation" }
    };

    const config = actionConfigs[outputData.action];

    if (config) {
      const Icon = config.icon;
      return (
        <div className={cn("text-xs ml-11 my-2 p-3 border rounded-2xl animate-in fade-in slide-in-from-left-2 shadow-sm", config.color)}>
          <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-[11px]">{config.label}</p>
              <p className="font-mono text-[9px] opacity-70 truncate max-w-[240px]">
                {outputData.payload?.url || outputData.payload?.fileName || "Working on it..."}
              </p>
            </div>
          </div>
        </div>
      );
    }
  } catch (e) { }

  if (data.tool || data.event === 'on_agent_action') {
    const toolName = data.tool || data.data?.tool;
    return (
      <div className="text-[10px] text-muted-foreground ml-11 my-1.5 p-2.5 border rounded-xl bg-slate-50 border-dashed border-slate-200">
        <div className="flex items-center gap-2">
          <Cpu className="h-3 w-3 text-emerald-500 animate-pulse" />
          <p className="font-medium text-slate-500 text-[10px]">
             Using: {toolName?.replace(/_/g, ' ') || "a tool"}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const SUGGESTIONS = [
  'Summarize this week\'s sales',
  'Any anomalies in the ledger?',
  'Draft a report for the board',
];

export default function CopilotPanel() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [boardroomData, setBoardroomData] = useState<any | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const {
    messages = [],
    input = '',
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: isChatLoading = false,
    data: streamData = [],
    isReady = false,
    closeCopilot,
  } = useCopilot();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (streamData && streamData.length > 0) {
      const lastChunk = streamData[streamData.length - 1];
      try {
        const parsed = typeof lastChunk === 'string' ? JSON.parse(lastChunk) : lastChunk;

        if (parsed.event === 'on_error' || parsed.error) {
            toast.error(parsed.data?.error || parsed.error || "Something went wrong.");
        }

        if (parsed.event === 'on_tool_end' && parsed.data?.output) {
          const output = typeof parsed.data.output === 'string' ? JSON.parse(parsed.data.output) : parsed.data.output;
          if (output.action === "navigate") router.push(output.payload.url);
          if (output.action === "download_file") downloadFileFromBase64(output.payload.fileName, output.payload.mimeType, output.payload.content);
          if (output.action === "prepare_boardroom_presentation") setBoardroomData(output.payload);
        }
      } catch (e) { }
    }
  }, [streamData, router]);

  useEffect(() => {
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.closest('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
        }
    }
  }, [messages, isChatLoading, streamData]);

  useEffect(() => {
    if (isReady && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isReady]);

  if (!hasMounted) return null;

  const safeInput = (input || '').toString();
  const hasText = safeInput.trim().length > 0;
  const isButtonDisabled = isChatLoading || !hasText;

  return (
    <div className="h-full w-full flex flex-col bg-white overflow-hidden relative font-sans">

      <AnimatePresence mode="wait">
        {boardroomData && (
          <AuraBoardroom
            presenter={boardroomData.presenter_role}
            title={boardroomData.meeting_title}
            slides={boardroomData.slides}
            onClose={() => setBoardroomData(null)}
          />
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center shadow-md">
              <Sparkles className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-blue-400" />
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
              isReady ? "bg-blue-500" : "bg-amber-400 animate-pulse"
            )} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">Aura Assistant</h2>
            <p className="text-[11px] text-slate-400 truncate">{isReady ? "Online — ask me anything" : "Connecting..."}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={closeCopilot}
            aria-label="Close chat"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* CONTENT AREA */}
      <ScrollArea className="flex-grow bg-slate-50/60">
        <div className="space-y-5 max-w-2xl mx-auto p-4 sm:p-6">

            {isReady && messages.length === 0 && (
                <div className="py-10 sm:py-14 text-center">
                    <div className="relative inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 shadow-xl mb-5">
                       <Sparkles className="h-7 w-7 sm:h-9 sm:w-9 text-blue-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">How can I help?</h3>
                    <p className="text-[13px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Ask about your sales, ledger, inventory, or anything else across your business.
                    </p>

                    <div className="flex flex-col gap-2 mt-7 max-w-xs mx-auto">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setInput?.(s)}
                                className="w-full text-left px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-all shadow-sm"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {messages.map((m: any) => (
              <div key={m.id} className={cn('flex items-end gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start animate-in slide-in-from-bottom-2 duration-300')}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                )}
                <div className={cn(
                    'rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 max-w-[80%] text-[13px] sm:text-[14px] shadow-sm leading-relaxed',
                    m.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-md'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:m-0 prose-strong:text-blue-600 prose-code:bg-slate-100 prose-code:p-1 prose-code:rounded prose-table:border prose-table:rounded-xl prose-th:bg-slate-50 prose-th:p-3 prose-td:p-3"
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {isChatLoading && streamData && streamData.length > 0 && (
                <div className="space-y-1">
                    {streamData.map((chunk: any, i: number) => (
                        <AgentStep key={`step-${i}`} data={chunk.data || chunk} />
                    ))}
                </div>
            )}

            {isChatLoading && (
                <div className="flex items-center gap-2.5 ml-9 sm:ml-11">
                    <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-full px-3.5 py-2.5 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" />
                    </div>
                </div>
            )}

            <div ref={scrollRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* COMPOSER */}
      <footer className="p-3 sm:p-4 border-t border-slate-100 bg-white shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-blue-50/60 border border-blue-200 rounded-full p-1.5 pl-4 sm:pl-5 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 transition-all"
        >
          <input
            ref={inputRef}
            value={safeInput}
            onChange={handleInputChange}
            placeholder={!isReady ? "Connecting..." : "Ask Aura anything..."}
            disabled={isChatLoading}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] sm:text-sm text-slate-900 placeholder:text-slate-400 h-9"
          />
          <button
            type="submit"
            disabled={isButtonDisabled}
            aria-label="Send message"
            className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-90",
                !isButtonDisabled ? "bg-slate-900 hover:bg-black text-white shadow-md" : "bg-slate-200 text-slate-400"
            )}
          >
            {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </footer>
    </div>
  );
}
