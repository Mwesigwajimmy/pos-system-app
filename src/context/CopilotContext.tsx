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
  
  // ✅ PROPERTY RECOVERY STATE
  // Manages typing locally since the current SDK returns 'undefined' for chat.input
  const [inputState, setInputState] = useState('');

  const openCopilot = () => setIsOpen(true);
  const closeCopilot = () => setIsOpen(false);
  const toggleCopilot = () => setIsOpen(prev => !prev);
  
  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    setInputState(prompt);
    setIsOpen(true);
    setTimeout(() => {
      // Logic mapping based on SDK available methods
      const submitAction = chat?.sendMessage || chat?.append;
      if (submitAction) {
        try {
          // ✅ UPGRADE: Send message with IDs attached directly to the payload
          // This prevents the "Context incomplete" error from the backend.
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
              businessId: businessId,
              userId: userId
            });
          }
          setInputState('');
        } catch (err) {
          console.error('COPILOT DEBUG - startAIAssistance submit error:', err);
        }
      }
    }, 150);
  };

  // 🧪 DEEP SYSTEM AUDIT (Console Logging)
  useEffect(() => {
    try {
      console.log('--- AURA NEURAL LINK STATUS ---');
      console.log('SDK KEYS AVAILABLE:', Object.keys(chat || {}));
      console.log('CURRENT INPUT BUFFER:', inputState);
      console.log('ACTIVE CONVERSATION DEPTH:', (chat?.messages || []).length);
      console.log('SDK STATUS:', chat?.status || 'idle');
      console.log('ATTACHED CONTEXT:', { businessId, userId });
    } catch (err) {
      console.error('COPILOT DEBUG (Provider) - log error:', err);
    }
  }, [chat, inputState, chat?.messages, chat?.status, businessId, userId]);

  // ✅ ROOT FIX: UNIVERSAL SUBMISSION PROTOCOL
  // This memo standardizes the interaction between the UI and the SDK Engine.
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
        
        // Validation check
        if (!inputState.trim()) return;

        // ✅ CRITICAL UPGRADE: THE FORENSIC HANDSHAKE
        // We include the IDs in the function call to ensure the API receives them 
        // even if the hook initialization was delayed.
        try { 
          if (typeof chat?.sendMessage === 'function') {
            console.log('AURA: Dispatching Structured message with verified Context...');
            chat.sendMessage({ 
              content: inputState,
              businessId,
              userId 
            });
          } else if (typeof chat?.append === 'function') {
            chat.append({ 
              role: 'user', 
              content: inputState,
              businessId,
              userId
            });
          } else if (typeof chat?.handleSubmit === 'function') {
            chat.handleSubmit(e);
          } else {
            console.error('AURA ERROR: No valid submission method found in SDK.');
            toast.error("Handshake Mismatch: Submission logic missing.");
          }
          
          setInputState(''); // Clear buffer on success
        } catch (err: any) { 
          console.error('AURA CRITICAL FAILURE - Submission Error:', err); 
          toast.error(`Forensic Link Error: ${err.message}`);
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
  }, [
    chat, 
    inputState, 
    isOpen, 
    businessId, 
    userId, 
    tenantData, 
    modules, 
    isReady
  ]);

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

  // TRIPLE PILLAR DATA SYNC
  const { data: businessData, isLoading: businessLoading } = useBusinessContext();
  const { data: modules, isLoading: modulesLoading } = useTenantModules();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();

  // IDENTIFIER RESOLUTION
  const activeBusinessId = useMemo(() => {
    if (tenantData?.id) return tenantData.id;
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    return target?.businessId || target?.business_id || target?.tenantId || '';
  }, [businessData, tenantData]);

  const activeUserId = useMemo(() => {
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    return target?.userId || target?.user_id || tenantData?.owner_id || '';
  }, [businessData, tenantData]);

  // THE EXECUTIVE AI ENGINE
  // ✅ UPGRADE: The body is now dynamically reactive to the resolved IDs
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
        if (res.status === 401) toast.error("Aura: Session integrity failed.");
    },
    onError: (err: Error) => {
        console.error("Aura Neural Link Fault:", err);
    },
  });

  // Global Exception Handling
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      console.error('COPILOT SYSTEM EXCEPTION:', e.message);
    };
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, []);

  // ✅ FINALIZED READINESS
  // Handshake resolves as soon as the Business ID is found, ending the "Awaiting" lock.
  const isReady = mounted && !!activeBusinessId;

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