'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v29.0 OMEGA-ULTIMATUM (THE SDK v5 MIGRATION WELD)
 * SDK_VERSION: @ai-sdk/react 3.0.192, built on ai@6.0.190
 * JURISDICTION: Global ERP / Multi-Tenant / Multi-Country
 *
 * CORE ARCHITECTURAL UPGRADES:
 * 1. AGGRESSIVE IDENTITY RETRIEVAL: unchanged from v28.2.
 * 2. LIVE TOKEN SYNC: unchanged from v28.2 — subscribes to
 *    onAuthStateChange instead of fetching the token once.
 * 3. ⚠️ SDK v5 REWRITE (ROOT CAUSE FIX): Verified directly against
 *    node_modules/@ai-sdk/react/dist/index.js and node_modules/ai/dist/
 *    index.js — the installed useChat() does NOT return `input`,
 *    `handleInputChange`, `handleSubmit`, `append`, `isLoading`, or
 *    `data`. That was the old (pre-v5) API shape. This version only
 *    returns: messages, setMessages, sendMessage, regenerate,
 *    clearError, stop, error, resumeStream, status, addToolOutput, ...
 *    This is why `handleInputChange` was `undefined` on every single
 *    render, in every environment (dev, local prod, live prod) — it
 *    never existed. Confirmed root cause of the typing bug.
 *
 *    FIX: `input` is now local component state, managed by hand.
 *    `sendMessage({ text })` is used instead of `append`. `isLoading`
 *    is derived from `status` ('submitted' | 'streaming' | ...).
 *    `messages` (v5 UIMessage[] with `.parts`) are flattened back into
 *    the old `{id, role, content}` shape so CopilotPanel.tsx needs ZERO
 *    changes. `data` (old generic stream array) is reconstructed by
 *    scanning message parts for `data-agentStep` parts emitted by the
 *    edge function (aura-quantum-audit v28.1+).
 * 4. DYNAMIC TRANSPORT: Auth/identity values (token, businessId,
 *    pathname, etc.) change over the life of the chat session, but
 *    useChat's transport is created once. Fresh values are threaded in
 *    via refs read inside `prepareSendMessagesRequest`, so every send
 *    uses current identity without needing to recreate the chat
 *    instance (which would wipe message history).
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
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

const AURA_ENDPOINT = 'https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-quantum-audit';

/**
 * 🛡️ THE NEURAL SANCTUARY (The Quantum Engine Room)
 */
