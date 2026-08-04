'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v29.1 OMEGA-ULTIMATUM (RATE-LIMIT PROTECTED + TYPE EXPORT)
 * SDK_VERSION: @ai-sdk/react 3.0.192, built on ai@6.0.190
 * JURISDICTION: Global ERP / Multi-Tenant / Multi-Country
 *
 * v29.0: Real rate-limit protection via check_and_increment_aura_usage()
 * (atomic Postgres function, row-locked per user).
 *
 * v29.1: Exports a `CopilotMessage` type matching the flattened
 * {id, role, content} shape `messages` is normalized into below.
 * AiAuditAssistant.tsx imports this type; it previously didn't exist
 * anywhere in this file, which would fail at build time.
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

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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
  }), []);

  const {
    messages: rawMessages,
    sendMessage,
    status,
    error: chatError,
    stop,
    setMessages: setRawMessages,
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

  const messages: CopilotMessage[] = useMemo(() => (rawMessages || []).map((m: any) => ({
    id: m.id,
    role: m.role,
    content: (m.parts || [])
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join(''),
  })), [rawMessages]);

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

  const [inputValue, setInputValue] = useState('');

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleSubmit = useCallback(async (e?: any, options?: any) => {
    if (!sessionToken) {
      toast.info("Aura: Initializing secure link... please try again in a moment.");
      return;
    }

    if (isSyncing.current || isLoading) return;

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

    if (typeof e === 'string' && e.trim().length > 0) {
      isSyncing.current = true;
      try {
        await sendMessage({ text: e });
      } catch (err) {
        isSyncing.current = false;
      }
    }
  }, [sendMessage, isLoading, sessionToken, inputValue]);

  // ⚠️ NOTE: MissionControlPage's `handleSuggestionClick` previously passed
  // a second `options.body` argument to handleSubmit, expecting it to be
  // forwarded to the request — that was the pre-v5 AI SDK behavior. This
  // handleSubmit no longer reads a second argument at all; sendMessage()
  // already carries businessId/userId via prepareSendMessagesRequest
  // above, so a plain string resend still works, but any code relying on
  // custom per-call body overrides via the second argument will silently
  // have that argument ignored. Flagged here rather than guessed at.

  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setIsOpen(true);
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  // setMessages back-compat shim: callers (e.g. MissionControlPage's
  // handleSuggestionClick) historically pass the flattened
  // {id, role, content} shape. useChat's real setMessages expects v5
  // UIMessage[] (with `.parts`), so we translate on the way in.
  const setMessages = useCallback((next: CopilotMessage[] | ((prev: CopilotMessage[]) => CopilotMessage[])) => {
    const resolved = typeof next === 'function' ? (next as any)(messages) : next;
    setRawMessages((resolved || []).map((m: CopilotMessage) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: 'text', text: m.content }],
    })));
  }, [messages, setRawMessages]);

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