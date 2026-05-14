'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v11.1 Sovereign Edition (ATOMIC STABILIZATION)
 * 
 * BUILD FIX: Eliminates "append is not a function" by using stable functional refs.
 * PERFORMANCE: Zero-latency identity injection for production builds.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useRef, useCallback } from 'react';
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
  const chat = useChat({
    api: '/api/chat',
    body: { businessId, userId, tenantModules: modules || [] }, 
    experimental_streamData: true,
  });

  // 2. Physical Function Weld (Prevents "h.append" errors in production)
  const appendRef = useRef(chat.append);
  useEffect(() => {
    appendRef.current = chat.append;
  }, [chat.append]);

  const handleSubmit = useCallback((e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    const content = inputState.trim();
    if (!content) return;

    if (typeof appendRef.current === 'function') {
        appendRef.current({ 
          role: 'user', 
          content,
          data: { businessId, userId } 
        });
        setInputState('');
    } else {
        toast.error("Neural Link Syncing... Please try again in a moment.");
    }
  }, [inputState, businessId, userId]);

  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    setTimeout(() => {
      if (typeof appendRef.current === 'function') {
        appendRef.current({ role: 'user', content: prompt, data: { businessId, userId } });
        setInputState('');
      }
    }, 400);
  };

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
  }), [chat.messages, chat.isLoading, chat.data, inputState, isOpen, isReady, businessId, userId, tenantData, modules, handleSubmit]);

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

  const isReady = mounted && !!activeBusinessId && !!activeUserId;

  return (
    <CopilotWorker 
      key={activeBusinessId || 'loading'}
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