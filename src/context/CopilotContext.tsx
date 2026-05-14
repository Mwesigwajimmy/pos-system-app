'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v11.0 Sovereign Edition (OMEGA STABILIZED)
 * 
 * Capability: Lifecycle Pinning, Function Proxying, Multi-Agent Logic.
 * Integrity Grade: OMEGA-ULTIMATUM (Forensic Ready).
 * BUILD FIX: Solves the "append is not a function" and initialization race conditions.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';

// --- PILLAR HOOKS ---
import { useBusinessContext } from '@/hooks/useBusinessContext'; 
import { useTenantModules } from '@/hooks/useTenantModules';
import { useTenant } from '@/hooks/useTenant'; 
import { useUserProfile } from '@/hooks/useUserProfile';

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
 * COMPONENT: CopilotWorker
 * ✅ LIFECYCLE PINNING: This component handles the actual AI engine.
 */
function CopilotWorker({ 
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

  // --- THE AUTHORITATIVE AI ENGINE ---
  const chatInstance = useChat({
    api: '/api/chat',
    body: {
        businessId, 
        userId,
        tenantModules: modules || [],
        contextType: 'forensic_sovereign_executive'
    }, 
    experimental_streamData: true,
  });

  // ✅ STABLE REF PROXY: Captures the 'append' function to prevent minification ghosting.
  const appendProxy = useRef(chatInstance.append);
  useEffect(() => {
    appendProxy.current = chatInstance.append;
  }, [chatInstance.append]);

  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  const startAIAssistance = (prompt: string) => {
    if (!prompt || !appendProxy.current) return;
    setInputState(prompt);
    setIsOpen(true);
    
    setTimeout(() => {
        try {
            appendProxy.current({ 
              role: 'user', 
              content: prompt,
              data: { businessId, userId }
            });
            setInputState('');
        } catch (err) {
          console.error('Aura Injection Failure:', err);
        }
    }, 300);
  };

  const contextValue = useMemo(() => {
    return {
      messages: chatInstance.messages || [],
      input: inputState, 
      setInput: setInputState,
      handleInputChange: (e: any) => {
        setInputState(e?.target?.value ?? ''); 
      },
      handleSubmit: (e: any) => {
        if (e && e.preventDefault) e.preventDefault();
        const content = inputState.trim();
        if (!content) return;

        try { 
          /**
           * ✅ OMEGA STABILITY EXECUTION
           * We use the captured proxy function to guarantee invocation.
           */
          if (typeof appendProxy.current === 'function') {
            appendProxy.current({ 
              role: 'user', 
              content: content,
              data: { businessId, userId } 
            });
            setInputState('');
          } else {
            toast.error("Handshake Pending: Aura is aligning logic gates. Please wait.");
          }
        } catch (err: any) { 
          toast.error(`Aura Handshake Error: ${err.message}`);
        }
      },
      isLoading: chatInstance.isLoading,
      setMessages: chatInstance.setMessages,
      data: chatInstance.data,
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
  }, [chatInstance, inputState, isOpen, businessId, userId, tenantData, modules, isReady]);

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
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: bizContext } = useBusinessContext();
  const { data: userProfile } = useUserProfile();
  const { data: tenantData } = useTenant();
  const { data: modules } = useTenantModules();

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

  const isReady = mounted && !!activeBusinessId && !!activeUserId;

  return (
    /* ✅ EXECUTIVE KEY: We use 'activeBusinessId' as a key to force 
       the worker to reset ONLY when the business node changes. */
    <CopilotWorker 
      key={activeBusinessId || 'loading'}
      businessId={activeBusinessId} 
      userId={activeUserId}
      tenantData={tenantData}
      modules={modules || []}
      isReady={isReady}
    >
      {children}
    </CopilotWorker>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) {
      throw new Error("Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider");
  }
  return context;
}