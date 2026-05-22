'use client';

/**
 * --- BBU1 SOVEREIGN SUPABASE PROVIDER ---
 * VERSION: v21.0 OMEGA (THE PHYSICAL STORAGE WELD)
 * JURISDICTION: Root Identity Hydration / Hardware Anchoring
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. PHYSICAL STORAGE VERIFICATION: Logic now verifies the existence of the 
 *    browser's LocalStorage engine before attempting the identity write.
 * 2. INITIAL HYDRATION WELD: Performs a forensic check on mount to move 
 *    latent cookie sessions into the physical disk immediately. This 
 *    eliminates the "AI Blindness" during the first 2 seconds of load.
 * 3. DUAL-STORAGE SYNCHRONIZATION: Maps the chunked SSR session into a 
 *    unified JSON string for the Aura assistant's neural links.
 * 4. LOOP-SHIELD v2: Blocks redundant refreshes during token rotation 
 *    to preserve the 429 Rate Limit quota.
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
  
  // Project Reference detected from Forensic Audit
  const projectRef = "oezlqscjymzoeizysljp"; 
  const storageKey = `sb-${projectRef}-auth-token`;

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  useEffect(() => {
    /**
     * 🛡️ FORENSIC INITIALIZATION
     * We check if the session exists in the browser's physical storage.
     * If cookies are present but LocalStorage is empty (Incognito/New Tab),
     * we force a physical write to wake up the Aura AI.
     */
    const materializeSession = async () => {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        
        if (activeSession && typeof window !== 'undefined') {
            console.log("%c[AURA] Physical Storage Weld: Active.", "color: #10B981; font-weight: bold;");
            localStorage.setItem(storageKey, JSON.stringify(activeSession));
        }
    };

    materializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      
      /**
       * ✅ THE ATOMIC DISK WRITE
       * Every time the identity state changes, we etch the new 
       * session into the hardware's local storage.
       */
      if (currentSession) {
        localStorage.setItem(storageKey, JSON.stringify(currentSession));

        // Align the Business ID Cookie for Server-Side Forensic Views
        const bizId = currentSession.user.user_metadata?.business_id || currentSession.user.id;
        if (bizId) {
          Cookies.set('bbu1_active_business_id', bizId, { expires: 30, path: '/' });
        }
      }

      /**
       * ✅ OMEGA LOOP GUARD
       */
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log(`%c[AURA] Identity Event: ${event}. Synchronizing Vault...`, "color: #1D4ED8;");
          
          if (event === 'SIGNED_OUT') {
            localStorage.removeItem(storageKey); // Physical wipe
            Cookies.remove('bbu1_active_business_id');
          }

          router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, storageKey]);

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