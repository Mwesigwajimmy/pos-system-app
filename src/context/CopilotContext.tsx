'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { type CoreMessage } from 'ai'; 
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';

/**
 * --- DUAL DIRECTORY ARCHITECTURE (MASTER IMPORT) ---
 * We use DEFAULT imports here to match the 'export default' in your components.
 * This fixes the 'Module not found' and 'is not exported' build errors.
 */
import GlobalCopilotCoreUI from '@/components/core/GlobalCopilot';
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
  openCopilot: () => void; // Aliased for sidebar 'Ask Aura' link functionality
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
 * This component activates the Vercel AI SDK logic once the system is ready.
 * Mounting this component provides the REAL handlers (handleInputChange/handleSubmit) 
 * which unlocks your typing and the submit button.
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
            if (res.status === 401) toast.error("Aura: Security session expired.");
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
     * Programmatically starts AI tasks from dashboard buttons.
     */
    const startAIAssistance = (prompt: string) => {
        if (!prompt) return;
        chat.setInput(prompt);
        setIsOpen(true);
        // Delay ensures UI transition is stable before stream starts
        setTimeout(() => {
            chat.handleSubmit(new Event('submit') as any);
        }, 250);
    };

    const contextValue = useMemo(() => ({
        ...chat,
        // UI FIX: Ensure input is never null to allow typing immediately
        input: chat.input || '',
        isOpen,
        openPanel,
        openCopilot: openPanel, // ALIAS: Fixes sidebar link naming discrepancy
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
            
            {/* Renders the Core UI trigger component from src/components/core */}
            <GlobalCopilotCoreUI /> 

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l shadow-2xl overflow-hidden bg-white">
                    {/* Renders the Extended Panel from src/components/copilot */}
                    <CopilotPanelExtended />
                </SheetContent>
            </Sheet>
        </CopilotContext.Provider>
    );
}

/**
 * --- GLOBAL GATEKEEPER PROVIDER ---
 * Resolves the multi-tenant identities from your physical backend audit.
 */
export function GlobalCopilotProvider({ children }: { children: React.ReactNode }) {
  const { data: userProfile, isLoading: isProfileLoading } = useUserProfile();

  /**
   * --- FORENSIC RESOLUTION (THE TYPING & BUTTON FIX) ---
   * Normalizes data structures (arrays/objects) and casing (snake/camel).
   * Mounting the NeuralWorker is what clears the "Synchronizing" spinner.
   */
  const target = useMemo(() => {
    if (!userProfile) return null;
    const raw = (userProfile as any).data || userProfile;
    // ARRAY SAFETY: Correctly handles Supabase array returns [{...}]
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
   * We only mount the worker once the ID handshake is 100% resolved.
   * This provides the real AI handlers to the input field and button.
   */
  if (!isProfileLoading && businessId && userId) {
    return (
      <CopilotNeuralWorker 
        businessId={businessId} 
        userId={userId}
        modules={[]} 
      >
        {children}
      </CopilotNeuralWorker>
    );
  }

  /**
   * --- HYDRATION FALLBACK (UI LOCKED) ---
   * This is the state where typing is disabled while waiting for the DB.
   */
  const notReadyValue: CopilotContextType = {
      messages: [], 
      input: '', 
      setInput: () => {}, 
      handleInputChange: () => {}, // Placeholder stops keystrokes during sync
      handleSubmit: (e: any) => {
          e.preventDefault();
          toast.info("Aura is synchronizing with your business profile...");
      }, 
      isLoading: false, 
      setMessages: () => {}, 
      data: undefined,
      isOpen: false, 
      openPanel: () => { toast.warning("Neural Link is still initializing."); }, 
      openCopilot: () => { toast.warning("Neural Link is still initializing."); }, 
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
 * --- useCopilot Hook ---
 */
export function useCopilot(): CopilotContextType {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    throw new Error('Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider');
  }
  return context;
}