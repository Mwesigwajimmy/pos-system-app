'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v21.8 OMEGA-ULTIMATUM (THE DYNAMIC NEURAL WELD)
 * JURISDICTION: Global ERP / Multi-Sector Forensic Handshake
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. AUTONOMOUS TOKEN DISCOVERY: Removed hardcoded project keys. The engine 
 *    now dynamically searches LocalStorage and Cookies for any active 
 *    Supabase session chunks, ensuring the system works for all nodes.
 * 2. OMEGA CHUNK REASSEMBLY: Automatically detects if a session is split 
 *    into multiple pieces (.0, .1) and reconstructs the JWT for the AI Brain.
 * 3. TOTAL CLEARANCE GRANT: Injects the verified JWT into the neural headers, 
 *    granting Aura the 'Director' pass needed to audit all enterprise sectors.
 * 4. HYDRATION CRASH SHIELD: Welded with a mount-gate to prevent the 
 *    'Illegal constructor' error during initial server-to-client handoff.
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react';
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
 * This component only mounts once the Identity IDs (5918cefa...) are resolved.
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen 
}: any) {
  const [inputState, setInputState] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const isSyncing = useRef(false);

  // 🛡️ DYNAMIC NEURAL DISCOVERY: Finds the token for ANY business node
  useEffect(() => {
    const discoverNeuralToken = async () => {
        // Path A: Standard SDK attempt
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
            setToken(session.access_token);
        } else {
            /**
             * Path B: FORENSIC DEEP SEARCH
             * We search for chunked cookies dynamically to avoid hardcoding.
             */
            const allCookies = document.cookie.split('; ');
            const authCookiePrefix = allCookies.find(c => c.trim().includes('-auth-token'))?.split('=')[0]?.split('.')[0];

            if (authCookiePrefix) {
                const chunks = allCookies
                    .filter(c => c.trim().startsWith(authCookiePrefix))
                    .sort()
                    .map(c => c.split('=')[1]);

                if (chunks.length > 0) {
                    try {
                        const combined = chunks.join('').replace('base64-', '');
                        const sessionData = JSON.parse(atob(decodeURIComponent(combined)));
                        setToken(sessionData.access_token);
                        console.log("%c[AURA] Neural Handshake: Discovery Successful.", "color: #10B981;");
                    } catch (e) {
                        console.error("[AURA] Neural Handshake: Fragments corrupted.");
                    }
                }
            }
        }
    };
    discoverNeuralToken();
  }, [isOpen]); // Re-verify whenever Mission Control is toggled

  // 1. Initialize Quantum Neural Engine
  // Headers are reactive; the AI Brain waits for the 'token' to arrive.
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: `aura-quantum-vault-${businessId}`, 
    api: `https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-quantum-audit`,
    headers: {
        'Authorization': `Bearer ${token}`, 
        'x-bbu1-vault-id': businessId
    },
    body: { 
      businessId, 
      userId, 
      tenantId,
      organizationId,
      tenantModules: tenantData?.tenantModules || []
    }, 
    experimental_streamData: true,
    onResponse: () => { isSyncing.current = false; },
    onError: (err) => {
        isSyncing.current = false;
        if (!err.message.includes('abort')) {
           toast.info("Aura is aligning neural pathways... please try again.");
        }
    }
  });

  // 2. High-Stability Submit Handler
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSyncing.current || isLoading || !token) return;

    const content = inputState.trim();
    if (!content) return;

    try {
        isSyncing.current = true;
        
        /**
         * ✅ THE APEX FIX:
         * We pass 'role' and 'content' only. Metadata is handled 
         * via the reactive body/headers above.
         */
        await append({ 
          role: 'user', 
          content
        });
        
        setInputState('');
    } catch (err: any) {
        isSyncing.current = false;
        console.error("QUANTUM HANDSHAKE CRASH:", err.message);
        toast.info("Aura is securing your identity... please try again.");
    }
  }, [inputState, append, isLoading, token]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setInputState(prompt);
    setIsOpen(true);
    setTimeout(() => { if (token) handleSubmit(); }, 800);
  }, [isLoading, token, handleSubmit, setIsOpen]);

  // 4. Identity-Aware Memoization
  const contextValue = useMemo(() => ({
    messages: messages || [], input: inputState, setInput: setInputState,
    handleInputChange: (e: any) => setInputState(e?.target?.value ?? ''),
    handleSubmit, isLoading, setMessages, data, isOpen,
    openCopilot: () => setIsOpen(true), closeCopilot: () => setIsOpen(false),
    toggleCopilot: () => setIsOpen((prev: boolean) => !prev),
    startAIAssistance, isReady: !!token, businessId, userId, tenantId, organizationId,
    tenantData, tenantModules: tenantData?.tenantModules || []
  }), [messages, isLoading, data, setMessages, inputState, isOpen, businessId, userId, tenantId, organizationId, tenantData, handleSubmit, startAIAssistance, setIsOpen, token]);

  return (
    <CopilotContext.Provider value={contextValue}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-[440px] sm:w-[600px] p-0 border-l shadow-2xl overflow-hidden bg-background/95 backdrop-blur-md"
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

  useEffect(() => { 
    setMounted(true); 
    const fetchHandshake = async () => {
        const { data } = await supabase.rpc('get_aura_handshake');
        setHandshake(data);
    };
    fetchHandshake();
  }, []);

  const { profile, isLoading: contextLoading } = useBusiness();
  const { lastSyncTime } = useSync();

  const activeBusinessId = useMemo(() => handshake?.businessId || profile?.business_id || '', [handshake, profile]);
  const activeUserId = useMemo(() => handshake?.userId || profile?.id || '', [handshake, profile]);
  const activeTenantId = useMemo(() => profile?.tenant_id || activeBusinessId, [profile, activeBusinessId]);
  const activeOrgId = useMemo(() => profile?.organization_id || activeBusinessId, [profile, activeBusinessId]);

  /**
   * ✅ FORENSIC READINESS SEAL: 
   * Physically gates Aura on setup_complete and successful DB sync.
   */
  const isReady = mounted && !contextLoading && 
                  activeUserId !== '' && activeBusinessId !== '' &&
                  profile?.setup_complete === true && !!lastSyncTime;

  if (!isReady) {
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
      businessId={activeBusinessId} userId={activeUserId} 
      tenantId={activeTenantId} organizationId={activeOrgId}
      tenantData={profile} isOpen={isOpen} setIsOpen={setIsOpen}
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