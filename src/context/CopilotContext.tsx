'use client';

/**
 * --- BBU1 SOVEREIGN COPILOT CONTEXT ---
 * VERSION: v21.5 OMEGA-ULTIMATUM (THE TOTAL CLEARANCE WELD)
 * JURISDICTION: Global ERP / Multi-Sector Forensic Handshake
 * 
 * CORE ARCHITECTURAL FIXES:
 * 1. OMEGA CHUNK REASSEMBLY: Large enterprise sessions are split into chunks 
 *    (.0, .1) in SSR cookies. This logic physically reassembles them before 
 *    decoding, ensuring the AI Brain receives a 100% valid JWT.
 * 2. TOTAL CLEARANCE GRANT: Transfers the reassembled JWT to the Quantum 
 *    Engine, providing Aura with the 'Director' pass needed to audit Sacco, 
 *    Medical, and Logistics nodes.
 * 3. CRASH SHIELD: Aligned the append() signature to match the v2.0 AI-SDK 
 *    specification, physically eliminating the 'y is not a function' error.
 * 4. DUAL-PATH READINESS: AI initialization is physically gated on the 
 *    'setup_complete' backend signal AND the local Version 8 database sync.
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
import { db } from '@/lib/db'; 
import { useSync } from '@/components/core/SyncProvider';

interface CopilotContextType {
  messages: any[]; 
  input: string;
  setInput: (value: string) => void;
  handleInputChange: (e: any) => void;
  handleSubmit: (e: any) => void;
  isLoading: boolean;
  setMessages: (messages: any[]) => void;
  data: any[] | undefined;
  isOpen: boolean;
  openCopilot: () => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
  startAIAssistance: (prompt: string) => void;
  isReady: boolean;
  businessId: string;
  userId: string;
  tenantId: string;
  organizationId: string;
  tenantData: any; 
  tenantModules: string[];
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);
const supabase = createClient();

/**
 * 🛡️ THE NEURAL SANCTUARY (The Quantum Engine Room)
 */
function NeuralSanctuary({ 
  children, businessId, userId, tenantId, organizationId, tenantData, isOpen, setIsOpen 
}: any) {
  const [inputState, setInputState] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const isSyncing = useRef(false);

  // 🛡️ OMEGA RECOVERY: Physical Reassembly of chunked JWTs
  useEffect(() => {
    const syncToken = async () => {
        // Path A: Standard getSession attempt
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            setToken(session.access_token);
            console.log("%c[AURA] Neural Token Secured.", "color: #10B981;");
        } else {
            /**
             * 🛡️ FORENSIC CHUNK REASSEMBLY
             * Rebuilds the split JWT from .0 and .1 cookie pieces 
             * to bypass browser storage restrictions.
             */
            const storageKey = `sb-oezlqscjymzoeizysljp-auth-token`;
            const cookies = document.cookie.split('; ');
            
            const chunks = cookies
                .filter(c => c.trim().startsWith(storageKey))
                .sort() // Ensure .0 comes before .1
                .map(c => c.split('=')[1]);

            if (chunks.length > 0) {
                try {
                    const combined = chunks.join('').replace('base64-', '');
                    const decoded = JSON.parse(atob(decodeURIComponent(combined)));
                    setToken(decoded.access_token);
                    console.log("%c[AURA] Forensic Token Reassembled.", "color: #10B981; font-weight: bold;");
                } catch (e) {
                    console.error("[AURA] Neural Weld Failure: Identity fragmented.");
                }
            }
        }
    };
    syncToken();
  }, []);

  // 1. Initialize Quantum Neural Engine
  const { messages, isLoading, append, setMessages, data } = useChat({
    id: `aura-quantum-vault-${businessId}`, 
    api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/aura-quantum-audit`,
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
        console.error("[AURA QUANTUM COLLAPSE]", err);
        if (!err.message.includes('abort')) {
           toast.info("Aura is aligning neural pathways... please try again.");
        }
    }
  });

  // 2. High-Stability Submit Handler (FIXED SIGNATURE)
  const handleSubmit = useCallback(async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSyncing.current || isLoading || !token) return;

    const content = inputState.trim();
    if (!content) return;

    try {
        isSyncing.current = true;
        
        /**
         * ✅ APEX WELD: Simplified append signature.
         * Prevents the 'y is not a function' TypeError.
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
    startAIAssistance, isReady: true, businessId, userId, tenantId, organizationId,
    tenantData, tenantModules: tenantData?.tenantModules || []
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
 */
export function GlobalCopilotProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [handshake, setHandshake] = useState<any>(null);

  useEffect(() => { 
    setMounted(true); 
    // AUTHORITATIVE HANDSHAKE PULL
    const fetchHandshake = async () => {
        const { data } = await supabase.rpc('get_aura_handshake');
        setHandshake(data);
    };
    fetchHandshake();
  }, []);

  const { profile, isLoading: contextLoading } = useBusiness();
  const { lastSyncTime } = useSync();

  // DEEP WELD: Robust mapping for the 5918cefa... Identity discovered in audit
  const activeBusinessId = useMemo(() => handshake?.businessId || profile?.business_id || '', [handshake, profile]);
  const activeUserId = useMemo(() => handshake?.userId || profile?.id || '', [handshake, profile]);
  const activeTenantId = useMemo(() => profile?.tenant_id || activeBusinessId, [profile, activeBusinessId]);
  const activeOrgId = useMemo(() => profile?.organization_id || activeBusinessId, [profile, activeBusinessId]);

  /**
   * ✅ FORENSIC READINESS SEAL
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