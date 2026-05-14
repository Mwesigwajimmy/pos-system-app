'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * The primary orchestration layer for the Aura Autonomous C-Suite.
 * This component bridges the Deep Identity Hooks with the AI Reasoning Engine.
 * 
 * Capability: Multi-Agent State Management, Identity Handshaking.
 * Integrity Grade: OMEGA-ULTIMATUM (Forensic Ready).
 * VERSION: v10.8 Cloud-Sovereign Edition.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';

// --- ENTERPRISE IDENTITY PILLARS ---
import { useBusinessContext } from '@/hooks/useBusinessContext'; 
import { useTenantModules } from '@/hooks/useTenantModules';
import { useTenant } from '@/hooks/useTenant'; 
import { useUserProfile } from '@/hooks/useUserProfile';

/**
 * Interface: CopilotContextType
 * Defines the public API for interacting with Aura across the BBU1 Universe.
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
  tenantData: any; 
  tenantModules: string[];
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

/**
 * COMPONENT: CopilotWorkerProvider
 * Manages the UI state and physical message-sending handshake.
 */
function CopilotWorkerProvider({ 
    children, 
    chat,
    businessId, 
    userId,
    tenantData,
    modules,
    isReady 
}: { 
    children: ReactNode; 
    chat: any;
    businessId: string; 
    userId: string;
    tenantData: any;
    modules: string[]; 
    isReady: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState('');

  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  /**
   * Method: startAIAssistance
   * Allows external UI components to trigger Aura with a specific directive.
   */
  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Neural Handshake Delay: Ensures the Panel is mounted before appending
    setTimeout(() => {
      if (chat?.append) {
        try {
            chat.append({ 
              role: 'user', 
              content: prompt,
              data: { businessId, userId }
            });
            setInputState('');
        } catch (err) {
          console.error('Aura-Context: Directive Injection Failed:', err);
        }
      }
    }, 200);
  };

  // Diagnostic: Log successful link establishment
  useEffect(() => {
    if (isReady && businessId) {
      console.log('--- AURA NEURAL LINK ESTABLISHED ---');
      console.log(`[Vault-ID]: ${businessId}`);
      console.log(`[Operator-ID]: ${userId}`);
    }
  }, [isReady, businessId, userId]);

  const contextValue = useMemo(() => {
    const isActuallyLoading = chat?.isLoading || chat?.status === 'in_progress' || chat?.status === 'streaming';

    return {
      messages: chat?.messages || [],
      input: inputState, 
      setInput: setInputState,
      handleInputChange: (e: any) => {
        const val = e?.target?.value ?? '';
        setInputState(val); 
      },
      handleSubmit: (e: any) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!inputState.trim()) return;

        try { 
          if (typeof chat?.append === 'function') {
            chat.append({ 
              role: 'user', 
              content: inputState,
              data: { businessId, userId } 
            });
          }
          setInputState('');
        } catch (err: any) { 
          toast.error(`Neural Link Fault: ${err.message}`);
        }
      },
      isLoading: isActuallyLoading,
      setMessages: chat?.setMessages || (() => {}),
      data: chat?.data,
      isOpen,
      openCopilot,
      closeCopilot,
      toggleCopilot,
      startAIAssistance,
      isReady,
      businessId,
      userId,
      tenantData,
      tenantModules: modules
    };
  }, [chat, inputState, isOpen, businessId, userId, tenantData, modules, isReady]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        {/* The C-Suite Sidebar Panel */}
        <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l shadow-2xl overflow-hidden">
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

/**
 * MAIN COMPONENT: GlobalCopilotProvider
 * The authoritative identity resolver for the Aura Ecosystem.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // --- IDENTITY PILLARS (Cascading Data Sources) ---
  const { data: bizContext } = useBusinessContext();
  const { data: userProfile } = useUserProfile();
  const { data: tenantData } = useTenant();
  const { data: modules } = useTenantModules();

  /**
   * ✅ IDENTITY RESOLUTION WELD
   * Prioritizes the advanced BusinessContext resolution first.
   * Ensures the handshake completes correctly regardless of hook naming conventions.
   */
  const activeBusinessId = useMemo(() => {
    if (bizContext?.businessId) return bizContext.businessId; // Matches your BusinessContextData interface
    if (userProfile?.business_id) return userProfile.business_id;
    if (tenantData?.id) return tenantData.id;
    return '';
  }, [bizContext, userProfile, tenantData]);

  const activeUserId = useMemo(() => {
    if (bizContext?.userId) return bizContext.userId; // Matches your BusinessContextData interface
    if (userProfile?.id) return userProfile.id;
    return '';
  }, [bizContext, userProfile]);

  /**
   * THE EXECUTIVE AI ENGINE (useChat)
   * Feeds the resolved IDs into the backend reasoning kernel.
   */
  const chat = useChat({
    api: '/api/chat',
    body: {
        businessId: activeBusinessId, 
        userId: activeUserId,
        tenantModules: modules || [],
        contextType: 'forensic_sovereign_executive'
    }, 
    experimental_streamData: true,
  });

  /**
   * ✅ NEURAL READINESS PROTOCOL
   * The "Sovereign Syncing" screen closes exactly when the physical IDs are found.
   * This breaks the loading hang by focusing only on the mandatory identity anchors.
   */
  const isReady = mounted && !!activeBusinessId && !!activeUserId;

  return (
    <CopilotWorkerProvider 
      chat={chat}
      businessId={activeBusinessId} 
      userId={activeUserId}
      tenantData={tenantData}
      modules={modules || []}
      isReady={isReady}
    >
      {children}
    </CopilotWorkerProvider>
  );
}

/**
 * HOOK: useCopilot
 * Access the Sovereign Executive Council from any component.
 */
export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) {
      throw new Error("Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider");
  }
  return context;
}