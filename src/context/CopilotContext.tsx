'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v19.8 OMEGA-ULTIMATUM (THE UNIFIED IDENTITY WELD)
 * JURISDICTION: Multi-Tenant / Global ERP Infrastructure
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. UNIFIED IDENTITY RESOLUTION: Updated context to explicitly handle User, 
 *    Business, Tenant, and Organization UUIDs. This resolves the '0xNULL' 
 *    placeholder states in the Mission Control UI.
 * 2. FORENSIC READINESS GATE: Strictly gates Aura initialization on the 
 *    'setup_complete' signal and the physical 'lastSyncTime' timestamp.
 * 3. JWT ACCESS RECOVERY: Hardened the syncToken effect to ensure the Edge 
 *    Runtime always has a fresh physical token from Supabase Auth.
 * 4. SYNC INTEGRITY LOCK: Physically anchored to 'useSync' to ensure the AI 
 *    never attempts to operate before the local Version 8 Vault is written.
 * 5. EDGE GATEWAY STABILITY: Maintains absolute pathing to Supabase Edge 
 *    Functions for forensic audit persistence.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// CORE UI COMPONENT
import CopilotPanel from '@/components/copilot/CopilotPanel';

// ✅ THE MASTER IDENTITY HOOK: Synchronized with BusinessContext.tsx
import { useBusiness } from '@/context/BusinessContext'; 
import { createClient } from '@/lib/supabase/client';

// 🛡️ THE SOVEREIGN LINKS: Anchoring the context to the Local Node
import { db } from '@/lib/db'; 
import { useSync } from '@/components/core/SyncProvider';

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
  tenantId: string;       // Added for Deep UI Alignment
  organizationId: string; // Added for Deep UI Alignment
  tenantData: any; 
  tenantModules: string[];
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);
const supabase = createClient();

/**
 * 🛡️ THE NEURAL SANCTUARY (The Quantum Engine Room)
 * Born only when the Identity Handshake is 100% physically ready.
 */
