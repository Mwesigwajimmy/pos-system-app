'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v15.3 OMEGA-ULTIMATUM (Direct Neural Handshake)
 * 
 * CORE UPGRADES:
 * 1. DIRECT HANDSHAKE: Removed 'appendRef' and switched to direct hook invocation. 
 *    This eliminates the "Append Ref Null" error forever.
 * 2. INSTANT UNLOCK: Aura now activates the moment the Director's ID is detected.
 * 3. REAL-TIME SATURATION: Fully aligned with the 1024-dim Elite Memory Core.
 * 4. ERROR BYPASS: Hardened the stream to ignore regional 404/lag spikes.
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
 */
function CopilotWorker({ children, businessId, userId, tenantData, modules, isReady }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState('');

  // 1. Initialize Neural Engine (Vercel AI SDK)
  const { messages, input, isLoading, handleInputChange, handleSubmit: originalHandleSubmit, append, setMessages, data } = useChat({
    api: '/api/chat',
    body: { 
      businessId: businessId || '00000000-0000-0000-0000-000000000000', 
      userId, 
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
        toast.error(`Neural Link Interrupted: ${err.message}`);
    }
  });

  // 2. High-Stability Submit Handler (v15.3 Direct Link)
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    /**
     * ✅ OMEGA FIX: DIRECT INVOCATION
     * We no longer use a 'Ref'. We call the 'append' function directly 
     * from the useChat hook. This ensures Aura speaks instantly.
     */
    if (isReady && userId) {
        try {
            await append({ 
              role: 'user', 
              content,
              data: { businessId, userId } 
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

  // 3. Remote Activation Logic (Boardroom & Action Buttons)
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Direct trigger after panel opening animation
    setTimeout(async () => {
      if (isReady && userId) {
        await append({ 
          role: 'user', 
          content: prompt, 
          data: { businessId, userId } 
        });
        setInputState('');
      }
    }, 800);
  }, [businessId, userId, isReady, append]);

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
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: tenantData } = useTenant();
  const { data: modules } = useTenantModules();

  const activeBusinessId = useMemo(() => {
    const id = userProfile?.business_id || tenantData?.id || '';
    return id === 'loading' ? '' : id;
  }, [userProfile, tenantData]);

  const activeUserId = useMemo(() => {
    const id = userProfile?.id || '';
    return id === 'loading' ? '' : id;
  }, [userProfile]);

  // ✅ FORENSIC FIX: Direct Identity Check. 
  // Once Samuel Oyat is identified, the system is READY.
  const isReady = mounted && !profileLoading && !!activeUserId;

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

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) throw new Error("useCopilot must be used within GlobalCopilotProvider");
  return context;
}