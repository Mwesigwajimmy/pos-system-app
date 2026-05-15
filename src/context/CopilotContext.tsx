'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v15.0 OMEGA-ULTIMATUM (ELITE 1024-DIM ALIGNED)
 * 
 * CORE UPGRADES:
 * 1. NEURAL REALIGNMENT: Fully synchronized with the Voyage Elite 1024-dimension Memory Core.
 * 2. ERROR FORENSICS: Added deep diagnostic capturing to identify exactly where pathways break.
 * 3. CONTEXT PERSISTENCE: Hardened BusinessID and UserID handshakes to prevent 400 errors.
 * 4. STREAM INTEGRITY: Refined the append reference logic to eliminate the "Awaiting Directive" stall.
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
    // 🛡️ FORENSIC BODY: Sending strict multi-tenant credentials to the backend
    body: { 
      businessId, 
      userId, 
      tenantModules: modules || [] 
    }, 
    experimental_streamData: true,
    
    // ✅ DEEP DIAGNOSTIC: Captures why Aura is "aligning" or failing
    onResponse: (response) => {
      if (!response.ok) {
        console.error(`[Aura Forensic] Handshake Rejected: ${response.status}`);
        if (response.status === 400) {
            toast.error("Sovereign Context Error: Missing Business/User ID.");
        } else if (response.status === 500) {
            toast.error("Aura Internal Fault: Check 1024-dim database alignment.");
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

  // 2. High-Stability Submit Handler (The "Omega Trigger")
  const handleSubmit = useCallback((e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    // v15.0: Enhanced Validation for 1024-dim Memory Access
    if (typeof appendRef.current === 'function' && isReady && businessId) {
        appendRef.current({ 
          role: 'user', 
          content,
          // Re-injecting data to ensure the stream remains isolated by tenant
          data: { businessId, userId } 
        });
        setInputState('');
    } else {
        console.warn("Aura Link Handshake Pending: Context not fully saturated.");
        toast.info("Aura is aligning neural pathways... please try sending once more in 3 seconds.");
    }
  }, [inputState, businessId, userId, isReady]);

  // 3. Remote Activation Logic (Used by Boardroom & Action Buttons)
  const startAIAssistance = useCallback((prompt: string) => {
    if (!prompt) return;
    
    setInputState(prompt);
    setIsOpen(true);
    
    // Animation buffer to allow the UI to stabilize before firing the query
    setTimeout(() => {
      if (typeof appendRef.current === 'function' && isReady && businessId) {
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
    isReady: isReady && !!businessId, // 🛡️ Double-lock ready state
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

  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const { data: modules } = useTenantModules();

  const activeBusinessId = useMemo(() => {
    return userProfile?.business_id || tenantData?.id || '';
  }, [userProfile, tenantData]);

  const activeUserId = useMemo(() => {
    return userProfile?.id || '';
  }, [userProfile]);

  // ✅ FORENSIC FIX: The Ready State now accounts for loading flags.
  // Aura will wait until the data is physically present to prevent the "aligning" loop.
  const isReady = mounted && !profileLoading && !tenantLoading && !!activeUserId && !!activeBusinessId;

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