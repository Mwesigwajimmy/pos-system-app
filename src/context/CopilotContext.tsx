'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v17.1 OMEGA-ULTIMATUM (THE FINAL SEAL)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. SDK HANDSHAKE WELD: Swapped 'options.body' for top-level 'data' in the append 
 *    call. This is the definitive fix for SDK v2.0.81 identity stripping.
 * 2. IDENTITY RECOVERY: Fully synchronized with v16.1 BusinessContext hook 
 *    to prioritize JWT Metadata over browser cookies.
 * 3. STALL ELIMINATION: Physically blocks the 'append' synapse until valid 
 *    UUIDs are anchored, killing the "Aligning neural pathways" 202 error.
 * 4. RECURSION GUARD: Hardened isSyncing refs to prevent duplicate audit triggers.
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
  // ✅ OMEGA WELD: Body is set here, but metadata is updated via append.data
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
      }
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("[AURA STREAM COLLAPSE]", err);
        if (err.message.includes('401') || err.message.includes('403')) {
           toast.error("Identity Verification Failed. Please refresh the dashboard.");
        } else if (!err.message.includes('abort')) {
           toast.error(`Neural Link Interrupted: ${err.message}`);
        }
    }
  });

  // 2. High-Stability Submit Handler (v17.1 Handshake Fix)
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
            console.log(`[Aura Synapse] Firing audit for Vault: ${businessId}`);
            
            // ✅ THE OMEGA-NEURAL WELD: 
            // For SDK v2.0.81, the IDs must be passed in the top-level 'data' key.
            // This ensures they are not stripped by Middleware or React 19 transitions.
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
            console.error("HANDSHAKE CRASH:", err.message);
            toast.info("Aura is aligning neural pathways... please try again.");
        }
    } else {
        console.error("[AURA LOCK] Director Identity not yet synchronized.");
        toast.info("Aura is securing your identity. Please wait 2 seconds.");
    }
  }, [inputState, businessId, userId, isReady, append, tenantData, isLoading]);

  // 3. Remote Activation Logic (Boardroom & Strategic Pulse)
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    
    // Set input and open panel first
    setInputState(prompt);
    setIsOpen(true);
    
    // Delayed trigger to allow state to settle
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

  // ✅ THE MASTER TRUTH: Using the v16.1 authoritative hook
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext();

  // 🛡️ DYNAMIC IDENTITY RESOLUTION (v17.1 HARDENED)
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
   * The system is only READY when the IDs are UUIDs (not 'loading').
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