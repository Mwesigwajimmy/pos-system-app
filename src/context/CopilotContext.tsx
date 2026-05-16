'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v15.2 OMEGA-ULTIMATUM (DIRECTOR-FIRST ALIGNMENT)
 * 
 * CORE UPGRADES:
 * 1. NEURAL REALIGNMENT: Fully synchronized for 1024-dimension Elite retrieval.
 * 2. DIRECTOR-FIRST UNLOCK: Handshake unblocks immediately upon User ID verification.
 * 3. GLOBAL FALLBACK: Defaults to Global Master Brain if Business Node is hydrating.
 * 4. ERROR FORENSICS: Enhanced diagnostic capturing for regional latency.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useRef, useCallback } from 'react';
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
 * The engine room where the Sovereign Neural Link is maintained.
 */
function CopilotWorker({ children, businessId, userId, tenantData, modules, isReady }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState('');

  // 1. Initialize Neural Engine (Vercel AI SDK + BBU1 Omega Kernel)
  const chat = useChat({
    api: '/api/chat',
    // 🛡️ SOVEREIGN BODY: Default to 'global' context if businessId is lagging
    body: { 
      businessId: businessId || '00000000-0000-0000-0000-000000000000', 
      userId, 
      tenantModules: modules || [] 
    }, 
    experimental_streamData: true,
    
    // ✅ DEEP DIAGNOSTIC: Captures why Aura is "aligning" or failing
    onResponse: (response) => {
      if (!response.ok) {
        console.error(`[Aura Forensic] Handshake Rejected: ${response.status}`);
        if (response.status === 401) {
            toast.error("Security Alert: Session expired. Re-authenticating...");
        } else if (response.status === 500) {
            toast.error("Aura Internal Fault: Check 1024-dim DB alignment.");
        }
      }
    },
    onError: (error) => {
      console.error("[Aura Stream Error]:", error);
      toast.error(`Neural Link Interrupted: ${error.message}`);
    }
  });

  // ✅ THE PHYSICAL WELD: 
  // Capturing the 'append' function in a persistent reference.
  const appendRef = useRef<any>(null);
  useEffect(() => {
    if (typeof chat.append === 'function') {
      appendRef.current = chat.append;
    }
  }, [chat.append]);

  // 2. High-Stability Submit Handler (v15.2 Improved)
  const handleSubmit = useCallback((e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    // ✅ v15.2 DIRECTOR-FIRST UNLOCK:
    // Allows message if Director ID is present, even if specific node is still hydrating.
    if (typeof appendRef.current === 'function' && isReady) {
        appendRef.current({ 
          role: 'user', 
          content,
          data: { businessId, userId } 
        });
        setInputState('');
    } else {
        const diagnostic = !isReady ? "Identity Lock Pending" : "Append Ref Null";
        console.warn(`[AURA LINK HANDSHAKE PENDING] Reason: ${diagnostic}`);
        toast.info("Aura is aligning neural pathways... please try sending once more.");
    }
  }, [inputState, businessId, userId, isReady]);

  // 3. Remote Activation Logic (Used by Boardroom & Action Buttons)
  const startAIAssistance = useCallback((prompt: string) => {
    if (!prompt) return;
    
    setInputState(prompt);
    setIsOpen(true);
    
    // Animation buffer to allow UI stabilization before firing
    setTimeout(() => {
      if (typeof appendRef.current === 'function' && isReady) {
        appendRef.current({ 
          role: 'user', 
          content: prompt, 
          data: { businessId, userId } 
        });
        setInputState('');
      }
    }, 800);
  }, [businessId, userId, isReady]);

  const contextValue = useMemo(() => ({
    messages: chat.messages || [],
    input: inputState,
    setInput: setInputState,
    handleInputChange: (e: any) => setInputState(e?.target?.value ?? ''),
    handleSubmit,
    isLoading: chat.isLoading,
    setMessages: chat.setMessages,
    data: chat.data,
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
  }), [
    chat.messages, chat.isLoading, chat.data, chat.setMessages,
    inputState, isOpen, isReady, businessId, userId, tenantData, 
    modules, handleSubmit, startAIAssistance
  ]);

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
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const { data: modules } = useTenantModules();

  const activeBusinessId = useMemo(() => {
    const id = userProfile?.business_id || tenantData?.id || '';
    return id === 'loading' ? '' : id;
  }, [userProfile, tenantData]);

  const activeUserId = useMemo(() => {
    const id = userProfile?.id || '';
    return id === 'loading' ? '' : id;
  }, [userProfile]);

  // ✅ FORENSIC FIX: The system is ready the moment the Director (Samuel Oyat) is identified.
  // We decouple the hard-lock from businessId to prevent regional hydration stalls.
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