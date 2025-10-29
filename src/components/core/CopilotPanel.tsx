'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Send, Bot, User, Loader2, Cog, Server, FileDown, Pilcrow, Compass } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';
import { useCopilot, type CoreMessage } from '@/context/CopilotContext'; 
import { useUserProfile } from '@/hooks/useUserProfile'; // ADDED: Ensure this import is present

// FIX: Define a type that intersects CoreMessage with a guaranteed 'id' property.
// This tells TypeScript that although CoreMessage is a union, at this point, 
// the elements you get from the context are safe for use with a 'key'.
type MessageWithId = CoreMessage & { id: string };


// --- Utility to handle downloading files sent by the AI ---
// NOTE: This must remain here or be moved to a shared utility file.
const downloadFileFromBase64 = (fileName: string, mimeType: string, content: string): void => {
  try {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${content}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Download started for ${fileName}`);
  } catch (error) {
    toast.error("Download failed. The file data may be corrupt.");
    console.error("Download Error:", error);
  }
};

// --- Component to render the AI's thought process (tool usage) ---
// FIX: Re-integrated the full, robust rendering logic
const AgentStep = ({ data }: { data: any }): React.ReactNode => {
    // Check for known UI Actions which are wrapped in the 'output' of the tool
    try {
      const outputData = data.output ? JSON.parse(data.output) : {};

      if (outputData.action === "navigate") {
        return (
          <div className="text-xs text-sky-500 ml-9 my-2 p-3 border rounded-md bg-sky-500/10 border-sky-500/20">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Navigating to page</p>
                <p className="font-mono text-xs">URL: `{outputData.payload.url}`</p>
              </div>
            </div>
          </div>
        );
      }
      
      if (outputData.action === "download_file") {
        return (
          <div className="text-xs text-emerald-500 ml-9 my-2 p-3 border rounded-md bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center gap-2">
              <FileDown className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">File Generated</p>
                <p>Download of `{outputData.payload.fileName}` has been initiated.</p>
              </div>
            </div>
          </div>
        );
      }

      if (outputData.action === "present_draft") {
        return (
          <div className="text-xs text-fuchsia-500 ml-9 my-2 p-3 border rounded-md bg-fuchsia-500/10 border-fuchsia-500/20">
            <div className="flex items-center gap-2">
              <Pilcrow className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Drafting Communication</p>
                <p>Presenting draft to you for review and editing.</p>
              </div>
            </div>
          </div>
        );
      }
    } catch (e) { /* ignore parse errors for non-JSON output */ }


    // Direct Agent Action (tool invocation)
    if (data.tool) {
        return (
          <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-background">
            <div className="flex items-center gap-2">
              <Cog className="h-4 w-4 animate-spin flex-shrink-0" />
              <div>
                <p className="font-semibold">Using Tool: `{data.tool}`</p>
                <p className="whitespace-pre-wrap break-all opacity-80">Input: {JSON.stringify(data.toolInput)}</p>
              </div>
            </div>
          </div>
        );
    }

    // Tool Observation (raw output)
    if (data.output) {
        return (
          <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-background">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 flex-shrink-0" />
              <p className="font-semibold">Observation</p>
            </div>
            <pre className="mt-2 p-2 bg-muted rounded-md text-xs whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
              <code>{data.output}</code>
            </pre>
          </div>
        );
    }

    return null;
};

// --- The Revolutionary Command Center UI Component ---
export default function CopilotPanel() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // All state and logic now comes from the global hook.
  const { messages, input, handleInputChange, handleSubmit, isLoading, data } = useCopilot();
  
  // FIX 1: Get actual businessId from hook to enable the form
  const { data: userProfile } = useUserProfile();
  const businessId = (userProfile as any)?.business_id || ''; 
  // END FIX 1

  // FIX: This useEffect now only handles router navigation/downloads
  useEffect(() => {
    // Only run if the data array exists and has content
    if (data && data.length > 0) {
      const lastChunk = data[data.length - 1];
      try {
        const parsedEvent = JSON.parse(lastChunk);
        
        // This is a duplicate of the AgentStep logic, but necessary to trigger the UI actions once
        if (parsedEvent.event === 'on_tool_end' && parsedEvent.data.output) {
          const toolOutput = JSON.parse(parsedEvent.data.output);
          if (toolOutput.action === "navigate" && toolOutput.payload.url) {
            toast.info(`Aura is navigating you to ${toolOutput.payload.url}...`);
            router.push(toolOutput.payload.url);
          }
          if (toolOutput.action === "download_file" && toolOutput.payload.fileName) {
            const { fileName, mimeType, content } = toolOutput.payload;
            downloadFileFromBase64(fileName, mimeType, content);
          }
        }
      } catch (e) { /* Not a JSON event, or not a final action */ }
    }
  }, [data, router]);
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, data]); // FIX: Listen to data instead of agentSteps

  // FIX: Memoize the Agent Steps display
  const memoizedAgentSteps = useMemo(() => {
    if (!data) return [];
    // The data array contains stringified event chunks. We need to parse them and get the 'data' payload.
    return data.map((chunk, i) => {
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.event === 'on_chat_model_stream' || parsed.event === 'on_agent_finish') return null; // Skip non-action events
        return <AgentStep key={`step-${i}`} data={parsed.data} />;
      } catch (e) { return null; }
    }).filter(Boolean);
  }, [data]);

  // Determine which message content to show (streaming vs final)
  // FIX: Cast messages to CoreMessage[] for safety on the streaming logic
  const streamingMessage = isLoading && messages.length > 0 ? (messages[messages.length - 1] as CoreMessage) : null;
  const renderedMessages = streamingMessage ? messages.slice(0, -1) : messages;

  const canSend = !isLoading && input.trim() && businessId;
  const isDisabled = !businessId || isLoading;
  
  return (
    <>
      <header className="p-4 border-b bg-background flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary"/> Aura Co-Pilot
        </h2>
        <p className="text-sm text-muted-foreground">Your autonomous agent is online.</p>
      </header>
      
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
            {/* FIX: Cast renderedMessages to MessageWithId[] to resolve the 'id' key issue */}
            {(renderedMessages as MessageWithId[]).map((m) => ( 
              <div key={m.id} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                {m.role === 'assistant' && (
                  <>
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Sparkles className="h-4 w-4" /></div>
                    <div className="rounded-lg p-3 bg-background max-w-[85%] prose prose-sm break-words prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                      </ReactMarkdown>
                    </div>
                  </>
                )}
                {m.role === 'user' && (
                  <>
                    <div className={cn('rounded-lg p-3 max-w-[85%] break-words', 'bg-primary text-primary-foreground')}>
                      {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold flex-shrink-0"><User className="h-4 w-4" /></div>
                  </>
                )}
              </div>
            ))}
            
            {/* Display streaming text */}
            {isLoading && streamingMessage && (
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Sparkles className="h-4 w-4" /></div>
                    <div className="rounded-lg p-3 bg-background max-w-[85%] prose prose-sm break-words prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {typeof streamingMessage.content === 'string' ? streamingMessage.content : JSON.stringify(streamingMessage.content)}
                        </ReactMarkdown>
                        <Loader2 className="h-4 w-4 animate-spin text-primary mt-2" />
                    </div>
                </div>
            )}
            
            {/* Display agent steps */}
            {isLoading && memoizedAgentSteps}
            
            <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-background flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input 
            value={input} 
            onChange={handleInputChange} 
            placeholder={isDisabled ? "Loading business context..." : "Ask Aura to do anything..."} 
            disabled={isDisabled}
            aria-label="User command input"
          />
          <Button type="submit" size="icon" disabled={!canSend} aria-label="Send command">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </>
  );
}