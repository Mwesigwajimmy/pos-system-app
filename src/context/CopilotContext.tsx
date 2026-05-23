'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v24.0 OMEGA-ULTIMATUM (THE NEURAL BYPASS WELD)
 * SDK_VERSION: @ai-sdk/react 2.0.81 (STABILIZED)
 * JURISDICTION: Global ERP / Multi-Sector Forensic Handshake
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. EVENT-LESS SUBMISSION: Refactored handleSubmit to accept raw content strings. 
 *    By avoiding the React 19 Event object, we physically bypass the 
 *    'w/j is not a function' error inside the minified AI SDK.
 * 2. PROTOCOL LOCK: Physically aligned useChat with 'streamProtocol: data' 
 *    to match the v24.0 Motherboard headers.
 * 3. HYDRATION GUARD: Hardened mount-gate logic to ensure zero-latency 
 *    handshake after browser hydration.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// CORE UI COMPONENT
import CopilotPanel from '@/components/copilot/CopilotPanel';

// ✅ THE MASTER IDENTITY HOOKS
import { useBusiness } from '@/context/BusinessContext'; 
import { createClient } from '@/lib/supabase/client';
import { useSync } from '@/components/core/SyncProvider';

const CopilotContext = createContext<any>(undefined);
const supabase = createClient();

/**
 * 🛡️ THE NEURAL SANCTUARY (The Quantum Engine Room)
 * Version 24.0: Event Isolation & Protocol Alignment.
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen, sessionToken 
}: any) {
  const [inputState, setInputState] = useState('');
  const pathname = usePathname();
  const isSyncing = useRef(false);

  // 1. Initialize Quantum Neural Engine (v24.0 Signature)
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: `aura-quantum-vault-${businessId}`, 
    api: `https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-quantum-audit`,
    // ✅ THE APEX SEAL: Must match the v24.0 Motherboard headers
    streamProtocol: 'data', 
    headers: {
        'Authorization': `Bearer ${sessionToken}`, 
        'x-bbu1-vault-id': businessId,
        'x-bbu1-path': pathname
    },
    body: { 
      businessId, 
      userId, 
      tenantId,
      organizationId,
      tenantModules: tenantData?.tenantModules || []
    }, 
    onResponse: (response) => { 
        isSyncing.current = false; 
        if (response.status === 401) {
            toast.error("Identity Expired: Re-authenticating node...");
            window.location.reload();
        }
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("%c[AURA] Protocol Desync:", "color: #EF4444; font-weight: bold;", err);
    }
  });

  /**
   * 2. ✅ THE NEURAL BRIDGE (Bypassing 'w is not a function')
   * We do not take an 'e' parameter. We take 'rawContent'.
   * This is the ONLY way to make SDK 2.0.81 work with React 19.
   */
  const handleSubmit = useCallback(async (rawContent?: string) => {
    if (isSyncing.current || isLoading || !sessionToken) return;

    const content = (rawContent || inputState).trim();
    if (!content) return;

    try {
        isSyncing.current = true;
        // Physically call append with content only
        await append({ role: 'user', content });
        setInputState('');
    } catch (err: any) {
        isSyncing.current = false;
        console.error("[AURA] Submission Logic Fault:", err);
    }
  }, [inputState, append, isLoading, sessionToken]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setInputState(prompt);
    setIsOpen(true);
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  // 4. Identity-Aware Memoization
  const contextValue = useMemo(() => ({
    messages: messages || [], 
    input: inputState, 
    setInput: setInputState,
    handleInputChange: (e: any) => setInputState(e?.target?.value ?? ''),
    handleSubmit, // This now expects a string or nothing, NOT an event.
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
    tenantId, 
    organizationId,
    tenantData, 
    tenantModules: tenantData?.tenantModules || []
  }), [messages, isLoading, data, setMessages, inputState, isOpen, businessId, userId, tenantId, organizationId, tenantData, handleSubmit, startAIAssistance, setIsOpen]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-[440px] sm:w-[600px] p-0 border-l shadow-2xl overflow-hidden bg-background/95 backdrop-blur-md border-emerald-500/10"
        >
           <CopilotPanel />
        </SheetContent>
      </Sheet>
    </CopilotContext.Provider>
  );
}

/**
 * GLOBAL COPILOT PROVIDER
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [handshake, setHandshake] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  const { profile, isLoading: contextLoading } = useBusiness();
  const { lastSyncTime } = useSync();

  useEffect(() => { 
    setMounted(true); 
    
    const finalizeIdentityAnchor = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
            setToken(session.access_token);
        } else {
            const storageKey = `sb-oezlqscjymzoeizysljp-auth-token`;
            const cookies = document.cookie.split('; ');
            const chunks = cookies
                .filter(c => c.trim().startsWith(storageKey))
                .sort()
                .map(c => c.split('=')[1]);

            if (chunks.length > 0) {
                try {
                    const combined = chunks.join('').replace('base64-', '');
                    const decoded = JSON.parse(atob(decodeURIComponent(combined)));
                    setToken(decoded.access_token);
                    console.log("%c[AURA] Neural Handshake: Identity Reassembled.", "color: #10B981; font-weight: bold;");
                } catch (e) { console.error("[AURA] Identity fragmentation detected."); }
            }
        }

        try {
            const { data } = await supabase.rpc('get_aura_handshake');
            setHandshake(data);
        } catch (err) { console.error("[AURA] Handshake Latency."); }
    };

    finalizeIdentityAnchor();
  }, []);

  const activeBusinessId = useMemo(() => handshake?.businessId || profile?.business_id || '', [handshake, profile]);
  const activeUserId = useMemo(() => handshake?.userId || profile?.id || '', [handshake, profile]);
  const activeTenantId = useMemo(() => profile?.tenant_id || activeBusinessId, [profile, activeBusinessId]);
  const activeOrgId = useMemo(() => profile?.organization_id || activeBusinessId, [profile, activeBusinessId]);

  const isHandshakeValid = mounted && !contextLoading && 
                           activeUserId !== '' && activeBusinessId !== '' &&
                           !!token && !!lastSyncTime && 
                           profile?.setup_complete === true;

  if (!isHandshakeValid) {
    return (
      <CopilotContext.Provider value={{ 
          isReady: false, isLoading: true, messages: [], input: '', 
          businessId: '', userId: '', tenantId: '', organizationId: '', tenantData: null, tenantModules: [],
          isOpen: false, openCopilot: () => {}, closeCopilot: () => {}, toggleCopilot: () => {},
          startAIAssistance: () => {}, setInput: () => {}, handleInputChange: () => {}, 
          handleSubmit: () => {}, setMessages: () => {}, data: undefined 
      }}>{children}</CopilotContext.Provider>
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
      sessionToken={token}
    >
      {children}
    </NeuralSanctuary>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) throw new Error("useCopilot must be used within GlobalCopilotProvider");
  return context;
}