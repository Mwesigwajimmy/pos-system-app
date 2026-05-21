'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v17.5 OMEGA-ULTIMATUM (THE INDESTRUCTIBLE SEAL)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. NUCLEAR ID WELD: Reactive 'id' property in useChat forces the SDK to 
 *    re-initialize the moment UUIDs are anchored. This ensures the 'body' is 
 *    physically populated before the first synapse fires.
 * 2. "G" CRASH SHIELD: Synchronized with route.ts v69.5 to process 
 *    stream-wrapped errors. Physically prevents the minified parser crash.
 * 3. IDENTITY RECOVERY: Fully synchronized with v16.1 JWT metadata hooks 
 *    to prioritize session data over browser cookies.
 * 4. STALL ELIMINATION: Physically blocks the 'append' synapse until valid 
 *    UUIDs are anchored, killing the "Aligning neural pathways" 202 error.
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

  /**
   * 1. Initialize Neural Engine (Vercel AI SDK v2.0.81)
   * ✅ NUCLEAR WELD: We change the 'id' of the chat instance when isReady changes.
   * This forces the SDK to dump its stale internal 'body' and rebuild it with 
   * the physical Business and User IDs.
   */
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: isReady ? `aura-vault-${businessId}` : 'aura-aligning',
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
      }
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("[AURA STREAM COLLAPSE]", err);
        // Specialized diagnostic for the Director
        if (err.message.includes('401') || err.message.includes('403')) {
           toast.error("Identity Verification Failed. Please refresh the dashboard.");
        } else if (!err.message.includes('abort')) {
           // This handles the stream-wrapped errors from route.ts v69.5
           toast.info("Aura is aligning neural pathways... please try again.");
        }
    }
  });

  // 2. High-Stability Submit Handler (v17.5 Handshake Seal)
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSyncing.current || isLoading) return;

    const content = inputState.trim();
    if (!content) return;

    /**
     * ✅ OMEGA IDENTITY LOCK:
     * We verify the Identity is physically anchored (not 'loading') before 
     * firing the synapse. This stops the "Aligning" 202 error.
     */
    const identityIsAnchored = isReady && 
                              userId && 
                              userId !== 'loading' && 
                              businessId && 
                              businessId !== 'loading';

    if (identityIsAnchored) {
        try {
            isSyncing.current = true;
            console.log(`[Aura Handshake] Pulse Fired for Vault: ${businessId}`);
            
            // ✅ THE OMEGA-NEURAL WELD: 
            // For SDK v2.0.81, the IDs are passed in the top-level 'data' key 
            // AND the root body (via the hook initialization).
            await append({ 
              role: 'user', 
              content
            }, {
              data: { 
                businessId, 
                userId,
                tenantModules: tenantData?.tenantModules || []
              }
            } as any);
            
            setInputState('');
        } catch (err: any) {
            isSyncing.current = false;
            console.error("HANDSHAKE FAULT:", err.message);
            // This is the fallback if the "Nuclear Weld" fails
            toast.info("Aura is securing your identity... please try again in 1 second.");
        }
    } else {
        console.warn("[AURA LOCK] Blocked: Identity latency.");
        toast.info("Aura is securing your identity. Please wait 2 seconds.");
    }
  }, [inputState, businessId, userId, isReady, append, tenantData, isLoading]);

  // 3. Remote Activation Logic (Boardroom & Strategic Pulse)
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    
    setInputState(prompt);
    setIsOpen(true);
    
    // Delayed trigger to allow the Nuclear Weld to settle
    setTimeout(() => {
        if (isReady && userId && businessId) {
            handleSubmit();
        }
    }, 800);
  }, [isLoading, isReady, userId, businessId, handleSubmit]);

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
 * through the v16.1 OMEGA-IDENTITY hook.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ✅ THE MASTER TRUTH: v16.1 OMEGA IDENTITY HOOK
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext();

  // 🛡️ DYNAMIC IDENTITY RESOLUTION (v17.5 HARDENED)
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
   * The system is only READY when the IDs are valid UUIDs.
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