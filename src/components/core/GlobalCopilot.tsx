// src/components/core/GlobalCopilot.tsx
'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
// THE REVOLUTIONARY FIX: Import from the correct Vercel AI SDK endpoint for Next.js
import { useChat } from '@ai-sdk/react';
// Import the CoreMessage type from the base 'ai' package
import { type CoreMessage } from 'ai'; 
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from './CopilotPanel';

// --- Type Definitions for the Global Context ---
interface CopilotContextType {
  messages: CoreMessage[]; // Changed from Message[]
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  setMessages: (messages: CoreMessage[]) => void; // Changed from Message[]
  data: readonly any[] | undefined;
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  startAIAssistance: (prompt: string) => void;
}

// --- The Global Context ---
const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

// --- The Provider Component ---
export function GlobalCopilotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: userProfile } = useUserProfile();
  const businessId = userProfile?.business_id || '';

  // Cast the hook result to 'any' for stability against strict type errors, 
  // similar to our previous successful fixes.
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    data
  }: any = useChat({
    // --- THIS IS THE ONLY CHANGE ---
    // Point to your single, correct API route that you moved to 'src/app/api/chat'
    api: '/api/chat', // CORRECTED FROM '/api/copilot'
    // -----------------------------
    body: { businessId },
    // FIX: Explicitly type the 'err' parameter as 'Error' to resolve the 'implicitly has an any type' error.
    onError: (err: Error) => toast.error(`Aura Core Error: ${err.message}`),
  } as any); // Cast options as well for max stability

  const openPanel = () => setIsOpen(true);
  const closePanel = () => setIsOpen(false);
  const togglePanel = () => setIsOpen(prev => !prev);

  const startAIAssistance = (prompt: string) => {
    // Append the user's new prompt to the existing conversation history
    const newMessages: CoreMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: prompt } as CoreMessage]; // Cast to CoreMessage
    setMessages(newMessages);
    // Ensure the panel is visible when a conversation is started programmatically
    openPanel(); 
    
    // Manually trigger chat submission with the new messages
    handleSubmit(new Event('submit', { bubbles: true, cancelable: true }), { options: { body: { businessId, messages: newMessages } } });
  };

  const contextValue = useMemo(() => ({
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    data,
    isOpen,
    openPanel,
    closePanel,
    togglePanel,
    startAIAssistance,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [messages, input, isLoading, data, isOpen, handleSubmit]); // Added handleSubmit to dependencies for correctness

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

// --- The Custom Hook ---
export function useCopilot(): CopilotContextType {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    throw new Error('useCopilot must be used within a GlobalCopilotProvider');
  }
  return context;
}