function NeuralSanctuary({
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen, sessionToken
}: any) {
  const pathname = usePathname();
  const isSyncing = useRef(false);

  // 🔄 Refs so the transport always reads *current* identity values
  // without needing useChat() to be torn down and recreated (which
  // would reset message history on every identity change).
  const sessionTokenRef = useRef(sessionToken);
  const businessIdRef = useRef(businessId);
  const userIdRef = useRef(userId);
  const tenantIdRef = useRef(tenantId);
  const organizationIdRef = useRef(organizationId);
  const pathnameRef = useRef(pathname);
  const tenantModulesRef = useRef(tenantData?.tenantModules || []);

  useEffect(() => { sessionTokenRef.current = sessionToken; }, [sessionToken]);
  useEffect(() => { businessIdRef.current = businessId; }, [businessId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { tenantIdRef.current = tenantId; }, [tenantId]);
  useEffect(() => { organizationIdRef.current = organizationId; }, [organizationId]);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { tenantModulesRef.current = tenantData?.tenantModules || []; }, [tenantData]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: AURA_ENDPOINT,
    prepareSendMessagesRequest: ({ messages, body }: any) => ({
      api: AURA_ENDPOINT,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionTokenRef.current}`,
        'x-bbu1-vault-id': businessIdRef.current,
        'x-bbu1-path': pathnameRef.current,
        'x-bbu1-director-id': userIdRef.current,
      },
      body: {
        messages,
        businessId: businessIdRef.current,
        userId: userIdRef.current,
        tenantId: tenantIdRef.current,
        organizationId: organizationIdRef.current,
        tenantModules: tenantModulesRef.current,
        ...body,
      },
    }),
  }), []); // created once — always reads fresh values via the refs above

  const {
    messages: rawMessages,
    sendMessage,
    status,
    error: chatError,
    stop,
    setMessages,
  } = useChat({
    id: `aura-vault-${businessId}`,
    transport,
    onFinish: () => { isSyncing.current = false; },
    onError: (err: any) => {
      isSyncing.current = false;
      console.error("%c[AURA CRITICAL] Neural Link Fault:", "color: #EF4444; font-weight: bold;", err);
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // ✅ BACK-COMPAT SHAPE: flatten v5 UIMessage[] (with `.parts`) into the
  // old {id, role, content} shape CopilotPanel.tsx already expects.
  const messages = useMemo(() => (rawMessages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: (m.parts || [])
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join(''),
  })), [rawMessages]);

  // ✅ BACK-COMPAT SHAPE: reconstruct the old generic `data` stream array
  // from custom 'data-agentStep' parts the edge function now emits,
  // plus a synthetic on_error entry if useChat surfaced a fetch/stream
  // error. CopilotPanel.tsx's AgentStep renderer and its on_error /
  // on_tool_end effect both consume this exact shape unmodified.
  const data = useMemo(() => {
    const items: any[] = [];
    for (const m of rawMessages || []) {
      for (const part of (m.parts || [])) {
        if (part.type === 'data-agentStep' && part.data) {
          items.push(part.data);
        }
      }
    }
    if (chatError) {
      items.push({ event: 'on_error', data: { error: chatError.message || 'Something went wrong.' } });
    }
    return items;
  }, [rawMessages, chatError]);

  // ✅ `input` is now genuinely local state — the SDK no longer manages
  // this for us.
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e?: any, options?: any) => {
    // SECURITY: Ensure message only fires if token has arrived
    if (!sessionToken) {
      toast.info("Aura: Initializing secure link... please try again in a moment.");
      return;
    }

    if (isSyncing.current || isLoading) return;

    // Form submission path (composer's onSubmit)
    if (e && e.preventDefault) {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text) return;
      isSyncing.current = true;
      setInputValue('');
      try {
        await sendMessage({ text });
      } catch (err) {
        isSyncing.current = false;
      }
      return;
    }

    // Programmatic path (suggestion buttons / startAIAssistance passing a string)
    if (typeof e === 'string' && e.trim().length > 0) {
      isSyncing.current = true;
      try {
        await sendMessage({ text: e });
      } catch (err) {
        isSyncing.current = false;
      }
    }
  }, [sendMessage, isLoading, sessionToken, inputValue]);

  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setIsOpen(true);
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  const contextValue = useMemo(() => ({
    messages: messages || [],
    input: inputValue ?? '',
    setInput: setInputValue,
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
    messages, isLoading, data, inputValue, isOpen, businessId, userId,
    tenantId, organizationId, tenantData, handleSubmit, handleInputChange,
    startAIAssistance, setIsOpen, setMessages
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setToken(session?.access_token ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });

    return () => subscription.unsubscribe();
  }, []);

  const activeUserId = useMemo(() => {
    if (profile?.id) return profile.id;
    if (token) {
      try { return JSON.parse(atob(token.split('.')[1])).sub; } catch (e) {}
    }
    return '';
  }, [profile, token]);

  const activeBusinessId = useMemo(() =>
    profile?.business_id || activeUserId || '',
    [profile, activeUserId]
  );

  const activeTenantId = useMemo(() => profile?.tenant_id || activeBusinessId, [profile, activeBusinessId]);
  const activeOrgId = useMemo(() => profile?.organization_id || activeBusinessId, [profile, activeBusinessId]);

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
          setInput: () => {},
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