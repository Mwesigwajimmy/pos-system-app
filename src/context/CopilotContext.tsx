'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v28.0 OMEGA-ULTIMATUM (THE IDENTITY UNBLINDING)
 * SDK_VERSION: @ai-sdk/react 3.0.192 (STABILIZED)
 * JURISDICTION: Global ERP / Multi-Tenant / Multi-Country
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. PHYSICAL IDENTITY ANCHOR: Now maps 'business_id' and 'id' 
 *    directly from the verified Sovereign Profile. This ensures the 
 *    Edge Motherboard identifies the 'APEX' node instantly.
 * 2. TYPING ACTIVATION: The 'isHandshakeValid' seal is now perfectly 
 *    synchronized with the database's actual 'is_active' status.
 * 3. REFERENCE ERROR PREVENTION: Hard-welds the 'isLoading' state from 
 *    the AI SDK into the context, providing the physical link for 
 *    the 'isChatLoading' variable in the UI.
 * 4. PROTOCOL SEAL: Locked 'streamProtocol: data' to align with the 
 *    v27.0 Motherboard (index.ts) header exposure.
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
 * Version 28.0: Fully Aligned Multi-Tenant Bridge.
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen, sessionToken 
}: any) {
  const pathname = usePathname();
  const isSyncing = useRef(false);

  // 1. Initialize Quantum Neural Engine (v28.0 Native Signature)
  const { 
    messages, 
    isLoading, // This is the engine's loading state
    append, 
    setMessages, 
    data, 
    input, 
    handleInputChange, 
    handleSubmit: sdkSubmit 
  } = useChat({
    id: `aura-vault-${businessId}`, 
    api: `https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-quantum-audit`,
    streamProtocol: 'data', // 🛡️ CRITICAL: Aligned with Motherboard headers
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
    if (isSyncing.current || isLoading || !sessionToken) return;

    // Handle Form Event
    if (e && e.preventDefault) {
        return sdkSubmit(e, options);
    }
    
    // Handle Raw String Directive
    if (typeof e === 'string' && e.trim().length > 0) {
        isSyncing.current = true;
        await append({ role: 'user', content: e });
    }
  }, [sdkSubmit, append, isLoading, sessionToken]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setIsOpen(true);
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  /**
   * 4. ✅ APEX IDENTITY MEMOIZATION
   * This object is consumed by useCopilot() in CopilotPanel.tsx.
   * Mapping 'isLoading' here prevents the ReferenceError.
   */
  const contextValue = useMemo(() => ({
    messages: messages || [], 
    input: input ?? '', 
    handleInputChange,
    handleSubmit, 
    isLoading: isLoading || false, // 🛡️ PHYSICAL WELD for isChatLoading
    setMessages, 
    data: data || [], 
    isOpen,
    openCopilot: () => setIsOpen(true), 
    closeCopilot: () => setIsOpen(false),
    toggleCopilot: () => setIsOpen((prev: boolean) => !prev),
    startAIAssistance, 
    isReady: true, // We only enter the Sanctuary if the handshake is valid
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
 * Resolves the identity from your multi-tenant database columns.
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // 1. Access the Business Context (Resolved to APEX)
  const { profile, isLoading: contextLoading } = useBusiness();
  const { lastSyncTime } = useSync();

  useEffect(() => { 
    setMounted(true); 
    
    const finalizeToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
            setToken(session.access_token);
        } else {
            // Cookie reassembly fallback
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
                } catch (e) { console.error("[AURA] Identity reassembly failure."); }
            }
        }
    };

    finalizeToken();
  }, []);

  /**
   * 🛡️ MULTI-TENANT IDENTITY MAPPING
   * Mapping based on the verified wide-system database schema.
   */
  const activeBusinessId = useMemo(() => 
    profile?.business_id || profile?.profile_linked_biz_id || '', 
    [profile]
  );

  const activeUserId = useMemo(() => 
    profile?.id || '', // ✅ UPDATED: audit shows ID is used for the director identity
    [profile]
  );

  // Tenant/Org logic
  const activeTenantId = useMemo(() => profile?.tenant_id || activeBusinessId, [profile, activeBusinessId]);
  const activeOrgId = useMemo(() => profile?.organization_id || activeBusinessId, [profile, activeBusinessId]);

  /**
   * ✅ FORENSIC READINESS SEAL
   * UNLOCKS TYPING: Now uses 'is_active' from your wide system audit.
   */
  const isHandshakeValid = mounted && 
                           !contextLoading && 
                           activeUserId !== '' && 
                           activeBusinessId !== '' &&
                           !!token && 
                           profile?.is_active === true; // ✅ UPDATED: is_ready does not exist; using is_active

  // Fallback state while identity is latent
  if (!isHandshakeValid) {
    return (
      <CopilotContext.Provider value={{ 
          isReady: false, 
          isLoading: false, 
          messages: [], 
          input: '', 
          businessId: activeBusinessId, 
          userId: activeUserId, 
          tenantId: activeTenantId, 
          organizationId: activeOrgId, 
          tenantData: profile, 
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

  // 🚀 HANDSHAKE SECURE: Engaging Neural Sanctuary
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