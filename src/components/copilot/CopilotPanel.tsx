// src/components/copilot/CopilotPanel.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react'; 
import { type CoreMessage } from 'ai'; // Use CoreMessage type
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { Sparkles, Send, Bot, User, Loader2, Cog, Server, FileDown, Pilcrow, Compass } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import remarkGfm from 'remark-gfm';

// FIX: Define a type that extends CoreMessage to explicitly include the 'id'
// which is guaranteed by the useChat hook for rendering purposes.
type MessageWithId = CoreMessage & { id: string };

// --- Utility to handle downloading files sent by the AI ---
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
// FIX: The data structure from the shim is AgentStep = { event: string; data: any }
const AgentStep = ({ data }: { data: any }): React.ReactNode => {
  // Check for known UI Actions which are wrapped in the 'output' of the tool
  try {
    const outputData = data.output ? JSON.parse(data.output) : {};
    if (outputData.action === "navigate") {
        const url = outputData.payload.url;
        return (
          <div className="text-xs text-sky-500 ml-9 my-2 p-3 border rounded-md bg-sky-500/10 border-sky-500/20">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Navigating to page</p>
                <p className="font-mono text-xs">URL: `{url}`</p>
              </div>
            </div>
          </div>
        );
    }

    if (outputData.action === "download_file") {
        const { fileName } = outputData.payload;
        return (
          <div className="text-xs text-emerald-500 ml-9 my-2 p-3 border rounded-md bg-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center gap-2">
              <FileDown className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">File Generated</p>
                <p>Download of `{fileName}` has been initiated.</p>
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


  // Direct Agent Action (before tool execution)
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

  // Tool Observation (After tool execution, output is the raw tool return)
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

// --- The Revolutionary Command Center ---
const CopilotPanel = forwardRef((props, ref) => {
  const router = useRouter();
  const { data: userProfile } = useUserProfile();
  // FIX: Cast to any for the property access
  const businessId = (userProfile as any)?.business_id || ''; 
  const userId = (userProfile as any)?.user_id || '';

  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null); // Ref for the form to submit imperatively
  const [agentSteps, setAgentSteps] = useState<any[]>([]);

  // FIX: Use the 'any' type cast for the hook result
  const chat: any = useChat({
    api: '/api/copilot',
    // FIX: Pass both businessId and userId
    body: { businessId, userId }, 
    // This hook signature is for the custom events being streamed from the shim
    onResponse: () => {
      setAgentSteps([]); // Clear previous steps on a new message
    },
    onData: (chunk: string) => {
      try {
        const parsedEvent = JSON.parse(chunk);
        
        // Handle UI Actions directly from the stream (Crucial for real-time navigation/downloads)
        if (parsedEvent.event === 'on_tool_end' && parsedEvent.data.output) {
          try {
            const toolOutput = JSON.parse(parsedEvent.data.output);
            if (toolOutput.action === "navigate" && toolOutput.payload.url) {
              toast.info(`Aura is navigating you to ${toolOutput.payload.url}...`);
              router.push(toolOutput.payload.url);
            }
            if (toolOutput.action === "download_file" && toolOutput.payload.fileName) {
              const { fileName, mimeType, content } = toolOutput.payload;
              downloadFileFromBase64(fileName, mimeType, content);
            }
            // Add a clean step for the UI after a successful action
            setAgentSteps(prev => [...prev, { output: `Action completed successfully: ${toolOutput.action}.` }]);
          } catch (e) {
            // Ignore if it's just a raw tool observation and not a UI action object
          }
        }
        
        // Render Agent Steps: on_agent_action contains tool/toolInput. on_tool_end contains output.
        if (parsedEvent.event === 'on_agent_action' || parsedEvent.event === 'on_tool_end') {
          setAgentSteps(prev => [...prev, parsedEvent.data]);
        }
      } catch (e) {
        // This is fine, it means it's a raw token and not a structured event.
      }
    },
    onError: (err: Error) => toast.error(`AI Error: ${err.message}`), // FIX: Explicit type on error
  } as any);

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading, setMessages } = chat;

  // FIX: Implement startAIAssistance to set prompt AND submit form
  useImperativeHandle(ref, () => ({
    startAIAssistance: (prompt: string): void => {
      // 1. Set the new user prompt in the input field
      setInput(prompt);
      // 2. Clear any previous steps
      setAgentSteps([]);
      // 3. Immediately submit the form
      // NOTE: useChat's handleSubmit function uses the current 'input' state, 
      // so we should rely on that after setting it.
      if (formRef.current) {
          formRef.current.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      } else {
          // Fallback if ref isn't ready
          handleSubmit(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agentSteps]);

  const memoizedAgentSteps = useMemo(() => {
    return agentSteps.map((step, i) => <AgentStep key={`step-${i}`} data={step} />);
  }, [agentSteps]);

  const canSend = !isLoading && businessId && input.trim();
  
  return (
    <div className="h-full w-full flex flex-col bg-muted/20 border-l">
      <header className="p-4 border-b bg-background flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary"/> Aura Co-Pilot
        </h2>
        <p className="text-sm text-muted-foreground">Your autonomous agent is online.</p>
      </header>
      
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
            {messages.map((m: MessageWithId) => ( // <-- FIXED: Using MessageWithId
              <div key={m.id} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                {m.role === 'assistant' && (
                  <>
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg p-3 bg-background max-w-[85%] prose prose-sm break-words prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0">
                      {/* NOTE: m.content can be string or Part[] here */}
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                      </ReactMarkdown>
                    </div>
                  </>
                )}
                {m.role === 'user' && (
                  <>
                    <div className={cn('rounded-lg p-3 max-w-[85%] break-words', 'bg-primary text-primary-foreground')}>
                      {/* FIX: m.content is CoreMessageContent, convert to string */}
                      {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)} 
                    </div>
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {isLoading && memoizedAgentSteps}

            <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-background flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2" ref={formRef}> {/* Add ref to form */}
          <Input 
            value={input} 
            onChange={handleInputChange} 
            placeholder={isLoading ? "Aura is thinking..." : "Ask Aura to do anything..."} 
            disabled={!businessId || isLoading} // Only disable if no businessId or is loading
            aria-label="User command input"
          />
          <Button type="submit" size="icon" disabled={!canSend} aria-label="Send command">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
});

CopilotPanel.displayName = "CopilotPanel";

export default CopilotPanel;