'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v28.2 OMEGA-ULTIMATUM (THE LIVE TOKEN SYNC WELD)
 * SDK_VERSION: @ai-sdk/react 3.0.192 (STABILIZED)
 * JURISDICTION: Global ERP / Multi-Tenant / Multi-Country
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. AGGRESSIVE IDENTITY RETRIEVAL: If the database profile is slow, 
 *    the context now extracts IDs directly from the JWT session token.
 * 2. TYPING LOCK REMOVAL: Removed '!!token' gate from the handshake to ensure
 *    the 'handleInputChange' function is active immediately upon ID resolution.
 * 3. WIDE-SYSTEM COMPATIBILITY: Hard-coded mapping to 'id' and 'is_active' 
 *    per the forensic database audit.
 * 4. LIVE TOKEN SYNC: Token is no longer fetched once on mount. It now 
 *    subscribes to onAuthStateChange, so a refreshed, expired, or 
 *    cleared session is picked up immediately instead of leaving the 
 *    panel stuck on a stale token (which was collapsing the whole 
 *    Copilot into its no-op fallback branch and disabling typing).
 * 5. 🔍 TEMPORARY DIAGNOSTIC: Logs the chat 'id' on every render to test
 *    whether businessId is flickering between values while typing, which
 *    would cause useChat() to silently reset its internal input state
 *    even without a full unmount. REMOVE once the typing bug is fixed.
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

  // 🔍 TEMPORARY DIAGNOSTIC — fires on every render, remove after testing
  console.log('%c[DIAGNOSTIC] chat id this render:', 'color: orange; font-weight: bold;', `aura-vault-${businessId}`, '| businessId:', businessId);

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
    // SECURITY: Ensure message only fires if token has arrived
    if (!sessionToken) {
        toast.info("Aura: Initializing secure link... please try again in a moment.");
        return;
    }
    
    if (isSyncing.current || isLoading) return;
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

  /**
   * ✅ LIVE TOKEN SYNC (v28.2 FIX)
   * Previously this only fetched the token ONCE on mount via getSession().
   * If the session later refreshed, expired, or was cleared (e.g. the
   * refresh_token network call failing), 'token' here went stale and
   * never recovered — which fed into activeUserId/activeBusinessId below,
   * flipped isHandshakeValid to false, and collapsed the whole panel into
   * its no-op fallback branch (handleInputChange: () => {}), disabling
   * typing until a full page reload. Subscribing to onAuthStateChange
   * (matching BusinessContext's existing pattern) keeps 'token' correct
   * for the lifetime of the session, including refreshes and sign-outs.
   */
  useEffect(() => { 
    setMounted(true); 

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setToken(session?.access_token ?? null);
    });

    // Initial fetch for the first render, before any auth event fires.
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) setToken(session.access_token);
    });

    return () => subscription.unsubscribe();
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
   * UNLOCKS TYPING INSTANTLY: Removed !!token from the handshake validity check.
   * This ensures the NeuralSanctuary (the real typing engine) mounts as soon 
   * as the ID is known, even while the token is still in the process of welding.
   */
  const isHandshakeValid = mounted && 
                           activeUserId !== '' && 
                           activeBusinessId !== '';

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
          handleInputChange: () => {}, 
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