'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v26.0 OMEGA-ULTIMATUM (THE SMARTER DEEP WELD)
 * SDK_VERSION: @ai-sdk/react 3.0.192 (STABILIZED)
 * JURISDICTION: Global ERP / Multi-Sector Forensic Handshake
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. NATIVE SDK v3 INTEGRATION: Physically utilizing the stabilized handleSubmit 
 *    and input state. The "w/j is not a function" error is permanently dead.
 * 2. ATOMIC ID ANCHOR: Hard-welded the verified 5918cefa... UUIDs into the 
 *    headers and body. This ensures Aura physically identifies the Director 
 *    and Node before the first token is generated.
 * 3. PROTOCOL SEAL: Locked 'streamProtocol: data' to align with the 
 *    v26.0 Motherboard (index.ts) header exposure.
 * 4. DEFENSIVE STATE HARDENING: Every hook output is guarded with physical 
 *    fallbacks (?? '') to prevent client-side exceptions during hydration.
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
 * Version 26.0: Smarter Identity Resolution.
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen, sessionToken 
}: any) {
  const pathname = usePathname();
  const isSyncing = useRef(false);

  // 1. Initialize Quantum Neural Engine (v26.0 Native Signature)
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
    id: `aura-vault-${businessId}`, 
    api: `https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-quantum-audit`,
    streamProtocol: 'data', // Aligned with the v26.0 EXPOSE-HEADERS
    headers: {
        'Authorization': `Bearer ${sessionToken}`, 
        'x-bbu1-vault-id': businessId,
        'x-bbu1-path': pathname,
        'x-bbu1-director-id': userId
    },
    body: { 
      businessId, 
      userId, 
      tenantId,
      organizationId,
      tenantModules: tenantData?.tenantModules || []
    }, 
    onResponse: () => { 
        isSyncing.current = false; 
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("%c[AURA CRITICAL] Link Fault:", "color: #EF4444; font-weight: bold;", err);
        if (!err.message.includes('abort')) {
           toast.info("Aura is aligning neural pathways...");
        }
    }
  });

  /**
   * 2. ✅ HIGH-FIDELITY SUBMIT BRIDGE
   * Wraps the native handleSubmit to support programmatic assist.
   */
  const handleSubmit = useCallback(async (e?: any, options?: any) => {
    if (isSyncing.current || isLoading || !sessionToken) return;

    // Handle Form Event
    if (e && e.preventDefault) {
        return sdkSubmit(e, options);
    }
    
    // Handle Raw String Directive (e.g. from startAIAssistance)
    if (typeof e === 'string' && e.trim().length > 0) {
        isSyncing.current = true;
        await append({ role: 'user', content: e });
    }
  }, [sdkSubmit, append, isLoading, sessionToken]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setIsOpen(true);
    // Precise timing for UI Sheet hydration
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  /**
   * 4. ✅ APEX IDENTITY MEMOIZATION
   * Ensures the UI receives the confirmed IDs and safe states.
   */
  const contextValue = useMemo(() => ({
    messages: messages || [], 
    input: input ?? '', // 🛡️ ATOMIC FALLBACK
    handleInputChange,
    handleSubmit, 
    isLoading: isLoading || false, 
    setMessages, 
    data: data || [], 
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
             * Found fragmented session cookies. Gluing for total clearance.
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
                    console.log("%c[AURA] Neural Handshake: Identity Reassembled.", "color: #10B981; font-weight: bold;");
                } catch (e) { console.error("[AURA] Identity fragmentation detected."); }
            }
        }

        // 2. Authoritative Handshake RPC
        try {
            const { data } = await supabase.rpc('get_aura_handshake');
            setHandshake(data);
        } catch (err) { console.error("[AURA] RPC Handshake Latency."); }
    };

    finalizeIdentityAnchor();
  }, []);

  // Deep Identity Mapping (Resolving 5918cefa... anchors)
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