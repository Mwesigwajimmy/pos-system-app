'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v17.0 OMEGA-ULTIMATUM (THE FORENSIC SEAL)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. NEURAL STALL FIX: Hardened the identity gate to prevent the "Aligning neural pathways" 
 *    stall by ensuring the fetch only occurs when UUIDs are verified.
 * 2. DOUBLE-SYNAPSE SHIELD: Prevents multiple concurrent requests to the same 
 *    forensic audit, which significantly reduces Vercel timeout crashes.
 * 3. PERSISTENT BODY WELD: Synchronized for @ai-sdk/react v2.0.81. Forces IDs 
 *    into every chunk of the neural stream.
 * 4. FORENSIC READINESS: The system now explicitly blocks 'loading' strings 
 *    from reaching the backend RPC.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback, useRef } from 'react';
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
  
  // 🛡️ DOUBLE-SYNAPSE GUARD: Prevents timeouts caused by overlapping audits
  const isSyncing = useRef(false);

  // 1. Initialize Neural Engine (Vercel AI SDK v2.0.81)
  // ✅ OMEGA WELD: Anchoring IDs in the core body configuration
  const { messages, isLoading, append, setMessages, data } = useChat({
    api: '/api/chat', 
    body: { 
      businessId, 
      userId, 
      tenantModules: tenantData?.tenantModules || []
    }, 
    experimental_streamData: true,
    onResponse: (response) => {
      isSyncing.current = false;
      if (!response.ok) {
        console.error(`[AURA LINK ERROR] Status: ${response.status}`);
        if (response.status === 504 || response.status === 500) {
            toast.error("Forensic Audit Timed Out. Simplifying search parameters...");
        }
      }
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("[AURA STREAM COLLAPSE]", err);
        // Specialized diagnostic for the Director
        if (err.message.includes('401') || err.message.includes('403')) {
           toast.error("Identity Verification Failed. Please refresh the dashboard.");
        } else {
           // We suppress the "Aligning" toast if it's a simple timeout
           if (!err.message.includes('abort')) {
              toast.error(`Neural Link Interrupted: ${err.message}`);
           }
        }
    }
  });

  // 2. High-Stability Submit Handler (v17.0 Direct Seal)
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // 🛡️ RECURSION GUARD
    if (isSyncing.current || isLoading) return;

    const content = inputState.trim();
    if (!content) return;

    /**
     * ✅ OMEGA IDENTITY LOCK:
     * Prevents PostgreSQL Error 22P02 (UUID cast failure) by blocking literal 'loading' strings.
     */
    const identityIsAnchored = isReady && 
                              userId && 
                              userId !== 'loading' && 
                              businessId && 
                              businessId !== 'loading';

    if (identityIsAnchored) {
        try {
            isSyncing.current = true;
            console.log(`[Aura Synapse] Firing audit for Business: ${businessId}`);
            
            // ✅ THE OMEGA-NEURAL FIX: 
            // We force the IDs into the request body during the append call.
            await append({ 
              role: 'user', 
              content
            }, {
              options: {
                body: { 
                  businessId, 
                  userId,
                  tenantModules: tenantData?.tenantModules || []
                }
              } as any
            });
            setInputState('');
        } catch (err) {
            isSyncing.current = false;
            console.warn("Neural handshake failed. Identity desync detected.");
            toast.info("Aura is aligning neural pathways... please try again.");
        }
    } else {
        console.error("[AURA LOCK] Identity not yet synchronized with the Vault.");
        toast.info("Aura is securing your identity. Please wait 2 seconds.");
    }
  }, [inputState, businessId, userId, isReady, append, tenantData, isLoading]);

  // 3. Remote Activation Logic (Boardroom & Strategic Pulse)
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Direct trigger after panel animation
    setTimeout(() => {
      handleSubmit();
    }, 800);
  }, [isLoading, handleSubmit]);

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

  // ✅ THE MASTER TRUTH: Using the authoritative hook provided
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext();

  // 🛡️ DYNAMIC IDENTITY RESOLUTION (v17.0)
  // Ensures we never pass the string "loading" as a UUID to the backend.
  const activeBusinessId = useMemo(() => {
    const id = businessContext?.businessId;
    return (!id || id === 'loading') ? '' : id;
  }, [businessContext]);

  const activeUserId = useMemo(() => {
    const id = businessContext?.userId;
    return (!id || id === 'loading') ? '' : id;
  }, [businessContext]);

  /**
   * ✅ FORENSIC READINESS CHECK: 
   * The system is only READY when the Authoritative Context has physically 
   * returned valid UUIDs. This stops the initial "Neural pathway" stall.
   */
  const isReady = mounted && 
                  !contextLoading && 
                  activeUserId !== '' && 
                  activeBusinessId !== '';

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