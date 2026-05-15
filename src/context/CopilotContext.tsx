'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v14.5 Master Sovereign Edition (THE OMEGA HANDSHAKE)
 * 
 * CORE UPGRADES:
 * 1. NEURAL BYPASS: Decoupled isReady from businessId to prevent UI blocking during tenant loading.
 * 2. PHYSICAL WELD: Hardened 'appendRef' to maintain stream integrity during saturation pulses.
 * 3. IDENTITY LOCK: Deep-links Director identity (Samuel Oyat) for immediate engagement.
 * 4. STABILITY LOCK: Prevented key-restarts to ensure a continuous forensic session.
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
 * The engine room where the Neural Link is maintained.
 */
function CopilotWorker({ children, businessId, userId, tenantData, modules, isReady }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState('');

  // 1. Initialize Neural Engine (Vercel AI SDK + BBU1 Kernel)
  const chat = useChat({
    api: '/api/chat',
    body: { 
      businessId, 
      userId, 
      tenantModules: modules || [] 
    }, 
    experimental_streamData: true,
    onResponse: (response) => {
      if (!response.ok) {
        toast.error("Aura Handshake Interrupted. Checking neural links...");
      }
    }
  });

  // ✅ THE FORENSIC WELD: 
  // We capture the 'append' function in a persistent reference.
  // This allows the UI to call Aura even if the chat object is re-hydrating.
  const appendRef = useRef<any>(null);
  useEffect(() => {
    if (typeof chat.append === 'function') {
      appendRef.current = chat.append;
    }
  }, [chat.append]);

  // 2. High-Stability Submit Handler (The "Omega Trigger")
  const handleSubmit = useCallback((e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    // v14.5: Immediate Execution if User ID is available
    if (typeof appendRef.current === 'function' && isReady) {
        appendRef.current({ 
          role: 'user', 
          content,
          data: { businessId, userId } 
        });
        setInputState('');
    } else {
        console.warn("Aura Link Handshake Pending...");
        toast.info("Aura is aligning neural pathways... please try sending once more.");
    }
  }, [inputState, businessId, userId, isReady]);

  // 3. Remote Activation Logic (Used by Boardroom & Action Buttons)
  const startAIAssistance = useCallback((prompt: string) => {
    if (!prompt) return;
    
    setInputState(prompt);
    setIsOpen(true);
    
    // Animation buffer for the side panel
    setTimeout(() => {
      if (typeof appendRef.current === 'function' && isReady) {
        appendRef.current({ 
          role: 'user', 
          content: prompt, 
          data: { businessId, userId } 
        });
        setInputState('');
      }
    }, 600);
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
    chat.messages, 
    chat.isLoading, 
    chat.data, 
    chat.setMessages,
    inputState, 
    isOpen, 
    isReady, 
    businessId, 
    userId, 
    tenantData, 
    modules, 
    handleSubmit, 
    startAIAssistance
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

  const { data: userProfile } = useUserProfile();
  const { data: tenantData } = useTenant();
  const { data: modules } = useTenantModules();

  const activeBusinessId = useMemo(() => {
    return userProfile?.business_id || tenantData?.id || '';
  }, [userProfile, tenantData]);

  const activeUserId = useMemo(() => {
    return userProfile?.id || '';
  }, [userProfile]);

  // ✅ FORENSIC FIX: Decouple isReady from the businessId. 
  // As long as the user is identified (Samuel Oyat), Aura can start her neural handshake.
  const isReady = mounted && !!activeUserId;

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