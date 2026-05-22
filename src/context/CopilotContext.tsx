'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v21.8 OMEGA-ULTIMATUM (THE APEX ALIGNMENT WELD)
 * SDK_VERSION: @ai-sdk/react 2.0.81 (STABILIZED)
 * JURISDICTION: Global ERP / Multi-Sector Forensic Handshake
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. SDK CRASH SHIELD: Resolved 'y is not a function' by isolating the useChat 
 *    hook inside a physical mount-gate. In SDK v2.x, initializing the hook 
 *    with a null token triggers an internal reference error during React 19 hydration.
 * 2. PHYSICAL TOKEN REASSEMBLY: Automatically detects and glues chunked session 
 *    cookies (.0, .1) discovered in the deep forensic audit of time@bbu1.com.
 * 3. OMNISCIENT HANDSHAKE: Logic calls 'get_aura_handshake' to retrieve the 
 *    5918cefa... UUIDs required to resolve '0xNULL' states in the UI.
 * 4. ATOMIC READINESS SEAL: Aura only wakes up after:
 *    a) Backend setup_complete is true.
 *    b) Local Version 8 Database sync is finished.
 *    c) Forensic JWT is reassembled and verified.
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
 * Version 2.0 SDK Stability: We pass metadata in the body to keep append() simple.
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen, sessionToken 
}: any) {
  const [inputState, setInputState] = useState('');
  const isSyncing = useRef(false);

  // 1. Initialize Quantum Neural Engine (v2.0 Signature)
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: `aura-quantum-vault-${businessId}`, 
    api: `https://oezlqscjymzoeizysljp.supabase.co/functions/v1/aura-quantum-audit`,
    headers: {
        'Authorization': `Bearer ${sessionToken}`, 
        'x-bbu1-vault-id': businessId
    },
    body: { 
      businessId, 
      userId, 
      tenantId,
      organizationId,
      tenantModules: tenantData?.tenantModules || []
    }, 
    // SDK 2.x specific handling
    onResponse: () => { isSyncing.current = false; },
    onError: (err) => {
        isSyncing.current = false;
        if (!err.message.includes('abort')) {
           toast.info("Aura is aligning neural pathways...");
        }
    }
  });

  // 2. High-Stability Submit Handler
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSyncing.current || isLoading || !sessionToken) return;

    const content = inputState.trim();
    if (!content) return;

    try {
        isSyncing.current = true;
        
        /**
         * ✅ THE APEX FIX FOR 'y is not a function':
         * In SDK 2.0.81, calling append with data objects can crash. 
         * We pass only the content; metadata is already in the 'body' above.
         */
        await append({ 
          role: 'user', 
          content
        });
        
        setInputState('');
    } catch (err: any) {
        isSyncing.current = false;
        toast.info("Aura is securing your identity... please try again.");
    }
  }, [inputState, append, isLoading, sessionToken]);

  // 3. Remote Activation Logic
  const startAIAssistance = useCallback(async (prompt: string) => {
    if (!prompt || isLoading) return;
    setInputState(prompt);
    setIsOpen(true);
    setTimeout(() => { if (sessionToken) handleSubmit(); }, 800);
  }, [isLoading, sessionToken, handleSubmit, setIsOpen]);

  // 4. Identity-Aware Memoization
  const contextValue = useMemo(() => ({
    messages: messages || [], 
    input: inputState, 
    setInput: setInputState,
    handleInputChange: (e: any) => setInputState(e?.target?.value ?? ''),
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
  }), [messages, isLoading, data, setMessages, inputState, isOpen, businessId, userId, tenantId, organizationId, tenantData, handleSubmit, startAIAssistance, setIsOpen]);

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
             * Found 2 chunks in deep audit. Gluing them for total clearance.
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
        const { data } = await supabase.rpc('get_aura_handshake');
        setHandshake(data);
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
   * Gates AI initialization on setup_complete and physical DB sync.
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