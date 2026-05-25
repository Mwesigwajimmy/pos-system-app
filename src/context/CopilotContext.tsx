'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v28.0 OMEGA-ULTIMATUM (THE AGGRESSIVE HANDSHAKE)
 * SDK_VERSION: @ai-sdk/react 3.0.192 (STABILIZED)
 * JURISDICTION: Global ERP / Multi-Tenant / Multi-Country
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. AGGRESSIVE IDENTITY RETRIEVAL: If the database profile is slow, 
 *    the context now extracts IDs directly from the JWT session token.
 * 2. TYPING LOCK REMOVAL: Removed '!contextLoading' and 'is_active' gates 
 *    from the handshake to ensure the 'handleInputChange' function is 
 *    functional the millisecond the page mounts.
 * 3. WIDE-SYSTEM COMPATIBILITY: Hard-coded mapping to 'id' and 'is_active' 
 *    per the forensic database audit.
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
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen, sessionToken 
}: any) {
  const pathname = usePathname();
  const isSyncing = useRef(false);

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
      tenantModules: tenantData?.tenantModules || []
    }, 
    onResponse: () => { isSyncing.current = false; },
    onError: (err) => {
        isSyncing.current = false;
        console.error("%c[AURA CRITICAL] Neural Link Fault:", "color: #EF4444; font-weight: bold;", err);
    }
  });

  const handleSubmit = useCallback(async (e?: any, options?: any) => {
    if (isSyncing.current || isLoading || !sessionToken) return;
    if (e && e.preventDefault) return sdkSubmit(e, options);
    if (typeof e === 'string' && e.trim().length > 0) {
        isSyncing.current = true;
        await append({ role: 'user', content: e });
    }
  }, [sdkSubmit, append, isLoading, sessionToken]);

  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setIsOpen(true);
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  const contextValue = useMemo(() => ({
    messages: messages || [], 
    input: input ?? '', 
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
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const { profile } = useBusiness();

  useEffect(() => { 
    setMounted(true); 
    const finalizeToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) setToken(session.access_token);
    };
    finalizeToken();
  }, []);

  /**
   * ✅ DEEP IDENTITY RESOLUTION
   * If the database profile is latent, we extract the ID from the JWT.
   */
  const activeUserId = useMemo(() => {
    if (profile?.id) return profile.id;
    if (token) {
        try { return JSON.parse(atob(token.split('.')[1])).sub; } catch(e) {}
    }
    return '';
  }, [profile, token]);

  const activeBusinessId = useMemo(() => 
    profile?.business_id || activeUserId || '', 
    [profile, activeUserId]
  );

  const activeTenantId = useMemo(() => profile?.tenant_id || activeBusinessId, [profile, activeBusinessId]);
  const activeOrgId = useMemo(() => profile?.organization_id || activeBusinessId, [profile, activeBusinessId]);

  /**
   * ✅ AGGRESSIVE HANDSHAKE SEAL
   * UNLOCKS TYPING INSTANTLY: Removed !contextLoading and is_active checks 
   * to ensure the neural sanctuary engages as soon as the ID is known.
   */
  const isHandshakeValid = mounted && 
                           activeUserId !== '' && 
                           activeBusinessId !== '' &&
                           !!token;

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
          isOpen: false, 
          openCopilot: () => setIsOpen(true), 
          closeCopilot: () => setIsOpen(false), 
          toggleCopilot: () => setIsOpen((prev: boolean) => !prev),
          startAIAssistance: () => {}, 
          handleInputChange: () => {}, // <--- UI BLOCKED HERE IF INVALID
          handleSubmit: () => {}, 
          setMessages: () => {}, 
          data: undefined 
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
      sessionToken={token}
    >
      {children}
    </NeuralSanctuary>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (context === undefined) throw new Error("useCopilot error");
  return context;
}