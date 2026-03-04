'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai'; 
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';

/**
 * --- DUAL DIRECTORY IMPORT RESOLUTION ---
 * To satisfy your enterprise structure, we pull from both folders.
 * 'Core' is the system base, 'Extended' is the Aura v10.5 Pro interface.
 */
import CopilotPanelCore from '@/components/core/CopilotPanel';
import CopilotPanelExtended from '@/components/copilot/CopilotPanel';

/**
 * --- Type Definitions (Enterprise Grade) ---
 */
interface CopilotContextType {
  messages: any[];
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  setMessages: (messages: any[]) => void;
  data: any[] | undefined;
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  startAIAssistance: (prompt: string) => void;
  // Forensic Identity Status
  isReady: boolean;
  businessId: string;
  userId: string;
  tenantModules: string[];
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

/**
 * --- THE NEURAL WORKER ---
 * This is the ACTIVE state of Aura. It mounts only when IDs are physically verified.
 * It provides the REAL input handlers that unlock your keyboard and submit button.
 */
function CopilotNeuralWorker({ 
    children, 
    businessId, 
    userId,
    modules 
}: { 
    children: React.ReactNode; 
    businessId: string; 
    userId: string; 
    modules: string[];
}) {
    const [isOpen, setIsOpen] = useState(false);

    // 1. THE SHARED AI ENGINE (Vercel AI SDK)
    // Linked to your verified Backend Kernel
    const chat = useChat({
        api: '/api/chat',
        body: { 
            businessId, 
            userId,
            tenantModules: modules,
            contextType: 'forensic_sovereign_executive' 
        },
        experimental_streamData: true,
        onResponse: (res) => {
            if (res.status === 401) toast.error("Aura: Security session expired. Please re-login.");
        },
        onError: (err: Error) => {
            console.error("Aura Neural Link Error:", err);
            toast.error(`Aura Connection Error: ${err.message}`);
        },
    });

    const openPanel = () => setIsOpen(true);
    const closePanel = () => setIsOpen(false);
    const togglePanel = () => setIsOpen(prev => !prev);

    /**
     * Autonomous Trigger
     * Allows system buttons to programmatically start AI forensic tasks.
     */
    const startAIAssistance = (prompt: string) => {
        if (!prompt) return;
        chat.setInput(prompt);
        setIsOpen(true);
        // Delay ensures UI transition is stable before stream starts
        setTimeout(() => {
            chat.handleSubmit(new Event('submit') as any);
        }, 200);
    };

    const contextValue = useMemo(() => ({
        ...chat,
        // UI FIX: Ensure input is never null to allow immediate typing
        input: chat.input || '',
        isOpen,
        openPanel,
        closePanel,
        togglePanel,
        startAIAssistance,
        isReady: true,
        businessId,
        userId,
        tenantModules: modules
    }), [chat, isOpen, businessId, userId, modules]);

    return (
        <CopilotContext.Provider value={contextValue}>
            {children}
            {/* The AI Sidebar - Renders the v10.5 Extended Panel */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l shadow-2xl overflow-hidden bg-white">
                    <CopilotPanelExtended />
                </SheetContent>
            </Sheet>
        </CopilotContext.Provider>
    );
}

/**
 * --- GLOBAL GATEKEEPER PROVIDER ---
 * This resolves the multi-tenant identities from your physical backend audit.
 */
export function GlobalCopilotProvider({ children }: { children: React.ReactNode }) {
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();

  /**
   * --- FORENSIC RESOLUTION (THE TYPING & BUTTON FIX) ---
   * Normalizes data structures (arrays/objects) and casing (snake/camel).
   * This logic breaks the "Synchronizing" spinner.
   */
  const target = useMemo(() => {
    if (!userProfile) return null;
    // Extract raw data regardless of hook wrapper structure (handles useQuery data vs raw)
    const raw = (userProfile as any).data || userProfile;
    // NORMALIZATION: Handle array-wrapped Supabase returns
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
   * --- THE MASTER GATE ---
   * If IDs are present, we mount the NeuralWorker. 
   * This replaces the empty functions with real handlers, unlocking typing and the button.
   */
  if (!isProfileLoading && businessId && userId) {
    return (
      <CopilotNeuralWorker 
        businessId={businessId} 
        userId={userId}
        modules={[]} // Hydrate modules here if needed
      >
        {children}
      </CopilotNeuralWorker>
    );
  }

  /**
   * --- HYDRATION FALLBACK (TYPING LOCKED) ---
   * Safe state while identifying the session.
   */
  const notReadyValue: CopilotContextType = {
      messages: [], 
      input: '', 
      setInput: () => {}, 
      handleInputChange: () => {}, // This placeholder is why typing is locked
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
      userId: userId || '',
      tenantModules: []
  };

  return (
    <CopilotContext.Provider value={notReadyValue}>
      {children}
    </CopilotContext.Provider>
  );
}

/**
 * --- useCopilot Custom Hook ---
 */
export function useCopilot(): CopilotContextType {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    throw new Error('Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider');
  }
  return context;
}