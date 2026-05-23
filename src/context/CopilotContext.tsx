'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v25.1 OMEGA-ULTIMATUM (THE NATIVE SDK WELD)
 * SDK_VERSION: @ai-sdk/react 3.0.192 (STABILIZED FOR REACT 19)
 * JURISDICTION: Global ERP / Multi-Sector Forensic Handshake
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. NATIVE REACT 19 COMPATIBILITY: Switched to the upgraded SDK's native 
 *    handleSubmit and input state. The "w/j is not a function" error is 
 *    physically eliminated at the library level.
 * 2. AUTOMATIC DATA STREAMING: The context now natively parses the '0:' (text) 
 *    and '8:' (agent metadata) chunks from the v25.0 Motherboard.
 * 3. ATOMIC IDENTITY ANCHOR: Hard-welded the session tokens and UUIDs 
 *    into the headers to ensure zero-latency multi-tenant isolation.
 * 4. HYDRATION SEAL: Mount-gate logic remains seated to ensure browser-only 
 *    identities are reassembled before the AI Engine wakes up.
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
 * Version 25.1: Native SDK Integration.
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen, sessionToken 
}: any) {
  const pathname = usePathname();
  const isSyncing = useRef(false);

  // 1. Initialize Quantum Neural Engine (v25.1 Native Signature)
  const { 
    messages, 
    isLoading, 
    append, 
    setMessages, 
    data, 
    input, 
    handleInputChange, 
    handleSubmit: sdkSubmit 
  } = useChat({
    id: `aura-quantum-vault-${businessId}`, 
    api: `https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-quantum-audit`,
    streamProtocol: 'data', // Aligned with the v25.0 index.ts EXPOSE-HEADERS
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
    onResponse: () => { isSyncing.current = false; },
    onError: (err) => {
        isSyncing.current = false;
        console.error("[AURA] Protocol Desync:", err);
        if (!err.message.includes('abort')) {
           toast.info("Aura is aligning neural pathways...");
        }
    }
  });

  /**
   * 2. ✅ HIGH-FIDELITY SUBMIT BRIDGE
   * We wrap the SDK's native handleSubmit to provide support for 
   * programmatic prompts (startAIAssistance).
   */
  const handleSubmit = useCallback(async (e?: any, options?: any) => {
    if (isSyncing.current || isLoading || !sessionToken) return;
    
    // If it's a standard form event, use the native SDK handler
    if (e && e.preventDefault) {
        return sdkSubmit(e, options);
    }
    
    // If it's a raw string (from startAIAssistance), use append
    if (typeof e === 'string') {
        isSyncing.current = true;
        await append({ role: 'user', content: e });
    }
  }, [sdkSubmit, append, isLoading, sessionToken]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setIsOpen(true);
    // Precise timing for UI Sheet hydration before programmatic submission
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  // 4. Identity-Aware Memoization (Apex Precision)
  const contextValue = useMemo(() => ({
    messages: messages || [], 
    input, 
    handleInputChange,
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
    tenantId, 
    organizationId,
    tenantData, 
    tenantModules: tenantData?.tenantModules || []
  }), [messages, isLoading, data, input, isOpen, businessId, userId, tenantId, organizationId, tenantData, handleSubmit, handleInputChange, startAIAssistance, setIsOpen]);

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
 * Resolves the identity and physically locks the Sanctuary until READY.
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
        // 1. Standard Identity Attempt
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
            setToken(session.access_token);
        } else {
            /**
             * 🛡️ FORENSIC CHUNK REASSEMBLY (OMEGA WELD)
             * Glues fragmentated session cookies back into a functional JWT.
             */
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
                } catch (e) { console.error("[AURA] Identity fragmentation."); }
            }
        }

        // 2. Authoritative Handshake RPC
        try {
            const { data } = await supabase.rpc('get_aura_handshake');
            setHandshake(data);
        } catch (err) { console.error("[AURA] Handshake Latency."); }
    };

    finalizeIdentityAnchor();
  }, []);

  // Deep Identity Mapping
  const activeBusinessId = useMemo(() => handshake?.businessId || profile?.business_id || '', [handshake, profile]);
  const activeUserId = useMemo(() => handshake?.userId || profile?.id || '', [handshake, profile]);
  const activeTenantId = useMemo(() => profile?.tenant_id || activeBusinessId, [profile, activeBusinessId]);
  const activeOrgId = useMemo(() => profile?.organization_id || activeBusinessId, [profile, activeBusinessId]);

  /**
   * ✅ FORENSIC READINESS SEAL: 
   * Gates AI initialization on setup_complete and physical DB sync status.
   */
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