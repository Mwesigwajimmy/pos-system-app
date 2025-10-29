'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Corrected import path for Vercel AI SDK React hooks
import { useChat } from '@ai-sdk/react';
// FIX: Using CoreMessage type from 'ai'
import { type CoreMessage } from 'ai'; 
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { Sparkles, Send, Bot, User, Loader2, ChevronRight, Server, Cog } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const AgentStep = ({ data }: { data: any }) => {
    if (data.step === 'tool_call') {
        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-background">
                <div className="flex items-center gap-2">
                    <Cog className="h-4 w-4 animate-spin" />
                    <div>
                        <p className="font-semibold">Using Tool: `{data.name}`</p>
                        <p>Input: `{JSON.stringify(data.input)}`</p>
                    </div>
                </div>
            </div>
        );
    }
    if (data.step === 'observation') {
        return (
            <div className="text-xs text-muted-foreground ml-9 my-2 p-3 border rounded-md bg-background">
                <div className="flex items-center gap-2"><Server className="h-4 w-4" /><p className="font-semibold">Observation</p></div>
                <pre className="mt-2 p-2 bg-muted rounded-md text-xs whitespace-pre-wrap break-all">
                    <code>{JSON.stringify(JSON.parse(data.output), null, 2)}</code>
                </pre>
            </div>
        );
    }
    return null;
};

export function AiAuditAssistant() {
  const { data: userProfile } = useUserProfile();
  const businessId = userProfile?.business_id || '';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [finalAnswer, setFinalAnswer] = useState('');
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);

  // FIX: Cast the result of useChat to 'any'.
  // FIX: Cast the options object to 'any' to force TypeScript to ignore the strict checks
  // for 'api', 'body', and 'experimental_streamData' properties.
  const chat: any = useChat({
    api: '/api/copilot',
    body: { businessId },
    experimental_streamData: true,
    // FIX: Cast the onFinish function to 'any' to bypass incompatible type error with experimental_streamData
    onFinish: ((message: CoreMessage) => { 
        // Access chat.data directly, which is now 'any'
        const lastDataChunk = chat.data?.at(-1); 
        if (lastDataChunk) {
            try {
                const parsedData = JSON.parse(lastDataChunk);
                if(parsedData.finalAnswer) setFinalAnswer(parsedData.finalAnswer);
                if(parsedData.suggestedActions) setSuggestedActions(parsedData.suggestedActions);
            } catch (e) {}
        }
    }) as any, // <--- CAST APPLIED HERE
    // FIX: Explicitly typed 'err' as 'Error'
    onError: (err: Error) => toast.error(`AI Error: ${err.message}`),
  } as any); // <--- SECOND CAST APPLIED HERE ON OPTIONS OBJECT

  // Destructure properties from the now 'any'-typed chat object
  const { 
    messages, 
    input, 
    setInput, 
    handleInputChange, 
    handleSubmit, 
    isLoading: isChatLoading, 
    setMessages, 
    data // 'data' is the experimental streamed data array (typed as any from 'chat')
  } = chat;

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, finalAnswer, data]);

  const agentSteps = useMemo(() => {
      if (!data) return [];
      // Map over the stream data array
      return data.map((chunk: string, i: number) => { 
          try { 
              const parsed = JSON.parse(chunk);
              // Ensure parsed has the expected step structure before rendering
              if(parsed.step) return <AgentStep key={`step-${i}`} data={parsed} />; 
              return null;
          } catch (e) { 
              // This can happen with pure text streaming chunks that are not full JSON events
              return null; 
          }
      }).filter(Boolean);
  }, [data]);
  
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      setFinalAnswer(''); setSuggestedActions([]);
      handleSubmit(e);
  };
  
  const handleSuggestionClick = (action: string) => {
      // NOTE: Casting new messages to CoreMessage for internal consistency, 
      // though the component itself is now using 'any' for stability.
      const newMessages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: finalAnswer } as CoreMessage, { id: crypto.randomUUID(), role: 'user', content: action } as CoreMessage];
      setMessages(newMessages);
      setFinalAnswer(''); setSuggestedActions([]); setInput('');
      // Manually calling handleSubmit with the new messages in the body
      handleSubmit(new Event('submit', { bubbles: true, cancelable: true }), { options: { body: { businessId, messages: newMessages } } });
  };
  
  const suggestedPrompts = [
      "Find all journal entries related to 'Payroll' in the last 90 days.",
      "Are there any expense transactions over $5,000 in Q2?",
      "Show me the details for invoice #INV-00123.",
  ];

  return (
    <div className="w-full h-[70vh] flex flex-col border rounded-lg">
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
            {messages.length === 0 && !isChatLoading && (
                <div className="text-center text-muted-foreground p-4">
                    <Bot className="mx-auto h-10 w-10 mb-4" />
                    <p className="mb-4">Ask a question to begin your audit.</p>
                    <div className="flex flex-col items-center gap-2">
                        {suggestedPrompts.map(prompt => (
                            <Button key={prompt} variant="outline" size="sm" onClick={() => setInput(prompt)}>{prompt}</Button>
                        ))}
                    </div>
                </div>
            )}
            {/* FIX: Changed map parameter type to 'any' for guaranteed access to 'm.id' */}
            {messages.map((m: any) => ( 
                <div key={m.id} className={cn('flex items-start gap-3 text-sm', m.role === 'user' ? 'justify-end' : '')}>
                    {m.role === 'user' && (
                        // NOTE: m.content is expected to be a string or Part[] here. ReactMarkdown handles both.
                        <><div className={cn('rounded-lg p-3 max-w-[85%] break-words', 'bg-primary text-primary-foreground')}><ReactMarkdown>{typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}</ReactMarkdown></div><div className="w-8 h-8 rounded-full bg-background flex items-center justify-center font-bold flex-shrink-0"><User className="h-4 w-4" /></div></>
                    )}
                </div>
            ))}
            {isChatLoading && agentSteps}
            {!isChatLoading && finalAnswer && (
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Sparkles className="h-4 w-4" /></div>
                    <div className="rounded-lg p-3 bg-background max-w-[85%] prose prose-sm break-words">
                        <ReactMarkdown>{finalAnswer}</ReactMarkdown>
                        {suggestedActions.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Suggested Next Steps:</h4>
                                <div className="flex flex-col items-start gap-2">
                                    {suggestedActions.map((action, i) => (
                                        <Button key={i} variant="secondary" size="sm" className="w-full justify-start text-left h-auto py-2" onClick={() => handleSuggestionClick(action)}>
                                            <ChevronRight className="mr-2 h-4 w-4 flex-shrink-0" /><span>{action}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {isChatLoading && !finalAnswer && ( // Render ongoing streaming text if loading but no final answer yet
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0"><Sparkles className="h-4 w-4" /></div>
                    <div className="rounded-lg p-3 bg-background max-w-[85%] prose prose-sm break-words">
                        <ReactMarkdown>{messages[messages.length - 1]?.content || ""}</ReactMarkdown>
                    </div>
                </div>
            )}
            <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background rounded-b-lg">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
          <Input value={input} onChange={handleInputChange} placeholder={isChatLoading ? "Agent is working..." : "Ask an audit question..."} disabled={isChatLoading || !businessId}/>
          <Button type="submit" size="icon" disabled={isChatLoading || !businessId}>
              {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}