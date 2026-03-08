'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';

import { useBusinessContext } from '@/hooks/useBusinessContext'; 
import { useTenantModules } from '@/hooks/useTenantModules';
// ✅ PILLAR 3: Identity & Boundary Verification Hook
import { useTenant } from '@/hooks/useTenant'; 

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
  tenantData: any; 
  tenantModules: string[];
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

function CopilotWorkerProvider({ 
    children, 
    chat,
    businessId, 
    userId,
    tenantData,
    modules,
    isReady 
}: { 
    children: ReactNode; 
    chat: any;
    businessId: string; 
    userId: string;
    tenantData: any;
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
  
  // ✅ FIX: Dependency array updated with chat?.input and chat?.messages.
  // This allows real-time typing across the dashboard and activates the Send button.
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
        toast.info("Aura: Finalizing forensic handshake with your organization...");
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
    tenantData,
    tenantModules: modules
  }), [chat, chat?.input, chat?.messages, chat?.isLoading, isOpen, businessId, userId, tenantData, modules, isReady]);

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

  // ✅ FETCHING THE TRIPLE PILLAR DATA
  const { data: businessData, isLoading: businessLoading } = useBusinessContext();
  const { data: modules, isLoading: modulesLoading } = useTenantModules();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();

  // ✅ ROBUST ID RESOLUTION: 
  // If the handshake RPC returns AUTH_VOID, we fall back to the Tenant Record ID.
  const activeBusinessId = useMemo(() => {
    if (tenantData?.id) return tenantData.id;
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    return target?.businessId || target?.business_id || target?.tenantId || '';
  }, [businessData, tenantData]);

  const activeUserId = useMemo(() => {
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    return target?.userId || target?.user_id || tenantData?.owner_id || '';
  }, [businessData, tenantData]);

  const chatBody = useMemo(() => ({
    businessId: activeBusinessId, 
    userId: activeUserId,
    tenantDetails: tenantData,
    tenantModules: modules || [],
    contextType: 'forensic_sovereign_executive' 
  }), [activeBusinessId, activeUserId, tenantData, modules]);

  const chat = useChat({
    api: '/api/chat',
    body: chatBody, 
    experimental_streamData: true,
    onResponse: (res) => {
        if (res.status === 401) toast.error("Aura: Security session expired.");
    },
    onError: (err: Error) => {
        console.error("Aura Neural Link Error:", err);
        toast.error(`Aura Connection Error: ${err.message}`);
    },
  });

  // ✅ FINALIZED HANDSHAKE READINESS: 
  // Logic unlocks only when all three database pillars are resolved.
  const isReady = mounted && 
                  !businessLoading && 
                  !modulesLoading && 
                  !tenantLoading && 
                  !!activeBusinessId && 
                  !!activeUserId;

  return (
    <CopilotWorkerProvider 
      chat={chat}
      businessId={activeBusinessId} 
      userId={activeUserId}
      tenantData={tenantData}
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