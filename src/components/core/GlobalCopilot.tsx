'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai'; 
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from './CopilotPanel';

/**
 * --- Enterprise Grade Type Definitions ---
 * Extended to include security context for multi-tenant isolation.
 */
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
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  startAIAssistance: (prompt: string) => void;
  // Forensic Identity Status
  isReady: boolean;
  businessId: string;
  userId: string;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

/**
 * --- THE NEURAL WORKER ---
 * This internal component initializes the AI only after the user identity 
 * has been physically verified by the database.
 */
function CopilotNeuralWorker({ 
    children, 
    businessId, 
    userId 
}: { 
    children: React.ReactNode; 
    businessId: string; 
    userId: string; 
}) {
    const [isOpen, setIsOpen] = useState(false);

    // 1. THE SHARED AI ENGINE
    // Initialized with the full executive context resolved from your D: Drive / Localhost
    const chat = useChat({
        api: '/api/chat',
        body: { 
            businessId, 
            userId,
            contextType: 'forensic_sovereign_executive' 
        },
        experimental_streamData: true,
        onError: (err: Error) => {
            console.error("Aura Neural Link Error:", err);
            toast.error(`Aura Core Error: ${err.message}`);
        },
    });

    const openPanel = () => setIsOpen(true);
    const closePanel = () => setIsOpen(false);
    const togglePanel = () => setIsOpen(prev => !prev);

    /**
     * AUTONOMOUS TRIGGER
     * Allows system buttons to programmatically start AI forensic tasks.
     */
    const startAIAssistance = (prompt: string) => {
        if (!prompt) return;
        chat.setInput(prompt);
        setIsOpen(true);
        // Delay ensures the sidebar is visible before the stream events hit the UI
        setTimeout(() => {
            chat.handleSubmit(new Event('submit') as any);
        }, 200);
    };

    const contextValue = useMemo(() => ({
        ...chat,
        isOpen,
        openPanel,
        closePanel,
        togglePanel,
        startAIAssistance,
        isReady: true,
        businessId,
        userId
    }), [chat, isOpen, businessId, userId]);

    return (
        <CopilotContext.Provider value={contextValue}>
            {children}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l shadow-2xl overflow-hidden">
                    <CopilotPanel />
                </SheetContent>
            </Sheet>
        </CopilotContext.Provider>
    );
}

/**
 * --- GLOBAL GATEKEEPER PROVIDER ---
 * Resolves the 20+ different Business Identities before activating the AI Brain.
 */
export function GlobalCopilotProvider({ children }: { children: React.ReactNode }) {
  // 1. FORENSIC IDENTITY FETCH (From your profiles table)
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();

  // 2. MULTI-PATH RESOLUTION (No Assumptions)
  // Ensures we catch 'business_id', 'tenant_id', or 'id' based on your schema
  const businessId = useMemo(() => {
    return userProfile?.business_id || (userProfile as any)?.tenant_id || (userProfile as any)?.organization_id || '';
  }, [userProfile]);

  const userId = useMemo(() => {
    return userProfile?.id || (userProfile as any)?.user_id || '';
  }, [userProfile]);

  /**
   * --- LOGIC GATE ---
   * We only render the Worker if the handshake is 100% complete.
   * This is the "Root Fix" for the Initializing loop.
   */
  if (!isProfileLoading && businessId && userId) {
    return (
      <CopilotNeuralWorker 
        businessId={businessId} 
        userId={userId}
      >
        {children}
      </CopilotNeuralWorker>
    );
  }

  /**
   * --- HYDRATION FALLBACK ---
   * Safe state while the system identifies the business owner.
   */
  const notReadyValue: CopilotContextType = {
      messages: [], 
      input: '', 
      setInput: () => {}, 
      handleInputChange: () => {},
      handleSubmit: (e: any) => {
          e.preventDefault();
          toast.info("Aura: Synchronizing Forensic ID...");
      }, 
      isLoading: false, 
      setMessages: () => {}, 
      data: undefined,
      isOpen: false, 
      openPanel: () => { toast.warning("Neural Link is still initializing."); }, 
      closePanel: () => {}, 
      togglePanel: () => {},
      startAIAssistance: () => {}, 
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
 * --- useCopilot Custom Hook ---
 * Single hook to access Aura's intelligence from any ERP module.
 */
export function useCopilot(): CopilotContextType {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    throw new Error('Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider');
  }
  return context;
}