'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v11.2 Sovereign Edition (STABLE KERNEL)
 * 
 * FIX LOG: 
 * 1. Persistent Mounting: Removed 'key' prop to prevent Chat Engine resets.
 * 2. Race Condition Logic: Native useChat dependency tracking.
 * 3. Lifecycle Stability: Ensures Aura initializes once and stays active.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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

  // 1. Initialize Engine 
  // We pass businessId and userId directly into the body. 
  // When these change, useChat updates the request body automatically without unmounting.
  const { messages, append, isLoading, setMessages, data } = useChat({
    api: '/api/chat',
    body: { businessId, userId, tenantModules: modules || [] }, 
    experimental_streamData: true,
  });

  // 2. Core Submission Logic
  const handleSubmit = useCallback((e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const content = inputState.trim();
    if (!content) return;

    // Check if the engine (append) and the identity (isReady) are synced
    if (isReady && typeof append === 'function') {
        append({ 
          role: 'user', 
          content,
          data: { businessId, userId } 
        });
        setInputState('');
    } else {
        // This only triggers if the user clicks before the IDs are loaded from the database
        toast.info("Aura is initializing neural links... Please wait a second.");
    }
  }, [inputState, businessId, userId, isReady, append]);

  // 3. Remote Start Logic (e.g., from clicking a button on a dashboard)
  const startAIAssistance = useCallback((prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    
    // Slight delay to ensure the Sheet animation has started
    setTimeout(() => {
      if (typeof append === 'function' && isReady) {
        append({ role: 'user', content: prompt, data: { businessId, userId } });
        setInputState('');
      }
    }, 500);
  }, [append, isReady, businessId, userId]);

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
  }), [messages, isLoading, data, inputState, isOpen, isReady, businessId, userId, tenantData, modules, handleSubmit, startAIAssistance, setMessages]);

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

  // Fetching all required context and identity data
  const { data: bizContext } = useBusinessContext();
  const { data: userProfile } = useUserProfile();
  const { data: tenantData } = useTenant();
  const { data: modules } = useTenantModules();

  const activeBusinessId = useMemo(() => {
    if (bizContext?.businessId) return bizContext.businessId;
    if (userProfile?.business_id) return userProfile.business_id;
    return tenantData?.id || '';
  }, [bizContext, userProfile, tenantData]);

  const activeUserId = useMemo(() => {
    if (bizContext?.userId) return bizContext.userId;
    return userProfile?.id || '';
  }, [bizContext, userProfile]);

  // isReady confirms the UI is mounted and we have valid credentials
  const isReady = mounted && !!activeBusinessId && !!activeUserId;

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