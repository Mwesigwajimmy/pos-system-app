'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai'; 
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';
import { useBusiness } from './BusinessContext';

/**
 * --- Type Definitions (Original Professional Code Preserved) ---
 */
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
  businessId: string;
  userId: string;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

/**
 * --- The AI Engine Room (Worker Provider) ---
 * This is where Aura's consciousness is initialized for the specific business context.
 */
function CopilotWorkerProvider({ children, businessId, userId }: { children: ReactNode; businessId: string; userId: string; }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // SHARED AI CORE: Points to your unified Executive API
  const chat = useChat({
    api: '/api/chat',
    body: { businessId, userId }, 
    experimental_streamData: true,
    onError: (err: Error) => toast.error(`Aura Neural Link Error: ${err.message}`),
  });
  
  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    chat.setInput(prompt);
    setIsOpen(true);
    // Execute forensic reasoning with a slight delay to ensure state hydration
    setTimeout(() => {
        chat.handleSubmit(new Event('submit') as any);
    }, 100);
  };
  
  const contextValue = useMemo(() => ({
    ...chat,
    // CRITICAL FIX: Ensure input is never undefined for .trim() operations
    input: chat.input || '',
    isOpen,
    openCopilot,
    closeCopilot,
    toggleCopilot,
    startAIAssistance,
    isReady: true, // Signals the UI to unlock the input field
    businessId: businessId || '',
    userId: userId || ''
  }), [chat, isOpen, businessId, userId]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      {/* Sovereignty Sidebar implementation */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l shadow-2xl overflow-hidden">
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

/**
 * --- The Gatekeeper Provider ---
 * RESOLVES: Input disabled state.
 * This component monitors the Sovereign Business Context and activates Aura
 * as soon as the multi-tenant credentials (businessId/userId) are validated.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const { profile, isLoading, error } = useBusiness();

  // If the professional profile is loaded, activate the neural worker
  if (!isLoading && !error && profile?.business_id) {
    return (
      <CopilotWorkerProvider 
        businessId={profile.business_id} 
        userId={profile.id || (profile as any).user_id}
      >
        {children}
      </CopilotWorkerProvider>
    );
  }

  /**
   * --- FAIL-SAFE HYDRATION STATE ---
   * This object prevents client-side exceptions during the loading phase.
   * isReady remains false here, keeping the UI in "Initializing" mode.
   */
  const notReadyValue: CopilotContextType = {
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
      startAIAssistance: () => { toast.info("System is initializing forensic links..."); }, 
      isReady: false,
      businessId: '',
      userId: ''
  };

  return (
    <CopilotContext.Provider value={notReadyValue}>
      {children}
    </CopilotContext.Provider>
  );
}

/**
 * --- Custom Hook: useCopilot ---
 * Preserved for all dashboard components to access the executive AI.
 */
export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) {
      throw new Error("useCopilot must be used within a GlobalCopilotProvider");
  }
  return context;
}