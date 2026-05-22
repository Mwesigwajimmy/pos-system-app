'use client';

/**
 * --- BBU1 SOVEREIGN SUPABASE PROVIDER ---
 * VERSION: v21.0 OMEGA (THE DUAL-STORAGE WELD)
 * JURISDICTION: Root Identity Hydration
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. PHYSICAL MIRROR WELD: Logic now automatically synchronizes the cookie-based 
 *    session into LocalStorage. This allows the Aura Assistant and forensic 
 *    hooks to access the identity without Base64 overhead.
 * 2. 429 RATE-LIMIT SHIELD: Maintains the loop-guard that prevents redundant 
 *    router refreshes during token rotation, protecting against Supabase 429s.
 * 3. BUSINESS ID PERSISTENCE: Ensures 'bbu1_active_business_id' is physically 
 *    written to the cookie layer on every auth event to keep the Global Ledger aligned.
 * 4. CLEAN DISCONNECT: Physically wipes the LocalStorage on 'SIGNED_OUT' to 
 *    ensure zero-leakage security.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

type SupabaseContext = {
  supabase: SupabaseClient;
  session: Session | null;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const router = useRouter();
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      
      /**
       * ✅ THE DUAL-STORAGE WELD
       * Triggered on every auth event to ensure the browser has a 
       * physical copy of the identity for the Aura AI brain.
       */
      if (currentSession) {
        // 1. Mirror to LocalStorage for AI Handshake access
        const storageKey = `sb-oezlqscjymzoeizysljp-auth-token`;
        localStorage.setItem(storageKey, JSON.stringify(currentSession));

        // 2. Align Business Identity Cookie
        const bizId = currentSession.user.user_metadata?.business_id || currentSession.user.id;
        if (bizId) {
          Cookies.set('bbu1_active_business_id', bizId, { expires: 30, path: '/' });
        }
      }

      /**
       * ✅ OMEGA LOOP GUARD:
       * We physically block router.refresh() for TOKEN_REFRESHED events.
       * This prevents the infinite middleware redirect cycle that hits 
       * the 429 rate limit.
       */
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log(`[Aura Identity] State Change: ${event}. Synchronizing Vault...`);
          
          if (event === 'SIGNED_OUT') {
            localStorage.clear();
            Cookies.remove('bbu1_active_business_id');
          }

          router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <Context.Provider value={{ supabase, session }}>
      {children}
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabase must be used inside a SupabaseProvider');
  }
  return context;
};