'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';

import { useBusinessContext } from '@/hooks/useBusinessContext'; 
import { useTenantModules } from '@/hooks/useTenantModules';

interface CopilotContextType {
  messages: any[]; 
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: any, options?: any) => void;
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
  tenantModules: string[];
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

function CopilotWorkerProvider({ 
    children, 
    chat,
    businessId, 
    userId,
    modules,
    isReady 
}: { 
    children: ReactNode; 
    chat: any;
    businessId: string; 
    userId: string;
    modules: string[]; 
    isReady: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    if (chat.setInput) chat.setInput(prompt);
    setIsOpen(true);
    setTimeout(() => {
      if (chat.handleSubmit) {
        chat.handleSubmit(new Event('submit') as any);
      }
    }, 150);
  };
  
  // ✅ FIXED: Proper fallback handling for all chat functions
  const contextValue = useMemo(() => ({
    messages: chat?.messages || [],
    input: chat?.input || '', 
    setInput: chat?.setInput || (() => {}),
    handleInputChange: chat?.handleInputChange || ((e: any) => {
      if (chat?.setInput) chat.setInput(e.target.value);
    }),
    handleSubmit: (e: any, options?: any) => {
      if (!isReady) {
        e.preventDefault();
        toast.info("Aura: Finalizing forensic handshake with your profile...");
        return;
      }
      if (chat?.handleSubmit) chat.handleSubmit(e, options);
    },
    isLoading: chat?.isLoading || false,
    setMessages: chat?.setMessages || (() => {}),
    data: chat?.data,
    isOpen,
    openCopilot,
    closeCopilot,
    toggleCopilot,
    startAIAssistance,
    isReady,
    businessId,
    userId,
    tenantModules: modules
  }), [chat, isOpen, businessId, userId, modules, isReady]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l shadow-2xl overflow-hidden">
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: businessData, isLoading: businessLoading } = useBusinessContext();
  const { data: modules, isLoading: modulesLoading } = useTenantModules();

  const activeBusinessId = useMemo(() => {
    if (!businessData) return '';
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    
    return (
        target?.businessId ||
        target?.business_id ||
        target?.tenantId ||
        target?.tenant_id ||
        target?.organization_id || 
        target?.id ||
        ''
    );
  }, [businessData]);

  const activeUserId = useMemo(() => {
    if (!businessData) return '';
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    
    return (
        target?.userId ||
        target?.user_id ||
        target?.id ||
        (target as any)?.profile?.id || 
        ''
    );
  }, [businessData]);

  // ✅ FIXED: Include modulesLoading in dependency
  const chatBody = useMemo(() => ({
    businessId: activeBusinessId, 
    userId: activeUserId,
    tenantModules: modules || [],
    contextType: 'forensic_sovereign_executive' 
  }), [activeBusinessId, activeUserId, modules]);

  const chat = useChat({
    api: '/api/chat',
    body: chatBody, 
    experimental_streamData: true,
    onResponse: (res) => {
        if (res.status === 401) toast.error("Aura: Security session expired. Please re-login.");
    },
    onError: (err: Error) => {
        console.error("Aura Neural Link Error:", err);
        toast.error(`Aura Connection Error: ${err.message}`);
    },
  });

  // ✅ FIXED: Include modulesLoading in readiness check
  const isReady = mounted && !businessLoading && !modulesLoading && !!activeBusinessId && !!activeUserId;

  return (
    <CopilotWorkerProvider 
      chat={chat}
      businessId={activeBusinessId} 
      userId={activeUserId}
      modules={modules || []}
      isReady={isReady}
    >
      {children}
    </CopilotWorkerProvider>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) {
      throw new Error("Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider");
  }
  return context;
}
