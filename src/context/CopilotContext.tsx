'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v29.3 OMEGA-ULTIMATUM (SHARED BOARDROOM STATE + REPORT FILE PARTS)
 * SDK_VERSION: @ai-sdk/react 3.0.192, built on ai@6.0.190
 * JURISDICTION: Global ERP / Multi-Tenant / Multi-Country
 *
 * v29.0: Real rate-limit protection via check_and_increment_aura_usage().
 * v29.1: Exports CopilotMessage type.
 * v29.2: `boardroomData` / `setBoardroomData` / `closeBoardroom` are now
 * owned here instead of as local useState in CopilotPanel.tsx and
 * MissionControlPage.tsx. This means the full-screen AuraBoardroom
 * presentation can be triggered from ANY component in the app that calls
 * useCopilot() — not just the two chat surfaces that used to hold their
 * own private copy. AuraForensicGuard.tsx specifically depended on
 * `boardroomData`/`closeBoardroom` existing on the context; previously
 * these were undefined here, which meant the guard's boardroom overlay
 * could never render and its onClose would throw if ever wired up.
 *
 * v29.7: Aura greets the director on arrival — time of day, their name, the
 * business she is linked to, and "welcome back" only when they have actually
 * been away for six hours or more. Composed locally rather than fetched,
 * because a predictable sentence is not worth an API call or two seconds of
 * waiting, and once per session because a greeting on every navigation stops
 * being a welcome.
 *
 * v29.6: AuraPresentation replaces AuraBoardroom. The old surface centred its
 * content with no scroll container, so any slide taller than the viewport was
 * simply unreachable — a director cannot read half a figure. The new one
 * scrolls, carries a laser pointer, and lets a question be asked about the
 * slide on screen without leaving the briefing.
 *
 * v29.5: AuraBoardroom moved here too, and for the same reason — it is
 * fixed inset-0, and inside the Sheet it would be trapped by the drawer's
 * transform and pointer-events lock exactly as the meeting was. A briefing
 * arriving now also closes the drawer.
 *
 * v29.4: The meeting room moved OUT of CopilotPanel and up to here, rendered
 * as a sibling of the Sheet rather than a child of it.
 *
 * Radix's Sheet is a Dialog. While open it sets pointer-events:none on body,
 * traps focus, watches document for pointerdown to decide it has been
 * dismissed, and installs react-remove-scroll — which blocks wheel events in
 * the CAPTURE phase on document, before anything downstream can intervene.
 * A full-screen meeting portalled to body inherited every one of those: dead
 * to clicks, dead to the wheel, and closing the drawer whenever it was
 * touched. Each workaround broke something else — the last one stopped click
 * and mousedown reaching React's root listener, so onClick and onChange
 * stopped firing altogether.
 *
 * Opening the meeting now CLOSES the drawer, and because the meeting is no
 * longer inside it, closing the drawer no longer unmounts the meeting. No
 * scroll lock, no focus trap, no pointer-events lock, nothing to fight.
 *
 * v29.3: Generated reports now reach the UI. aura-quantum-audit v31.0 emits a
 * `data-reportFile` part carrying the signed download URL and the file's key
 * figures. Two things had to change for it to be usable:
 *
 *   1. The `data` memo below collects only `data-agentStep` parts, so a
 *      reportFile part was discarded before any component saw it.
 *   2. `data` is rendered in CopilotPanel only while isChatLoading is true, so
 *      anything routed through it would disappear the moment the stream ended.
 *
 * Rather than widening `data`, the file is lifted onto its own message as
 * `reportFile`. Parts persist for the life of the conversation, so the download
 * card stays in the thread where the director left it instead of vanishing with
 * the tool-activity strip.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// CORE UI COMPONENT
import CopilotPanel from '@/components/copilot/CopilotPanel';
import AuraMeetingRoom from '@/components/copilot/AuraMeetingRoom';
import AuraPresentation from '@/components/copilot/AuraPresentation';

// ✅ THE MASTER IDENTITY HOOKS
import { useBusiness } from '@/context/BusinessContext';
import { createClient } from '@/lib/supabase/client';
import { useSync } from '@/components/core/SyncProvider';

/** ✅ v29.3: emitted by aura-quantum-audit when a report file has been generated. */
export interface ReportFile {
  title: string;
  fileName: string;
  format: string;
  reportType: string;
  scope: string;
  rowCount: number;
  downloadUrl: string;
  expiresInMinutes: number;
  warnings: string[];
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reportFile?: ReportFile;   // ✅ v29.3
}

/** Shape of the payload AuraBoardroom expects — matches the `prepare_boardroom_presentation` tool output. */
export interface BoardroomData {
  presenter_role: string;
  meeting_title: string;
  slides: any[];
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

  // ✅ v29.2: shared boardroom state, was previously local to each
  // consuming component (CopilotPanel, MissionControlPage separately).
  const [boardroomData, setBoardroomData] = useState<BoardroomData | null>(null);
  const closeBoardroom = useCallback(() => setBoardroomData(null), []);

