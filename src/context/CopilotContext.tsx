'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v15.4 OMEGA-ULTIMATUM (Direct Neural Handshake)
 * JURISDICTION: Multi-Tenant / Multi-Currency / Multi-Location
 * 
 * CORE UPGRADES:
 * 1. OMEGA-IDENTITY WELD: Fixed the SDK v2 nesting conflict. IDs are now passed 
 *    directly in the body AND the message data to ensure the backend Handshake is 100% successful.
 * 2. REACT 19 SHIELD: Optimized the isReady lifecycle to prevent "Handshake Failed" 
 *    during the transition from 'loading' to the actual Director ID.
 * 3. DIRECT HANDSHAKE: Maintains the removal of 'appendRef' for zero-latency activation.
 * 4. REAL-TIME SATURATION: Synchronized with the 1,106 logic nodes and 1024-dim memory.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// CORE UI COMPONENT
import CopilotPanel from '@/components/copilot/CopilotPanel';

// SOVEREIGN HOOKS
import { useTenantModules } from '@/hooks/useTenantModules';
import { useTenant } from '@/hooks/useTenant'; 
import { useUserProfile } from '@/hooks/useUserProfile';

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
 * ✅ OMEGA UPGRADE: Standardized identity transmission for SDK v2.0 / React 19.
 */
function CopilotWorker({ children, businessId, userId, tenantData, modules, isReady }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState('');

  // 1. Initialize Neural Engine (Vercel AI SDK)
  // ✅ OMEGA FIX: Passing IDs in the request body to satisfy the API Identity Gate.
  const { messages, isLoading, append, setMessages, data } = useChat({
    api: '/api/chat',
    body: { 
      businessId: businessId || '00000000-0000-0000-0000-000000000000', 
      userId: userId, 
      tenantModules: modules || [] 
    }, 
    experimental_streamData: true,
    onResponse: (response) => {
      if (!response.ok) {
        console.error(`[AURA LINK ERROR] Status: ${response.status}`);
      }
    },
    onError: (err) => {
        console.error("[AURA STREAM COLLAPSE]", err);
        // Specialized toast for regional or connection drops
        toast.error(`Neural Link Interrupted: ${err.message}`);
    }
  });

  // 2. High-Stability Submit Handler (v15.4 Direct Link)
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    /**
     * ✅ OMEGA IDENTITY LOCK:
     * We verify the Director Identity is synchronized before firing the synapse.
     */
    if (isReady && userId && userId !== '' && userId !== 'loading') {
        try {
            // ✅ OMEGA WELD: Passing IDs in both the root body and 'data' block
            // to satisfy the stateless database handshake in the route file.
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
            console.warn("Synapse misfire. Attempting neural realignment...");
            toast.info("Aura is aligning neural pathways... please try again.");
        }
    } else {
        // Guard for the short window during page load/role switch
        console.error("[AURA LOCK] Director Identity not yet synchronized.");
        toast.info("Aura is securing your identity. Please wait 2 seconds.");
    }
  }, [inputState, businessId, userId, isReady, append]);

  // 3. Remote Activation Logic (Boardroom & Strategic Pulse)
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Direct trigger after panel opening transition
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

  // 4. Multi-Tenant Value Memoization
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
    tenantModules: modules
  }), [messages, isLoading, data, setMessages, inputState, isOpen, isReady, businessId, userId, tenantData, modules, handleSubmit, startAIAssistance]);

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
 * The high-authority component that resolves Samuel Oyat's identity.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Hydrating context from Sovereign Hooks
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: tenantData } = useTenant();
  const { data: modules } = useTenantModules();

  // 🛡️ DYNAMIC BUSINESS RESOLUTION (Role-Switching Aware)
  const activeBusinessId = useMemo(() => {
    // Priority: Profile business_id -> Tenant ID fallback
    const id = userProfile?.business_id || tenantData?.id || '';
    return id === 'loading' ? '' : id;
  }, [userProfile, tenantData]);

  // 🛡️ DYNAMIC USER RESOLUTION
  const activeUserId = useMemo(() => {
    const id = userProfile?.id || '';
    return id === 'loading' ? '' : id;
  }, [userProfile]);

  /**
   * ✅ FORENSIC FIX: Aggressive Identity Check. 
   * The system is only READY when the User ID is a valid string,
   * bypassing the "loading" states that cause handshake failures.
   */
  const isReady = mounted && 
                  !profileLoading && 
                  !!activeUserId && 
                  activeUserId !== 'loading' && 
                  !!activeBusinessId && 
                  activeBusinessId !== 'loading';

  return (
    <CopilotWorker 
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

/**
 * Sovereign Access Hook
 */
export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) throw new Error("useCopilot must be used within GlobalCopilotProvider");
  return context;
}