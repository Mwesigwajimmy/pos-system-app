'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { toast } from 'sonner';

import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai'; 

import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';
import { useBusiness } from './BusinessContext';

// --- Type Definitions ---
interface CopilotContextType {
  messages: CoreMessage[]; 
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>, options?: any) => void;
  isLoading: boolean;
  setMessages: (messages: CoreMessage[]) => void;
  data: readonly any[] | undefined;
  isOpen: boolean;
  openCopilot: () => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
  startAIAssistance: (prompt: string) => void;
  isReady: boolean;
}

// --- The Global Context ---
const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

// --- The "Worker" Provider ---
function CopilotWorkerProvider({ children, businessId, userId }: { children: ReactNode; businessId: string; userId: string; }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const chat: any = useChat({
    api: '/api/chat',
    body: { businessId, userId }, 
    experimental_streamData: true,
    onError: (err: Error) => toast.error(`Aura Core Error: ${err.message}`),
  } as any);
  
  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  const startAIAssistance = (prompt: string) => {
    const newMessages: CoreMessage[] = [...chat.messages, { id: crypto.randomUUID(), role: 'user', content: prompt }];
    chat.setMessages(newMessages);
    openCopilot();
    chat.handleSubmit(new Event('submit', { bubbles: true, cancelable: true }) as any, { options: { body: { businessId, userId, messages: newMessages } } });
  };
  
  const contextValue = useMemo(() => ({
    ...chat,
    isOpen,
    openCopilot,
    closeCopilot,
    toggleCopilot,
    startAIAssistance,
    isReady: true,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chat.messages, chat.input, chat.isLoading, chat.data, isOpen, businessId, userId]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l">
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

// --- The "Gatekeeper" Provider ---
// This is the component your layout uses.
export function GlobalCopilotProvider({ children }: { children: ReactNode }) { // <--- THIS IS THE FIX
  const { profile, isLoading, error } = useBusiness();

  if (isLoading || error || !profile) {
    return <>{children}</>;
  }
  
  return (
    <CopilotWorkerProvider businessId={profile.business_id} userId={profile.id}>
      {children}
    </CopilotWorkerProvider>
  );
}

// --- The Custom Hook ---
export { CoreMessage };

export function useCopilot(): CopilotContextType {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    return {
        messages: [], input: '', setInput: () => {}, handleInputChange: () => {},
        handleSubmit: () => {}, isLoading: false, setMessages: () => {}, data: undefined,
        isOpen: false,
        openCopilot: () => { toast.error("AI Assistant is not available."); },
        closeCopilot: () => {},
        toggleCopilot: () => { toast.error("AI Assistant is not available."); },
        startAIAssistance: () => { toast.error("AI Assistant is not available."); },
        isReady: false,
    };
  }
  return context;
}