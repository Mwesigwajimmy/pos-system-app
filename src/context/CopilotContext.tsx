'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';

import { useBusinessContext } from '@/hooks/useBusinessContext'; 
import { useTenantModules } from '@/hooks/useTenantModules';
import { useTenant } from '@/hooks/useTenant'; 
// ✅ NEW PILLAR: Using the Identity Translator to break the loading loop
import { useUserProfile } from '@/hooks/useUserProfile';

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
  const [inputState, setInputState] = useState('');

  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    setTimeout(() => {
      const submitAction = chat?.sendMessage || chat?.append;
      if (submitAction) {
        try {
          if (chat?.sendMessage) {
            chat.sendMessage({ 
              content: prompt,
              businessId: businessId,
              userId: userId
            });
          } else if (chat?.append) {
            chat.append({ 
              role: 'user', 
              content: prompt,
              data: { businessId, userId }
            });
          }
          setInputState('');
        } catch (err) {
          console.error('Aura Handshake Error:', err);
        }
      }
    }, 150);
  };

  useEffect(() => {
    if (isReady) {
      console.log('--- AURA NEURAL LINK ESTABLISHED ---');
      console.log('Vault ID:', businessId);
      console.log('Operator ID:', userId);
    }
  }, [isReady, businessId, userId]);

  const contextValue = useMemo(() => {
    const isActuallyLoading = chat?.isLoading || chat?.status === 'in_progress' || chat?.status === 'streaming';

    return {
      messages: chat?.messages || [],
      input: inputState, 
      setInput: setInputState,
      handleInputChange: (e: any) => {
        const val = e?.target?.value ?? '';
        setInputState(val); 
      },
      handleSubmit: (e: any) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!inputState.trim()) return;

        try { 
          if (typeof chat?.append === 'function') {
            chat.append({ 
              role: 'user', 
              content: inputState,
              data: { businessId, userId } 
            });
          } else if (typeof chat?.handleSubmit === 'function') {
            chat.handleSubmit(e);
          }
          
          setInputState('');
        } catch (err: any) { 
          toast.error(`Neural Link Fault: ${err.message}`);
        }
      },
      isLoading: isActuallyLoading,
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
    };
  }, [chat, inputState, isOpen, businessId, userId, tenantData, modules, isReady]);

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

  // TRIPLE PILLAR DATA SYNC + IDENTITY TRANSLATOR
  const { data: businessData, isLoading: bLoading } = useBusinessContext();
  const { data: modules, isLoading: mLoading } = useTenantModules();
  const { data: tenantData, isLoading: tLoading } = useTenant();
  const { data: userProfile, isLoading: pLoading } = useUserProfile();

  // IDENTIFIER RESOLUTION (ROOT FIX)
  // We prioritize the userProfile which is the most stable "Translator" you built.
  const activeBusinessId = useMemo(() => {
    if (userProfile?.business_id) return userProfile.business_id;
    if (tenantData?.id) return tenantData.id;
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    return target?.businessId || target?.business_id || '';
  }, [businessData, tenantData, userProfile]);

  const activeUserId = useMemo(() => {
    if (userProfile?.id) return userProfile.id;
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    return target?.userId || target?.user_id || '';
  }, [businessData, userProfile]);

  // THE EXECUTIVE AI ENGINE
  const chat = useChat({
    api: '/api/chat',
    body: {
        businessId: activeBusinessId, 
        userId: activeUserId,
        tenantModules: modules || [],
        contextType: 'forensic_sovereign_executive'
    }, 
    experimental_streamData: true,
    onResponse: (res) => {
        if (res.status === 401) toast.error("Aura: Security session invalid.");
    },
    onError: (err) => {
        console.error("Aura Engine Error:", err);
    },
  });

  /**
   * ✅ NEURAL READINESS PROTOCOL
   * We wait for the 'mounted' state and either the businessData or userProfile to be present.
   * This ensures the "Establishing Sovereignty" screen closes as soon as the ID is resolved.
   */
  const isReady = mounted && !!activeBusinessId && !pLoading;

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