'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai'; 
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';
import { useBusiness } from './BusinessContext';

interface CopilotContextType {
  messages: any[]; 
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: any, options?: any) => void;
  isLoading: boolean;
  setMessages: (messages: any[]) => void;
  data: any[] | undefined;
  isOpen: boolean;
  openCopilot: () => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
  startAIAssistance: (prompt: string) => void;
  isReady: boolean;
  businessId: string; // Added to interface for UI safety
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

function CopilotWorkerProvider({ children, businessId, userId }: { children: ReactNode; businessId: string; userId: string; }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const chat = useChat({
    api: '/api/chat',
    body: { businessId, userId }, 
    experimental_streamData: true,
    onError: (err: Error) => toast.error(`Aura Core Error: ${err.message}`),
  });
  
  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  const startAIAssistance = (prompt: string) => {
    // Safety check for prompt
    if (!prompt) return;
    chat.setInput(prompt);
    setIsOpen(true);
    setTimeout(() => {
        chat.handleSubmit(new Event('submit') as any);
    }, 100);
  };
  
  const contextValue = useMemo(() => ({
    ...chat,
    // CRITICAL FIX: Ensure input is never undefined
    input: chat.input || '',
    isOpen,
    openCopilot,
    closeCopilot,
    toggleCopilot,
    startAIAssistance,
    isReady: true,
    businessId: businessId || '',
  }), [chat, isOpen, businessId]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l shadow-2xl">
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const { profile, isLoading, error } = useBusiness();

  if (!isLoading && !error && profile) {
    return (
      <CopilotWorkerProvider businessId={profile.business_id} userId={profile.id}>
        {children}
      </CopilotWorkerProvider>
    );
  }

  const notReadyValue = {
      messages: [], 
      input: '', 
      setInput: () => {}, 
      handleInputChange: () => {},
      handleSubmit: (e: any) => e.preventDefault(), 
      isLoading: false, 
      setMessages: () => {}, 
      data: undefined,
      isOpen: false, 
      openCopilot: () => {}, 
      closeCopilot: () => {}, 
      toggleCopilot: () => {},
      startAIAssistance: () => {}, 
      isReady: false,
      businessId: ''
  };

  return (
    <CopilotContext.Provider value={notReadyValue as any}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) throw new Error("useCopilot must be used within GlobalCopilotProvider");
  return context;
}