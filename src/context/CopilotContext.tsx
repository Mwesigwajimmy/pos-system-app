'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v13.5 Master Sovereign Edition (THE FINAL WELD)
 * 
 * CORE FIXES:
 * 1. PHYSICAL WELD: Restores 'appendRef' to eliminate "append is not a function" errors.
 * 2. IDENTITY LOCK: Hard-links to verified UUIDs from the User Profile.
 * 3. PERSISTENCE: Zero-latency mounting (No 'key' restarts).
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// ALERT: Ensure this points to your active UI Panel
import CopilotPanel from '@/components/copilot/CopilotPanel';

import { useBusinessContext } from '@/hooks/useBusinessContext'; 
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

function CopilotWorker({ children, businessId, userId, tenantData, modules, isReady }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputState, setInputState] = useState('');

  // 1. Initialize Neural Engine
  const chat = useChat({
    api: '/api/chat',
    body: { businessId, userId, tenantModules: modules || [] }, 
    experimental_streamData: true,
  });

  // ✅ THE FORENSIC WELD: 
  // This ensures 'append' is captured in a persistent reference.
  // This stops the "Initializing..." toast from blocking the Director.
  const appendRef = useRef<any>(null);
  useEffect(() => {
    if (typeof chat.append === 'function') {
      appendRef.current = chat.append;
    }
  }, [chat.append]);

  // 2. High-Stability Submit Handler
  const handleSubmit = useCallback((e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    // Use the Welded Reference for immediate execution
    if (typeof appendRef.current === 'function' && isReady) {
        appendRef.current({ 
          role: 'user', 
          content,
          data: { businessId, userId } 
        });
        setInputState('');
    } else {
        // Fallback for extreme cases (e.g. lost internet connection)
        console.warn("Aura Link Handshake Pending...");
        toast.info("Aura is aligning neural pathways... please try sending once more.");
    }
  }, [inputState, businessId, userId, isReady]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback((prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Animation buffer for the side panel
    setTimeout(() => {
      if (typeof appendRef.current === 'function' && isReady) {
        appendRef.current({ role: 'user', content: prompt, data: { businessId, userId } });
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
  }), [chat.messages, chat.isLoading, chat.data, inputState, isOpen, isReady, businessId, userId, tenantData, modules, handleSubmit, startAIAssistance, chat.setMessages]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 border-l shadow-2xl overflow-hidden">
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Fetching Master Identity Data
  const { data: userProfile } = useUserProfile();
  const { data: tenantData } = useTenant();
  const { data: modules } = useTenantModules();

  const activeBusinessId = useMemo(() => {
    // Priority: Database Profile -> Current Tenant State
    return userProfile?.business_id || tenantData?.id || '';
  }, [userProfile, tenantData]);

  const activeUserId = useMemo(() => {
    return userProfile?.id || '';
  }, [userProfile]);

  // confirm the UI is fully hydrated and IDs are present
  const isReady = mounted && !!activeBusinessId && !!activeUserId;

  return (
    <CopilotWorker 
      // CRITICAL: We removed the 'key' prop here to stop the "slowness"
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