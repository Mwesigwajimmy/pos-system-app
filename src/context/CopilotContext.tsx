'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v10.9 Sovereign Edition (PRODUCTION STABILIZED)
 * Logic: Explicitly destructures useChat for absolute minifier stability.
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
 * Orchestrates the persistent AI Engine state.
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
  // ✅ DEEP FIX: Destructuring explicitly to prevent "is not a function" errors in production minification.
  const { 
    messages, 
    append, 
    setMessages, 
    data, 
    isLoading: chatLoading,
    status 
  } = useChat({
    api: '/api/chat',
    body: {
        businessId, 
        userId,
        tenantModules: modules || [],
        contextType: 'forensic_sovereign_executive'
    }, 
    experimental_streamData: true,
  });

  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  /**
   * Method: startAIAssistance
   * Safely injects a directive into the neural stream.
   */
  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    setTimeout(() => {
      // Forensic Safety Check
      if (typeof append === 'function') {
        try {
            append({ 
              role: 'user', 
              content: prompt,
              data: { businessId, userId }
            });
            setInputState('');
        } catch (err) {
          console.error('Aura Injection Error:', err);
        }
      }
    }, 250);
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
    const isActuallyLoading = chatLoading || status === 'streaming';

    return {
      messages: messages || [],
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
           * ✅ THE OMEGA-STABILITY WELD
           * We verify the physical existence of the 'append' function before invocation.
           * This prevents the "h.append is not a function" crash in minified builds.
           */
          if (typeof append === 'function') {
            append({ 
              role: 'user', 
              content: content,
              data: { businessId, userId } 
            });
            setInputState('');
          } else {
            throw new Error("Neural link 'append' protocol not yet initialized.");
          }
        } catch (err: any) { 
          toast.error(`Aura Handshake Interrupted: ${err.message}`);
        }
      },
      isLoading: isActuallyLoading,
      setMessages: setMessages || (() => {}),
      data: data,
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
  }, [messages, append, setMessages, data, chatLoading, status, inputState, isOpen, businessId, userId, tenantData, modules, isReady]);

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

  // --- IDENTITY PILLARS ---
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