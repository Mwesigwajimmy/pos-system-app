'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v27.0 OMEGA-ULTIMATUM (THE DYNAMIC IDENTITY WELD)
 * SDK_VERSION: @ai-sdk/react 3.0.192 (STABILIZED)
 * JURISDICTION: Global ERP / Multi-Tenant / Multi-Country
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. DYNAMIC IDENTITY RESOLUTION: Physically maps 'profile_linked_biz_id' and 
 *    'auth_user_id' from your multi-tenant schema to the Aura Handshake.
 * 2. TYPING ACTIVATION FIX: Resolved the bridge between 'isLoading' and 
 *    'isChatLoading' to ensure the UI never enters a ReferenceError loop.
 * 3. READINESS SEAL: Loosened the gate to allow typing once the Identity Anchor 
 *    is found, even if the background sync is still finalizing.
 * 4. PROTOCOL SEAL: Locked 'streamProtocol: data' for SDK v3 Motherboard alignment.
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
 * Version 27.0: Dynamic Multi-Tenant Neural Bridge.
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen, sessionToken 
}: any) {
  const pathname = usePathname();
  const isSyncing = useRef(false);

  // 1. Initialize Quantum Neural Engine (v27.0 Native Signature)
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
    streamProtocol: 'data', 
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
      // Pass the modules dynamically from the tenantData
      tenantModules: tenantData?.tenantModules || []
    }, 
    onResponse: () => { 
        isSyncing.current = false; 
    },
    onError: (err) => {
        isSyncing.current = false;
        console.error("%c[AURA CRITICAL] Neural Link Fault:", "color: #EF4444; font-weight: bold;", err);
        if (!err.message.includes('abort')) {
           toast.error("Neural pathway desynced. Re-establishing link...");
        }
    }
  });

  /**
   * 2. ✅ HIGH-FIDELITY SUBMIT BRIDGE
   * Wraps the native handleSubmit to support both forms and code directives.
   */
  const handleSubmit = useCallback(async (e?: any, options?: any) => {
    // Prevent double-submission and ensure token is seated
    if (isSyncing.current || isLoading || !sessionToken) return;

    // Handle Standard HTML Form Event
    if (e && e.preventDefault) {
        return sdkSubmit(e, options);
    }
    
    // Handle Raw String Directive (Programmatic prompt)
    if (typeof e === 'string' && e.trim().length > 0) {
        isSyncing.current = true;
        await append({ role: 'user', content: e });
    }
  }, [sdkSubmit, append, isLoading, sessionToken]);

  // 3. Remote Activation Logic (For AI-driven UI transitions)
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setIsOpen(true);
    // Timing for UI Sheet transition
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  /**
   * 4. ✅ APEX IDENTITY MEMOIZATION
   * Ensures the UI receives the confirmed IDs and safe states.
   * This is what the CopilotPanel consumes to activate the typing field.
   */
  const contextValue = useMemo(() => ({
    messages: messages || [], 
    input: input ?? '', 
    handleInputChange,
    handleSubmit, 
    isLoading: isLoading || false, // Consumed by UI as 'isChatLoading'
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
  }), [
    messages, isLoading, data, input, isOpen, businessId, userId, 
    tenantId, organizationId, tenantData, handleSubmit, handleInputChange, 
    startAIAssistance, setIsOpen
  ]);

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
 * Resolves the identity for Multi-Tenant/Multi-Country/Multi-Location nodes.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [handshake, setHandshake] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Access the Business Context (Profile contains our tenant info)
  const { profile, isLoading: contextLoading } = useBusiness();
  const { lastSyncTime } = useSync();

  useEffect(() => { 
    setMounted(true); 
    
    const finalizeIdentityAnchor = async () => {
        // 1. Physical Session Retrieval
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
            setToken(session.access_token);
        } else {
            /**
             * 🛡️ FORENSIC COOKIE REASSEMBLY (OMEGA WELD)
             * In some browser environments, the Supabase token is fragmented across chunks.
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

        // 2. Authoritative Handshake RPC (Fast check)
        try {
            const { data } = await supabase.rpc('get_aura_handshake');
            setHandshake(data);
        } catch (err) { console.error("[AURA] RPC Latency in Handshake."); }
    };

    finalizeIdentityAnchor();
  }, []);

  /**
   * 🛡️ MULTI-TENANT IDENTITY MAPPING
   * We map the IDs from your specific database columns.
   * If 'profile_linked_biz_id' exists, it is our anchor.
   */
  const activeBusinessId = useMemo(() => 
    profile?.profile_linked_biz_id || profile?.business_id || handshake?.businessId || '', 
    [handshake, profile]
  );

  const activeUserId = useMemo(() => 
    profile?.auth_user_id || profile?.id || handshake?.userId || '', 
    [handshake, profile]
  );

  // Tenant/Org logic for Multi-Location
  const activeTenantId = useMemo(() => profile?.tenant_id || activeBusinessId, [profile, activeBusinessId]);
  const activeOrgId = useMemo(() => profile?.organization_id || activeBusinessId, [profile, activeBusinessId]);

  /**
   * ✅ FORENSIC READINESS SEAL: 
   * Determines if the Typing interface should activate.
   * We check both 'is_profile_ready' and 'setup_complete' based on your schema.
   */
  const isHandshakeValid = mounted && 
                           !contextLoading && 
                           activeUserId !== '' && 
                           activeBusinessId !== '' &&
                           !!token && 
                           (profile?.setup_complete === true || profile?.is_profile_ready === true);

  // If the handshake is not yet valid, we provide a "Loading/Syncing" state
  // This prevents the CopilotPanel from crashing while waiting for data.
  if (!isHandshakeValid) {
    return (
      <CopilotContext.Provider value={{ 
          isReady: false, 
          isLoading: true, // This will be consumed as 'isChatLoading'
          messages: [], 
          input: '', 
          businessId: activeBusinessId || '', 
          userId: activeUserId || '', 
          tenantId: activeTenantId || '', 
          organizationId: activeOrgId || '', 
          tenantData: profile || null, 
          tenantModules: [],
          isOpen: false, 
          openCopilot: () => setIsOpen(true), 
          closeCopilot: () => setIsOpen(false), 
          toggleCopilot: () => setIsOpen((prev: boolean) => !prev),
          startAIAssistance: () => {}, 
          handleInputChange: () => {}, 
          handleSubmit: () => {}, 
          setMessages: () => {}, 
          data: undefined 
      }}>
        {children}
      </CopilotContext.Provider>
    );
  }

  // Identity is physically anchored. Initializing full Neural Sanctuary.
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

/**
 * Hook to consume the Copilot context.
 */
export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) {
    throw new Error("useCopilot must be used within a GlobalCopilotProvider");
  }
  return context;
}