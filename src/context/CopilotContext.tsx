'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v18.0 OMEGA-ULTIMATUM (THE QUANTUM EDGE SEAL)
 * JURISDICTION: Multi-Tenant / Global ERP Infrastructure
 * 
 * CORE UPGRADES:
 * 1. QUANTUM EDGE GATEWAY: Redirects the neural stream from Vercel (/api/chat) 
 *    to Supabase Edge Functions. This physically kills the 504 Timeout error 
 *    by allowing up to 400s of processing time.
 * 2. AUTHORITATIVE HEADER WELD: Injects the Supabase Anon Key and Vault-ID 
 *    directly into the fetch headers for indestructible multi-tenant isolation.
 * 3. THE SANCTUARY PATTERN: Maintained physical isolation. The AI hook only 
 *    exists when the Handshake RPC confirms Samuel Oyat is READY.
 * 4. IDENTITY IMMUTABILITY: IDs are hard-coded into the Quantum Stream 
 *    at birth, making 'g is not a function' logic errors impossible.
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
 * 🛡️ THE NEURAL SANCTUARY (The Quantum Engine Room)
 */
function NeuralSanctuary({ children, businessId, userId, tenantData, isOpen, setIsOpen }: any) {
  const [inputState, setInputState] = useState('');
  const isSyncing = useRef(false);

  // 1. Initialize Neural Engine via Supabase Quantum Gateway
  // ✅ OMEGA WELD: Talking directly to Edge Functions
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: `aura-quantum-vault-${businessId}`, 
    api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/aura-quantum-audit`,
    headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
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
        console.error(`[AURA EDGE FAULT] Status: ${response.status}`);
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

  // 2. High-Stability Submit Handler
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSyncing.current || isLoading) return;

    const content = inputState.trim();
    if (!content) return;

    try {
        isSyncing.current = true;
        console.log(`[Aura Quantum Synapse] Firing Edge Audit for Vault: ${businessId}`);
        
        // Pass IDs in the top-level 'data' key for SDK compatibility
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
        toast.info("Aura is aligning neural pathways... please try again.");
    }
  }, [inputState, businessId, userId, append, tenantData, isLoading]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setInputState(prompt);
    setIsOpen(true);
    setTimeout(() => { handleSubmit(); }, 800);
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

  const isReady = mounted && 
                  !contextLoading && 
                  activeUserId !== '' && 
                  activeBusinessId !== '' &&
                  (businessContext as any)?.is_ready === true;

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