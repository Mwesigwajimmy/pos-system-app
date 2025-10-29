'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// --- Vercel AI SDK Imports (The Core) ---
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai';
// --- Custom Hook for REAL Business Context ---
import { useUserProfile } from '@/hooks/useUserProfile';


// --- Type Definitions for the Global Context ---
// This interface defines the full, powerful context of your AI system.
// Note: Changed names to match what the rest of your app uses for simple context access
interface CopilotContextType {
  messages: CoreMessage[]; 
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  setMessages: (messages: CoreMessage[]) => void;
  data: readonly any[] | undefined;
  isOpen: boolean;
  openCopilot: () => void; // Renamed to match the original
  closeCopilot: () => void; // Renamed to match the original
  toggleCopilot: () => void; // Renamed to match the original
  startAIAssistance: (prompt: string) => void;
}

// --- The Global Context ---
const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

// --- The Provider Component ---
export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: userProfile } = useUserProfile();
  const businessId = userProfile?.business_id;

  // FIX: User ID is correctly accessed as 'id' based on the UserProfile interface
  const userId = userProfile?.id; 

  // FIX: Implement the streaming, tool-enabled chat logic
  const chat: any = useChat({
    api: '/api/chat',
    body: { businessId, userId },
    experimental_streamData: true,
    // FIX: Explicitly type the error parameter as 'Error' to resolve the 'noImplicitAny' error
    onError: (err: Error) => toast.error(`Aura Core Error: ${err.message}`),
  } as any);

  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    data
  } = chat;

  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);

  // FIX: Logic to start a new chat programmatically (e.g., from a sidebar button)
  const startAIAssistance = (prompt: string) => {
    if (!businessId) {
        toast.error("User context is missing. Cannot start chat.");
        return;
    }
    // Append the user's new prompt to the existing conversation history
    const newMessages: CoreMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: prompt } as CoreMessage];
    setMessages(newMessages);
    openCopilot(); 
    
    // Manually trigger chat submission with the new messages
    handleSubmit(new Event('submit', { bubbles: true, cancelable: true }), { options: { body: { businessId, userId, messages: newMessages } } });
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
    openCopilot,
    closeCopilot,
    toggleCopilot,
    startAIAssistance,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [messages, input, isLoading, data, isOpen, businessId, userId]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
    </CopilotContext.Provider>
  );
}

// --- The Custom Hook ---
export { CoreMessage }; // Export the CoreMessage type here

export function useCopilot(): CopilotContextType {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    throw new Error('useCopilot must be used within a CopilotProvider');
  }
  return context;
}