  // ✅ v29.4: the meeting lives here, beside the Sheet rather than inside it.
  const [meetingOpen, setMeetingOpen] = useState(false);
  const openMeeting = useCallback(() => {
    setIsOpen(false);          // the drawer's locks are the whole problem
    setMeetingOpen(true);
  }, [setIsOpen]);
  const closeMeeting = useCallback(() => setMeetingOpen(false), []);

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
    // ✅ v29.3: the generated report file, if this message carried one.
    // Read straight from parts rather than from the `data` array below, so it
    // stays attached to its own message and survives after the stream closes.
    reportFile: (m.parts || []).find((p: any) => p.type === 'data-reportFile')?.data,
  })), [rawMessages]);

  // ✅ v29.4: this conversation, shaped for the meeting minutes.
  const meetingTranscript = useMemo(
    () => messages
      .filter((m) => m.content)
      .map((m) => ({
        role: (m.role === 'assistant' ? 'aura' : 'director') as 'aura' | 'director',
        text: m.content,
        at: Date.now(),
      })),
    [messages],
  );

  // ✅ v29.2: `data-agentStep` parts with action === 'prepare_boardroom_presentation'
  // now feed the shared boardroom state directly here, so ANY page using
  // useCopilot() gets the boardroom overlay automatically — not just
  // whichever chat surface happens to be mounted at the time.
  useEffect(() => {
    for (const m of rawMessages || []) {
      for (const part of (m.parts || [])) {
        if (part.type === 'data-agentStep' && part.data?.event === 'on_tool_end') {
          try {
            const output = typeof part.data.output === 'string' ? JSON.parse(part.data.output) : part.data.output;
            if (output?.action === 'prepare_boardroom_presentation' && output.payload) {
              setBoardroomData(output.payload);
              // The boardroom is fixed inset-0. Inside the Sheet it would be
              // trapped by the same transform, pointer-events and scroll locks
              // that made the meeting inert, so the drawer steps aside.
              setIsOpen(false);
            }
          } catch (e) { /* not a boardroom payload, ignore */ }
        }
      }
    }
  }, [rawMessages]);

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

  // ✅ v29.7: Aura greets the director when they arrive.
  //
  // Written here rather than fetched from the model: a greeting costs an API
  // call and two seconds of latency for a sentence whose content is entirely
  // predictable, and a director opening the app should not wait to be spoken
  // to. Once per session per business — a greeting on every page navigation
  // stops being a welcome and becomes noise.
  useEffect(() => {
    if (!businessId || !userId) return;
    if ((rawMessages || []).length > 0) return;

    const key = `aura.greeted.${businessId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (e) { return; }   // private mode: skip rather than greet endlessly

    const hour = new Date().getHours();
    const partOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const director = (tenantData?.full_name || '').split(' ')[0];
    const business = tenantData?.business_name || tenantData?.name || '';

    // "Welcome back" only when they have genuinely been away. Saying it to
    // someone who refreshed the page a minute ago reads as a system that is
    // not paying attention.
    let returning = false;
    try {
      const lastKey = `aura.lastSeen.${businessId}`;
      const last = Number(localStorage.getItem(lastKey) || 0);
      returning = last > 0 && Date.now() - last > 6 * 60 * 60 * 1000;
      localStorage.setItem(lastKey, String(Date.now()));
    } catch (e) { /* storage unavailable */ }

    const text = [
      `${partOfDay}${director ? `, ${director}` : ''}.`,
      returning ? 'Welcome back.' : '',
      business ? `I am linked to ${business} and your figures are up to date.` : 'Your figures are up to date.',
      'Ask me anything about your sales, ledger, stock or staff — or say the word and I will put a briefing on screen.',
    ].filter(Boolean).join(' ');

    setRawMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [{ type: 'text', text }],
    }] as any);
  }, [businessId, userId, tenantData, rawMessages, setRawMessages]);

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

  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setIsOpen(true);
    setTimeout(() => { if (sessionToken) handleSubmit(prompt); }, 850);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  // Note: this rebuilds parts from `content` alone, so a programmatic replace
  // drops any attached reportFile. That is correct — these are synthetic
  // messages with no file behind them.
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
    tenantModules: tenantData?.tenantModules || [],
    // ✅ v29.2: shared boardroom state
    boardroomData,
    setBoardroomData,
    closeBoardroom,
    // ✅ v29.4
    meetingOpen,
    openMeeting,
    closeMeeting,
  }), [
    messages, isLoading, data, inputValue, isOpen, businessId, userId,
    tenantId, organizationId, tenantData, handleSubmit, handleInputChange,
    startAIAssistance, setIsOpen, setMessages, boardroomData, closeBoardroom,
    meetingOpen, openMeeting, closeMeeting
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

      {/* ✅ v29.4: outside the Sheet on purpose. Inside it, the dialog's
          pointer-events lock, focus trap and scroll lock made the meeting
          visible but completely inert. */}
      {/* ✅ v29.5: rendered here, outside the Sheet, for the same reason as
          the meeting — and because it had never been shown at all until the
          edge function started emitting prepare_boardroom_presentation. */}
      {boardroomData && (
        <AuraPresentation
          open
          presenter={boardroomData.presenter_role}
          title={boardroomData.meeting_title}
          slides={boardroomData.slides as any}
          onClose={closeBoardroom}
          messages={messages}
          onAsk={(text: string) => handleSubmit(text)}
          thinking={isLoading}
        />
      )}

      <AuraMeetingRoom
        open={meetingOpen}
        onClose={closeMeeting}
        businessId={businessId}
        businessName={tenantData?.business_name || tenantData?.name || 'the business'}
        directorName={tenantData?.full_name || 'Director'}
        transcript={meetingTranscript}
        onRequestMinutes={(prompt: string) => {
          setMeetingOpen(false);
          setIsOpen(true);       // bring the chat back to receive the minutes
          handleSubmit(prompt);
        }}
        messages={messages}
        onAsk={(text: string) => handleSubmit(text)}
        thinking={isLoading}
      />
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
          data: undefined,
          // ✅ v29.2: keep the shape consistent even before handshake —
          // AuraForensicGuard reads these unconditionally, so they must
          // exist here too, not just in the ready branch.
          boardroomData: null,
          setBoardroomData: () => {},
          closeBoardroom: () => {},
          // ✅ v29.4: shape stays consistent before the handshake completes.
          meetingOpen: false,
          openMeeting: () => {},
          closeMeeting: () => {},
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