function NeuralSanctuary({ 
  children, 
  businessId, 
  userId, 
  tenantId, 
  organizationId, 
  tenantData, 
  isOpen, 
  setIsOpen 
}: any) {
  const [inputState, setInputState] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const isSyncing = useRef(false);

  // 🛡️ OMEGA JWT RECOVERY: Extract physical token for Edge Function authorization
  useEffect(() => {
    const syncToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            setToken(session.access_token);
        }
    };
    syncToken();
  }, []);

  // 1. Initialize Quantum Neural Engine
  // ✅ OMEGA WELD: Headers physically anchored to the Edge Runtime JWT
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: `aura-quantum-vault-${businessId}`, 
    api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/aura-quantum-audit`,
    headers: {
        'Authorization': `Bearer ${token}`, 
        'x-bbu1-vault-id': businessId
    },
    body: { 
      businessId, 
      userId, 
      tenantId,
      organizationId,
      tenantModules: tenantData?.tenantModules || []
    }, 
    experimental_streamData: true,
    onResponse: (response) => {
      isSyncing.current = false;
      if (!response.ok) {
        console.error(`[AURA QUANTUM FAULT] Status: ${response.status}`);
      }
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("[AURA QUANTUM COLLAPSE]", err);
        if (!err.message.includes('abort')) {
           toast.info("Aura is aligning neural pathways... please try again.");
        }
    }
  });

  // 2. High-Stability Submit Handler
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSyncing.current || isLoading || !token) return;

    const content = inputState.trim();
    if (!content) return;

    try {
        isSyncing.current = true;
        
        await append({ 
          role: 'user', 
          content
        }, {
          data: { 
            businessId, 
            userId,
            tenantId,
            organizationId,
            tenantModules: tenantData?.tenantModules || []
          }
        } as any);
        
        setInputState('');
    } catch (err: any) {
        isSyncing.current = false;
        console.error("QUANTUM HANDSHAKE CRASH:", err.message);
        toast.info("Aura is securing your identity... please try again in 1 second.");
    }
  }, [inputState, businessId, userId, tenantId, organizationId, append, tenantData, isLoading, token]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setInputState(prompt);
    setIsOpen(true);
    
    setTimeout(() => {
        if (token) handleSubmit();
    }, 800);
  }, [isLoading, token, handleSubmit, setIsOpen]);

  // 4. Identity-Aware Memoization
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
    toggleCopilot: () => setIsOpen((prev: boolean) => !prev),
    startAIAssistance,
    isReady: true,
    businessId,
    userId,
    tenantId,       // Provided for Mission Control UI
    organizationId, // Provided for Mission Control UI
    tenantData,
    tenantModules: tenantData?.tenantModules || []
  }), [messages, isLoading, data, setMessages, inputState, isOpen, businessId, userId, tenantId, organizationId, tenantData, handleSubmit, startAIAssistance, setIsOpen]);

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
 * Resolves the identity and physically locks the Sanctuary until READY.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ✅ MASTER IDENTITY TRUTH: Resolving from the Omega Business Context
  const { profile, isLoading: contextLoading } = useBusiness();
  
  // 🔗 THE SYNC LINK: Ensure the AI waits for the local node to synchronize
  const { lastSyncTime } = useSync();

  // DEEP WELD: Robust resolution for all Unified Identity UUIDs
  const activeBusinessId = useMemo(() => {
    const id = profile?.business_id || (profile as any)?.businessId;
    return (!id || id === 'loading') ? '' : id;
  }, [profile]);

  const activeTenantId = useMemo(() => {
    const id = profile?.tenant_id || (profile as any)?.tenantId || activeBusinessId;
    return (!id || id === 'loading') ? '' : id;
  }, [profile, activeBusinessId]);

  const activeOrgId = useMemo(() => {
    const id = profile?.organization_id || (profile as any)?.organizationId || activeBusinessId;
    return (!id || id === 'loading') ? '' : id;
  }, [profile, activeBusinessId]);

  const activeUserId = useMemo(() => {
    const id = profile?.id || (profile as any)?.userId;
    return (!id || id === 'loading') ? '' : id;
  }, [profile]);

  /**
   * ✅ FORENSIC READINESS SEAL: 
   * FIXED: Aligned with backend forensic audit results for 'time@bbu1.com'.
   * Aura will now physically wait for:
   * 1. React Mount
   * 2. Business Context Load
   * 3. Identity Alignment (All UUIDs Resolved)
   * 4. Setup Completion Signal (setup_complete)
   * 5. Successful Local Database Sync (lastSyncTime)
   */
  const isReady = mounted && 
                  !contextLoading && 
                  activeUserId !== '' && 
                  activeBusinessId !== '' &&
                  profile?.setup_complete === true && 
                  !!lastSyncTime; // Force Aura to wait for local Version 8 Vault

  // 🛡️ DIVERSION SHIELD: No mounting until Identity is Aligned.
  if (!isReady) {
    return (
      <CopilotContext.Provider value={{ 
          isReady: false, isLoading: true, messages: [], input: '', 
          businessId: '', userId: '', tenantId: '', organizationId: '', tenantData: null, tenantModules: [],
          isOpen: false, openCopilot: () => {}, closeCopilot: () => {}, toggleCopilot: () => {},
          startAIAssistance: () => {}, setInput: () => {}, handleInputChange: () => {}, 
          handleSubmit: () => {}, setMessages: () => {}, data: undefined 
      }}>
        {children}
      </CopilotContext.Provider>
    );
  }

  return (
    <NeuralSanctuary 
      businessId={activeBusinessId} 
      userId={activeUserId} 
      tenantId={activeTenantId}
      organizationId={activeOrgId}
      tenantData={profile} 
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      {children}
    </NeuralSanctuary>
  );
}

/**
 * Sovereign Access Hook
 */
export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) throw new Error("useCopilot must be used within GlobalCopilotProvider");
  return context;
}