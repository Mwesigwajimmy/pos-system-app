'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CopilotPanel from '@/components/copilot/CopilotPanel';

// --- Grassroots Hooks: Business and Capability Discovery ---
import { useBusinessContext } from '@/hooks/useBusinessContext'; 
import { useTenantModules } from '@/hooks/useTenantModules';

/**
 * --- Type Definitions (Enterprise Grade) ---
 */
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
  userId: string;       // Added: Individual security context
  tenantModules: string[]; // Added: Module capability context
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

/**
 * AI Neural Worker
 * This component manages the Sidebar UI and local state.
 * It consumes the AI state initialized by the Gatekeeper.
 */
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
  
  /**
   * Autonomous Trigger
   * Allows dashboard buttons to programmatically start AI tasks
   */
  const startAIAssistance = (prompt: string) => {
    if (!prompt) return;
    chat.setInput(prompt);
    setIsOpen(true);
    // Execute with a slight delay to ensure the UI has opened and state is stable
    setTimeout(() => chat.handleSubmit(new Event('submit') as any), 150);
  };
  
  const contextValue = useMemo(() => ({
    ...chat,
    // THE ROOT FIX: Ensure input is never undefined to prevent .trim() crashes in the UI
    input: chat.input || '', 
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

  /**
   * SOVEREIGN SUBMIT WRAPPER
   * Prevents actual transmission until the handshake is verified,
   * but typing remains 100% active.
   */
  const safeHandleSubmit = (e: any, options?: any) => {
    if (!isReady) {
      e.preventDefault();
      toast.info("Aura: Finalizing forensic handshake with your profile...");
      return;
    }
    chat.handleSubmit(e, options);
  };

  return (
    <CopilotContext.Provider value={{ ...contextValue, handleSubmit: safeHandleSubmit }}>
      {children}
      {/* Executive Sidebar - Hosts the CopilotPanel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[440px] sm:w-[540px] p-0 flex flex-col border-l shadow-2xl overflow-hidden">
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

/**
 * --- Global Gatekeeper Provider ---
 * Upgraded with Forensic ID Resolution.
 * It resolves the Supabase Auth/Profile data before waking up the AI.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  // Hydration guard to prevent Next.js client-side exceptions
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // 1. Fetch Business Identity and Modules (Handshake Data)
  const { data: businessData, isLoading: businessLoading } = useBusinessContext();
  const { data: modules, isLoading: modulesLoading } = useTenantModules();

  /**
   * --- ARRAY-SAFE FORENSIC ID RESOLUTION ---
   */
  const activeBusinessId = useMemo(() => {
    if (!businessData) return '';
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    return target?.business_id || target?.tenant_id || target?.organization_id || target?.id || '';
  }, [businessData]);

  const activeUserId = useMemo(() => {
    if (!businessData) return '';
    const target = Array.isArray(businessData) ? businessData[0] : businessData;
    return target?.id || (target as any)?.profile?.id || (target as any)?.user_id || '';
  }, [businessData]);

  /**
   * 2. SHARED AI ENGINE (THE CURE)
   * Initializing useChat here ensures the 'handleInputChange' is ALIVE 
   * the moment the component mounts. This unlocks your keyboard instantly.
   */
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
        if (res.status === 401) toast.error("Aura: Security session expired. Please re-login.");
    },
    onError: (err: Error) => {
        console.error("Aura Neural Link Error:", err);
        toast.error(`Aura Connection Error: ${err.message}`);
    },
  });

  // Verify if the system is fully linked and ready to transmit
  const isReady = mounted && !businessLoading && !!activeBusinessId && !!activeUserId;

  /**
   * THE GATEKEEPER:
   * We now render the Worker immediately so the user can type while 
   * the background data finishes loading.
   */
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

/**
 * --- useCopilot Custom Hook ---
 */
export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) {
      throw new Error("Sovereignty Error: useCopilot must be used within a GlobalCopilotProvider");
  }
  return context;
}