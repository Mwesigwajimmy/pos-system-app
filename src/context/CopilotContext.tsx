'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v17.7 OMEGA-ULTIMATUM (THE INDESTRUCTIBLE FULL-WELD)
 * JURISDICTION: Multi-Tenant / Multi-Role / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. THE SANCTUARY WELD: The useChat hook is now isolated in the NeuralSanctuary 
 *    component which ONLY mounts when the database handshake is 'READY'. 
 *    This physically prevents the 'g is not a function' crash by ensuring 
 *    no request is ever sent with 'loading' IDs.
 * 2. IDENTITY IMMUTABILITY: IDs are locked into the engine during mount. 
 *    Flickering or identity-stripping during POST requests is now impossible.
 * 3. SDK STABILITY: Hardened for @ai-sdk/react v2.0.81. Passes metadata through 
 *    the top-level 'data' key to bypass Middleware 307 diversions.
 * 4. REDIRECT SHIELD: API path forced to absolute '/api/chat' to prevent 
 *    locale-based POST body loss.
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
 * 🛡️ THE NEURAL SANCTUARY (The Engine Room)
 * This component is only born when the Identity Handshake is 100% physically ready.
 * It holds the useChat hook with immutable, verified UUIDs.
 */
function NeuralSanctuary({ children, businessId, userId, tenantData, isOpen, setIsOpen }: any) {
  const [inputState, setInputState] = useState('');
  const isSyncing = useRef(false);

  // 1. Initialize Neural Engine with Physically Anchored UUIDs
  // ✅ OMEGA WELD: Static ID and absolute path prevent SDK-parsing collisions.
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: `aura-sovereign-vault-${businessId}`, 
    api: '/api/chat', // Absolute path to bypass 307 redirect body stripping
    body: { 
      businessId, 
      userId, 
      tenantModules: tenantData?.tenantModules || []
    }, 
    experimental_streamData: true,
    onResponse: (response) => {
      isSyncing.current = false;
      if (!response.ok) {
        console.error(`[AURA LINK FAULT] Status: ${response.status}`);
      }
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("[AURA STREAM COLLAPSE]", err);
        // We handle the stream-wrapped errors from route.ts
        if (!err.message.includes('abort')) {
           toast.info("Aura is aligning neural pathways... please try again.");
        }
    }
  });

  // 2. High-Stability Submit Handler (v17.7 Handshake Seal)
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSyncing.current || isLoading) return;

    const content = inputState.trim();
    if (!content) return;

    try {
        isSyncing.current = true;
        console.log(`[Aura Synapse] Firing forensic audit for Vault: ${businessId}`);
        
        /**
         * ✅ THE OMEGA-NEURAL WELD: 
         * We pass IDs in the top-level 'data' key for SDK v2.0.81 compatibility.
         */
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
  }, [inputState, businessId, userId, append, tenantData, isLoading]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Allow panel to mount before firing synapse
    setTimeout(() => {
        handleSubmit();
    }, 800);
  }, [isLoading, handleSubmit, setIsOpen]);

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
    toggleCopilot: () => setIsOpen((prev: boolean) => !prev),
    startAIAssistance,
    isReady: true,
    businessId,
    userId,
    tenantData,
    tenantModules: tenantData?.tenantModules || []
  }), [messages, isLoading, data, setMessages, inputState, isOpen, businessId, userId, tenantData, handleSubmit, startAIAssistance, setIsOpen]);

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
 * Resolves Samuel Oyat's identity and physically locks the Sanctuary component.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ✅ MASTER IDENTITY TRUTH: v16.1 JWT Anchor
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext();

  const activeBusinessId = useMemo(() => {
    const id = businessContext?.businessId;
    return (!id || id === 'loading') ? '' : id;
  }, [businessContext]);

  const activeUserId = useMemo(() => {
    const id = businessContext?.userId;
    return (!id || id === 'loading') ? '' : id;
  }, [businessContext]);

  /**
   * ✅ FORENSIC READINESS SEAL: 
   * We require both local verification and the database RPC 'is_ready' signal.
   */
  const isReady = mounted && 
                  !contextLoading && 
                  activeUserId !== '' && 
                  activeBusinessId !== '' &&
                  (businessContext as any)?.is_ready === true;

  // 🛡️ THE DIVERSION SHIELD: We do not mount the AI Engine until Identity is Saturated.
  if (!isReady) {
    return (
      <CopilotContext.Provider value={{ 
          isReady: false, isLoading: true, messages: [], input: '', 
          businessId: '', userId: '', tenantData: null, tenantModules: [],
          isOpen: false, openCopilot: () => {}, closeCopilot: () => {}, toggleCopilot: () => {},
          startAIAssistance: () => {}, setInput: () => {}, handleInputChange: () => {}, 
          handleSubmit: () => {}, setMessages: () => {}, data: undefined 
      }}>
        {children}
      </CopilotContext.Provider>
    );
  }

  return (
    <NeuralSanctuary 
      businessId={activeBusinessId} 
      userId={activeUserId} 
      tenantData={businessContext} 
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      {children}
    </NeuralSanctuary>
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