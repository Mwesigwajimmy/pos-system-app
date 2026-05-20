'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v16.0 OMEGA-ULTIMATUM (THE NEURAL-WELD STABILIZER)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. HYPER-STABLE HANDSHAKE: IDs are now injected dynamically during the 'append' 
 *    call. This prevents the "Handshake Desync" caused by React race conditions.
 * 2. DIRECTOR IDENTITY ANCHOR: Hard-coded fallback logic ensures that even if 
 *    cookies are latent, the session userId acts as the master key.
 * 3. REACT 19 OPTIMIZATION: Memoized the submit handlers to prevent neural 
 *    misfires during sidebar transitions.
 * 4. INCOGNITO SHIELD: Specifically tuned to handle empty cookie states by 
 *    resolving the Business ID through the authoritative context query.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// CORE UI COMPONENT
import CopilotPanel from '@/components/copilot/CopilotPanel';

// ✅ THE MASTER IDENTITY HOOK: Authority for Multi-Tenant Resolution
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface CopilotContextType {
  messages: any[]; 
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: any) => void;
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
 * COPILOT WORKER
 * The engine room where the direct Neural Link is maintained.
 */
function CopilotWorker({ children, businessId, userId, tenantData, isReady }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState('');

  // 1. Initialize Neural Engine (Vercel AI SDK)
  const { messages, isLoading, append, setMessages, data } = useChat({
    api: '/api/chat',
    // Baseline body - will be overridden by dynamic append for high-fidelity sync
    body: { 
      businessId: businessId || '00000000-0000-0000-0000-000000000000', 
      userId: userId, 
      tenantModules: [] 
    }, 
    experimental_streamData: true,
    onResponse: (response) => {
      if (!response.ok) {
        console.error(`[AURA LINK ERROR] Status: ${response.status}`);
      }
    },
    onError: (err) => {
        console.error("[AURA STREAM COLLAPSE]", err);
        toast.error(`Neural Link Interrupted: ${err.message}`);
    }
  });

  /**
   * 2. High-Stability Submit Handler (v16.0 OMEGA WELD)
   * This logic ensures the IDs are passed in the request body at CALL TIME.
   */
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    // Verify identity anchors before firing synapse
    const identityIsVerified = isReady && userId && userId !== 'loading' && businessId && businessId !== 'loading';

    if (identityIsVerified) {
        try {
            // ✅ THE OMEGA FIX: We override the request body dynamically inside 'append'
            // This bypasses SDK initialization blindness and solves the Neural Sink.
            await append({ 
              role: 'user', 
              content 
            }, {
              body: {
                businessId: businessId,
                userId: userId,
                tenantModules: tenantData?.tenantModules || []
              }
            });
            setInputState('');
        } catch (err) {
            console.warn("Neural handshake failed. Retrying...");
            toast.info("Aura is aligning neural pathways... please try again.");
        }
    } else {
        console.error("[AURA LOCK] Director Identity not yet synchronized.");
        toast.info("Aura is securing your identity. Please wait 2 seconds.");
    }
  }, [inputState, businessId, userId, isReady, append, tenantData]);

  // 3. Remote Activation Logic (Boardroom & Strategic Pulse)
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Direct trigger after panel transition
    setTimeout(async () => {
      if (isReady && userId && userId !== 'loading') {
        await append({ 
          role: 'user', 
          content: prompt
        }, {
          body: {
            businessId: businessId,
            userId: userId,
            tenantModules: tenantData?.tenantModules || []
          }
        });
        setInputState('');
      }
    }, 800);
  }, [businessId, userId, isReady, append, tenantData]);

  // 4. Identity-Aware Memoization
  const contextValue = useMemo(() => ({
    messages: messages || [],
    input: inputState,
    setInput: setInputState,
    handleInputChange: (e: any) => setInputState(e?.target?.value ?? ''),
    handleSubmit,
    isLoading,
    setMessages,
    data,
    isOpen,
    openCopilot: () => setIsOpen(true),
    closeCopilot: () => setIsOpen(false),
    toggleCopilot: () => setIsOpen(prev => !prev),
    startAIAssistance,
    isReady,
    businessId,
    userId,
    tenantData,
    tenantModules: tenantData?.tenantModules || []
  }), [messages, isLoading, data, setMessages, inputState, isOpen, isReady, businessId, userId, tenantData, handleSubmit, startAIAssistance]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-[440px] sm:w-[600px] p-0 border-l shadow-2xl overflow-hidden bg-background/95 backdrop-blur-md"
        >
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

/**
 * GLOBAL COPILOT PROVIDER
 * The high-authority component that resolves Samuel Oyat's identity 
 * through the authoritative business context hook.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ✅ THE MASTER TRUTH: Using the authoritative hook for identity resolution
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext();

  // 🛡️ DYNAMIC IDENTITY RESOLUTION
  const activeBusinessId = useMemo(() => {
    const id = businessContext?.businessId || '';
    return id === 'loading' ? '' : id;
  }, [businessContext]);

  const activeUserId = useMemo(() => {
    const id = businessContext?.userId || '';
    return id === 'loading' ? '' : id;
  }, [businessContext]);

  /**
   * ✅ FORENSIC READINESS CHECK: 
   * Validates that both the Director and Business UUIDs are anchored.
   */
  const isReady = mounted && 
                  !contextLoading && 
                  !!activeUserId && 
                  activeUserId !== '' && 
                  activeUserId !== 'loading' && 
                  !!activeBusinessId && 
                  activeBusinessId !== '' &&
                  activeBusinessId !== 'loading';

  return (
    <CopilotWorker 
      businessId={activeBusinessId} 
      userId={activeUserId}
      tenantData={businessContext}
      isReady={isReady}
    >
      {children}
    </CopilotWorker>
  );
}

/**
 * Sovereign Access Hook
 */
export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) throw new Error("useCopilot must be used within GlobalCopilotProvider");
  return context;
}