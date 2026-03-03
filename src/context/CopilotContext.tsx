'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';

// Import your actual hooks
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
  tenantModules: string[]; // Added to track tenant capabilities
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

/**
 * AI Neural Worker
 * Now receives both Business and Tenant Module context
 */
function CopilotWorkerProvider({ 
    children, 
    businessId, 
    modules 
}: { 
    children: ReactNode; 
    businessId: string; 
    modules: string[]; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const chat = useChat({
    api: '/api/chat',
    // We pass BOTH businessId and the list of tenant modules to the AI
    body: { 
        businessId, 
        tenantModules: modules,
        contextType: 'forensic_multi_tenant' 
    }, 
    experimental_streamData: true,
    onError: (err: Error) => toast.error(`Aura Connection Error: ${err.message}`),
  });
  
  const contextValue = useMemo(() => ({
    ...chat,
    input: chat.input || '',
    isOpen,
    openCopilot: () => setIsOpen(true),
    closeCopilot: () => setIsOpen(false),
    toggleCopilot: () => setIsOpen(prev => !prev),
    startAIAssistance: (prompt: string) => {
        if (!prompt) return;
        chat.setInput(prompt);
        setIsOpen(true);
        setTimeout(() => chat.handleSubmit(new Event('submit') as any), 100);
    },
    isReady: true,
    businessId,
    tenantModules: modules
  }), [chat, isOpen, businessId, modules]);

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

/**
 * Global Provider
 * Resolves Business and Tenant data before activating Aura
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const { data: businessData, isLoading: businessLoading } = useBusinessContext();
  const { data: modules, isLoading: modulesLoading } = useTenantModules();

  // VALIDATION: We wait for the Business ID to exist.
  // businessData.id is the correct property based on your hook file.
  if (!businessLoading && businessData?.id) {
    return (
      <CopilotWorkerProvider 
        businessId={businessData.id} 
        modules={modules || []}
      >
        {children}
      </CopilotWorkerProvider>
    );
  }

  // Fallback state while loading or if data is missing
  const notReadyValue: CopilotContextType = {
      messages: [], 
      input: '', 
      setInput: () => {}, 
      handleInputChange: () => {},
      handleSubmit: (e: any) => {
          e.preventDefault();
          toast.warning("Aura is synchronizing with your business profile...");
      }, 
      isLoading: false, 
      setMessages: () => {}, 
      data: undefined,
      isOpen: false, 
      openCopilot: () => {}, 
      closeCopilot: () => {}, 
      toggleCopilot: () => {},
      startAIAssistance: () => {}, 
      isReady: false,
      businessId: '',
      tenantModules: []
  };

  return (
    <CopilotContext.Provider value={notReadyValue}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) throw new Error("useCopilot must be used within a GlobalCopilotProvider");
  return context;
}