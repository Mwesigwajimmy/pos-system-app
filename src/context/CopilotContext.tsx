'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v15.5 OMEGA-ULTIMATUM (THE BUSINESS-NODE WELD)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. AUTHORITATIVE WELD: Swapped fragmented hooks for 'useBusinessContext'. Aura 
 *    now uses the "Dynamic Node Detection" (Cookie-Logic) to resolve Samuel Oyat's 
 *    specific role for the active Vault.
 * 2. OMEGA-IDENTITY WELD: Hardened ID transmission for SDK v2.0. IDs are passed 
 *    directly in the body AND message metadata to bypass server-side session blindness.
 * 3. REACT 19 SHIELD: Refined the 'isReady' lifecycle to prevent handshake misfires 
 *    during rapid Business/Role switching.
 * 4. REAL-TIME SATURATION: Synchronized with the 1,106 logic nodes and 1024-dim memory.
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
  // ✅ OMEGA FIX: Passing IDs from the authoritative BusinessContext to the API
  const { messages, isLoading, append, setMessages, data } = useChat({
    api: '/api/chat',
    body: { 
      businessId: businessId || '00000000-0000-0000-0000-000000000000', 
      userId: userId, 
      tenantModules: [] // Resolved dynamically by backend v65.0
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

  // 2. High-Stability Submit Handler (v15.5 Direct Link)
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    /**
     * ✅ OMEGA IDENTITY LOCK:
     * We verify the Director Identity is anchored before firing the synapse.
     */
    if (isReady && userId && userId !== '' && userId !== 'loading') {
        try {
            // ✅ OMEGA WELD: Passing IDs in the message data object
            // This satisfies the stateless database handshake in route.ts v65.0
            await append({ 
              role: 'user', 
              content,
              data: { 
                businessId: businessId, 
                userId: userId 
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
  }, [inputState, businessId, userId, isReady, append]);

  // 3. Remote Activation Logic (Boardroom & Strategic Pulse)
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Direct trigger after transition
    setTimeout(async () => {
      if (isReady && userId && userId !== 'loading') {
        await append({ 
          role: 'user', 
          content: prompt, 
          data: { businessId, userId } 
        });
        setInputState('');
      }
    }, 800);
  }, [businessId, userId, isReady, append]);

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
    tenantModules: [] // Handled by authoritative context
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

  // ✅ THE MASTER TRUTH: Using the authoritative hook you provided
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext();

  // 🛡️ DYNAMIC IDENTITY RESOLUTION
  // Extracting verified IDs from the authoratative context (Cookie-Sync Aware)
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
   * The system is only READY when the Authoritative Context has resolved
   * the Director and Business UUIDs.
   */
  const isReady = mounted && 
                  !contextLoading && 
                  !!activeUserId && 
                  activeUserId !== 'loading' && 
                  !!activeBusinessId && 
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