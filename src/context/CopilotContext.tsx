'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai'; 
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';

/**
 * --- CRITICAL PATH FIX ---
 * We point directly to the component folder to resolve the Webpack error.
 */
import CopilotPanel from '@/components/copilot/CopilotPanel';

/**
 * --- Enterprise Grade Type Definitions ---
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
  isReady: boolean;
  businessId: string;
  userId: string;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

/**
 * --- THE NEURAL WORKER ---
 * This component runs the actual AI engine once the business context is resolved.
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

    // THE SHARED AI ENGINE: Initialized with Sovereign Context
    const chat = useChat({
        api: '/api/chat',
        body: { 
            businessId, 
            userId,
            contextType: 'forensic_sovereign_executive',
            initSearch: true 
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

    const startAIAssistance = (prompt: string) => {
        if (!prompt) return;
        chat.setInput(prompt);
        setIsOpen(true);
        // Delay ensures the UI sheet opens before the stream begins
        setTimeout(() => {
            chat.handleSubmit(new Event('submit') as any);
        }, 400);
    };

    const contextValue = useMemo(() => ({
        ...chat,
        // UI Safety: Fallback to empty string ensures typing is never locked by undefined
        input: chat.input || '',
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
 * Resolves the 11+ different Business Identities before activating the AI logic.
 */
export function GlobalCopilotProvider({ children }: { children: React.ReactNode }) {
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();

  /**
   * --- FORENSIC IDENTITY RESOLUTION ---
   * We handle array returns, object returns, and mixed casing (business_id vs businessId).
   */
  const target = useMemo(() => {
    if (!userProfile) return null;
    // Deep check for the data property (common in TanStack Query/Supabase wrappers)
    const raw = (userProfile as any).data || userProfile; 
    return Array.isArray(raw) ? raw[0] : raw;
  }, [userProfile]);

  const businessId = useMemo(() => {
    if (!target) return '';
    return (
        target.business_id || 
        target.businessId || 
        target.tenant_id || 
        (target as any).organization_id || 
        ''
    );
  }, [target]);

  const userId = useMemo(() => {
    if (!target) return '';
    return target.id || target.userId || (target as any).user_id || '';
  }, [target]);

  /**
   * --- AUTO-ACTIVATION LOGIC ---
   * Render the Worker only when IDs are resolved. 
   * This immediately enables 'handleInputChange' for typing.
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
   * Prevents 'reading trim of undefined' crashes while the profile is loading.
   */
  const notReadyValue: CopilotContextType = {
      messages: [], 
      input: '', 
      setInput: () => {}, 
      handleInputChange: () => {
          // Locked during initialization
          console.warn("Aura: Neural context not yet resolved.");
      }, 
      handleSubmit: (e: any) => {
          e.preventDefault();
          toast.info("Aura is synchronizing with your business profile...");
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
      businessId: businessId || '',
      userId: userId || ''
  };

  return (
    <CopilotContext.Provider value={notReadyValue}>
      {children}
    </CopilotContext.Provider>
  );
}

/**
 * --- Custom Hook ---
 */
export function useCopilot(): CopilotContextType {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    throw new Error('Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider');
  }
  return context;
}