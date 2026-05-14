'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * The primary orchestration layer for the Aura Autonomous C-Suite.
 * VERSION: v10.8 Sovereign Edition (STABILIZED)
 * 
 * Capability: Persistent Neural Links, Identity Handshaking, Multi-Agent Awareness.
 * Integrity Grade: OMEGA-ULTIMATUM (Forensic Ready).
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
 * ✅ EXECUTIVE FIX: The Chat Engine is isolated here.
 * This prevents identity-hook re-renders from clearing the chat state.
 */
function CopilotWorkerProvider({ 
    children, 
    businessId, 
    userId,
    tenantData,
    modules,
    isReady 
}: { 
    children: ReactNode; 
    businessId: string; 
    userId: string;
    tenantData: any;
    modules: string[]; 
    isReady: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState('');

  // --- THE STABILIZED EXECUTIVE AI ENGINE ---
  const chat = useChat({
    api: '/api/chat',
    // Stable body configuration
    body: {
        businessId, 
        userId,
        tenantModules: modules || [],
        contextType: 'forensic_sovereign_executive'
    }, 
    experimental_streamData: true,
    onResponse: (res) => {
        if (!res.ok) {
            toast.error("Aura Protocol Error: Connection to Executive Council interrupted.");
        }
    },
    onError: (err) => {
        console.error("Aura Engine Failure:", err);
        toast.error("Neural Link Fault: Aura is offline. Check system logs.");
    }
  });

  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  /**
   * Method: startAIAssistance
   * Triggers Aura with a prompt and forces the sheet to open.
   */
  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    setTimeout(() => {
      if (chat?.append) {
        try {
            chat.append({ 
              role: 'user', 
              content: prompt,
              // Physical data injection for the backend kernel
              data: { businessId, userId }
            });
            setInputState('');
        } catch (err) {
          console.error('Aura-Context: Injection Failure:', err);
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
    const isActuallyLoading = chat.isLoading || chat.status === 'streaming';

    return {
      messages: chat.messages || [],
      input: inputState, 
      setInput: setInputState,
      handleInputChange: (e: any) => {
        const val = e?.target?.value ?? '';
        setInputState(val); 
      },
      handleSubmit: (e: any) => {
        if (e && e.preventDefault) e.preventDefault();
        const content = inputState.trim();
        if (!content) return;

        try { 
          /**
           * ✅ THE SOVEREIGN WELD
           * We use chat.append() instead of handleSubmit() to force-inject 
           * the Identity metadata into every packet. This prevents message vanishing.
           */
          chat.append({ 
            role: 'user', 
            content: content,
            data: { businessId, userId } 
          });
          setInputState('');
        } catch (err: any) { 
          toast.error(`Aura Handshake Interrupted: ${err.message}`);
        }
      },
      isLoading: isActuallyLoading,
      setMessages: chat.setMessages,
      data: chat.data,
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
   * ✅ IDENTITY RESOLUTION
   * Resolves ID anchors from the most stable source available.
   */
  const activeBusinessId = useMemo(() => {
    if (bizContext?.businessId) return bizContext.businessId;
    if (userProfile?.business_id) return userProfile.business_id;
    if (tenantData?.id) return tenantData.id;
    return '';
  }, [bizContext, userProfile, tenantData]);

  const activeUserId = useMemo(() => {
    if (bizContext?.userId) return bizContext.userId;
    if (userProfile?.id) return userProfile.id;
    return '';
  }, [bizContext, userProfile]);

  /**
   * ✅ NEURAL READINESS
   * The loading screen closes exactly when the physical IDs are found.
   */
  const isReady = mounted && !!activeBusinessId && !!activeUserId;

  return (
    <CopilotWorkerProvider 
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
 */
export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) {
      throw new Error("Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider");
  }
  return context;
}