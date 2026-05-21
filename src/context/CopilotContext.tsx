'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v18.2 OMEGA-ULTIMATUM (THE INDESTRUCTIBLE QUANTUM WELD)
 * JURISDICTION: Multi-Tenant / Global ERP Infrastructure
 * 
 * CORE UPGRADES:
 * 1. QUANTUM EDGE GATEWAY: Redirects the neural stream from Vercel to Supabase 
 *    Edge Functions to physically bypass the 34.5s timeout barrier.
 * 2. SOVEREIGN JWT RECOVERY: Uses a dedicated effect to pull the physical 
 *    Access Token from Supabase Auth. This solves the "Invalid JWT" error 
 *    and ensures Samuel Oyat's identity is anchored in the Edge runtime.
 * 3. THE SANCTUARY WELD: Maintains strict isolation. The useChat hook is 
 *    physically forbidden from mounting until the database RPC returns READY.
 * 4. DIVERSION SHIELD: Hard-coded absolute pathing for the Supabase Edge 
 *    endpoint to prevent Middleware 307 body stripping.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// CORE UI COMPONENT
import CopilotPanel from '@/components/copilot/CopilotPanel';

// ✅ THE MASTER IDENTITY HOOK: Authority for Multi-Tenant Resolution
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { createClient } from '@/lib/supabase/client';

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
const supabase = createClient();

/**
 * 🛡️ THE NEURAL SANCTUARY (The Quantum Engine Room)
 * Born only when the Identity Handshake is 100% physically ready.
 */
function NeuralSanctuary({ children, businessId, userId, tenantData, isOpen, setIsOpen }: any) {
  const [inputState, setInputState] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const isSyncing = useRef(false);

  // 🛡️ OMEGA JWT RECOVERY: Extract the physical token for Edge Function authorization
  useEffect(() => {
    const syncToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            setToken(session.access_token);
        }
    };
    syncToken();
  }, []);

  // 1. Initialize Quantum Neural Engine
  // ✅ OMEGA WELD: Body and Headers strictly aligned with Supabase Edge Runtime
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: `aura-quantum-vault-${businessId}`, 
    api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/aura-quantum-audit`,
    headers: {
        'Authorization': `Bearer ${token}`, // PHYSICALLY ANCHORED JWT
        'x-bbu1-vault-id': businessId
    },
    body: { 
      businessId, 
      userId, 
      tenantModules: tenantData?.tenantModules || []
    }, 
    experimental_streamData: true,
    onResponse: (response) => {
      isSyncing.current = false;
      if (!response.ok) {
        console.error(`[AURA QUANTUM FAULT] Status: ${response.status}`);
      }
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("[AURA QUANTUM COLLAPSE]", err);
        if (!err.message.includes('abort')) {
           toast.info("Aura is aligning neural pathways... please try again.");
        }
    }
  });

  // 2. High-Stability Submit Handler (v18.2 Handshake Seal)
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSyncing.current || isLoading || !token) return;

    const content = inputState.trim();
    if (!content) return;

    try {
        isSyncing.current = true;
        console.log(`[Aura Quantum Synapse] Firing Edge Audit for Vault: ${businessId}`);
        
        // Pass IDs in the top-level 'data' key for SDK v2.0.81 compatibility
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
        console.error("QUANTUM HANDSHAKE CRASH:", err.message);
        toast.info("Aura is securing your identity... please try again in 1 second.");
    }
  }, [inputState, businessId, userId, append, tenantData, isLoading, token]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Allow panel and token state to settle
    setTimeout(() => {
        if (token) handleSubmit();
    }, 800);
  }, [isLoading, token, handleSubmit, setIsOpen]);

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

  // ✅ MASTER IDENTITY TRUTH: v16.2 MASTER ANCHOR
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
   * AI Engine only mounts when database handshake confirms READY status.
   */
  const isReady = mounted && 
                  !contextLoading && 
                  activeUserId !== '' && 
                  activeBusinessId !== '' &&
                  businessContext?.is_ready === true;

  // 🛡️ DIVERSION SHIELD: No mounting until Identity is Saturated.
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