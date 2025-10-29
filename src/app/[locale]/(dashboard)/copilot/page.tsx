'use client';

import { useState, FormEvent, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Vercel AI SDK Imports (The Core) ---
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
// --- Custom Hook for REAL Business Context ---
import { useUserProfile } from '@/hooks/useUserProfile';
// --- Lucide Icons for Agent Steps ---
import { Sparkles, Send, User, Loader2, Server, Cog } from 'lucide-react';


// --- AgentStep Component (Renders the real-time tool execution) ---
const AgentStep = ({ data }: { data: any }) => {
    if (data.event === 'on_agent_action') {
        const action = data.data.data[0]; // FIX: Extract tool call from array structure yielded by the shim
        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-accent">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin" />
                    <div>
                        <p className="font-semibold">Tool Call: `{action.function.name}`</p>
                        <p>Input: `{action.function.arguments}`</p>
                    </div>
                </div>
            </div>
        );
    }
    if (data.event === 'on_tool_end') {
        const observation = data.data.output;
        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-accent">
                <div className="flex items-center gap-2"><Server className="h-4 w-4" /><p className="font-semibold">Observation Received</p></div>
                <pre className="mt-2 p-2 bg-background/50 rounded-md text-xs whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                    {/* Display a truncated, pretty-printed JSON observation */}
                    <code>{
                        (() => {
                            try {
                                const parsed = JSON.parse(observation);
                                const pretty = JSON.stringify(parsed, null, 2);
                                return pretty.length > 500 ? pretty.substring(0, 500) + '\n...' : pretty;
                            } catch {
                                return observation.length > 500 ? observation.substring(0, 500) + '...' : observation;
                            }
                        })()
                    }</code>
                </pre>
            </div>
        );
    }
    return null;
};
// --- End AgentStep Component ---


/**
 * This is the main page component, now serving as a dedicated, interactive
 * AI chat interface using the Vercel AI SDK for streaming and tool calls.
 */
export default function MissionControlPage() {
  // --- REAL DATA: Get Business Context ---
  const { data: userProfile } = useUserProfile();
  
  // FIX: Casting the access to user_id and business_id to 'any' to bypass local type definition conflict
  const businessId = (userProfile as any)?.business_id;
  const userId = (userProfile as any)?.user_id;

  // Ref for the scroll area to enable auto-scrolling to the latest message
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // --- useChat Hook Integration (The Core Upgrade) ---
  // We cast the hook result to 'any' for full access to 'data' and to bypass strict generics.
  const chat: any = useChat({
    api: '/api/chat', // Your API route for the AI kernel
    // FIX: Pass REAL businessId and userId in the body. Only runs if both exist.
    body: { businessId, userId }, 
    experimental_streamData: true, // Crucial for AgentStep streaming
    // FIX: Explicitly typed 'err' as 'Error'
    onError: (err: Error) => toast.error(`AI Error: ${err.message}`),
  } as any); // Cast options to any for stability
  
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading: isChatLoading, 
    data // Streamed Agent Steps Data
  } = chat;

  // Effect to scroll to the bottom whenever the chat messages or stream data is updated
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, data]);
  
  // Process the streamed data into renderable AgentStep components
  const agentSteps = useMemo(() => {
      if (!data) return [];
      return data.map((chunk: string, i: number) => { 
          try { 
              const parsed = JSON.parse(chunk);
              // Only render if it has an event property (i.e., it's a structured agent event)
              if(parsed.event) return <AgentStep key={`step-${i}`} data={parsed} />; 
              return null;
          } catch (e) { 
              return null; // Ignore chunks that are not structured JSON events
          }
      }).filter(Boolean);
  }, [data]);
  
  /**
   * Handles the form submission using the SDK's handleSubmit.
   */
  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
      // Use the SDK's handleSubmit, which correctly handles the whole process
      handleSubmit(event);
  };
  
  // Get the last message's content for streaming rendering
  const streamingContent = isChatLoading && messages.length > 0 ? (messages[messages.length - 1] as CoreMessage).content : null;
  // Filter out the last message if it's streaming, to avoid double-rendering it as a final message
  const renderedMessages = isChatLoading && messages.length > 0 ? messages.slice(0, -1) : messages;
  
  // === CRITICAL FIX: Add a check for 'input' before calling .trim() ===
  const canSend = !isChatLoading && input && input.trim() && businessId;
  const isDisabled = isChatLoading || !businessId;


  return (
    <div className="flex flex-col h-full bg-card">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {/* FIX: Cast message parameter to 'any' for guaranteed access to 'message.id' */}
          {renderedMessages.map((message: any) => ( 
            <div key={message.id} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'assistant' && <Avatar className="h-8 w-8"><AvatarFallback><Sparkles className="h-4 w-4 text-primary"/></AvatarFallback></Avatar>}
              <div className={cn('max-w-md rounded-lg p-3 text-sm prose dark:prose-invert', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                {/* --- MARKDOWN RENDERING --- */}
                {/* Check if content is a string or Part[], stringify Part[] for ReactMarkdown if necessary */}
                <ReactMarkdown>{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</ReactMarkdown>
              </div>
              {message.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback>U</AvatarFallback></Avatar>}
            </div>
          ))}
          
          {/* --- Live Streaming Agent Steps --- */}
          {isChatLoading && agentSteps.length > 0 && (
             <div className="flex flex-col">{agentSteps}</div>
          )}

          {/* --- Live Streaming Text Output --- */}
          {isChatLoading && streamingContent && (
             <div className="flex items-start gap-4">
               <Avatar className="h-8 w-8"><AvatarFallback><Sparkles className="h-4 w-4 text-primary"/></AvatarFallback></Avatar>
               <div className={cn('max-w-md rounded-lg p-3 text-sm prose dark:prose-invert bg-muted')}>
                  {/* FIX: Check if streamingContent is a string before rendering */}
                  {typeof streamingContent === 'string' && <ReactMarkdown>{streamingContent}</ReactMarkdown>}
                  <Loader2 className="h-4 w-4 animate-spin text-primary mt-2" />
               </div>
             </div>
          )}
          {/* Status Message if loading but no business context */}
          {!businessId && !isChatLoading && (
            <div className="text-center text-red-500 text-sm p-4 border rounded-lg bg-red-50">
              <p>Cannot connect to the AI Assistant. Your business context is missing or still loading.</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t bg-card p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input 
            type="text" 
            value={input} 
            onChange={handleInputChange} // Use SDK's input handler
            placeholder={isDisabled ? "Loading business context..." : "Ask Aura a question about your business..."} 
            disabled={isDisabled} 
            className="flex-1" 
            autoComplete="off" 
          />
          <Button type="submit" disabled={!canSend}>
            {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}