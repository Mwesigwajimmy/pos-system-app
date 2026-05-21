'use client';

/**
 * --- BBU1 SOVEREIGN SUPABASE PROVIDER ---
 * VERSION: v18.0 OMEGA (THE LOOP-FREE SEAL)
 * JURISDICTION: Root Identity Hydration
 * 
 * CORE UPGRADES:
 * 1. 429 RATE-LIMIT SHIELD: Removed 'TOKEN_REFRESHED' from the router.refresh() 
 *    trigger. This stops the app from hammering the Auth server and physically 
 *    eliminates the "Request rate limit reached" error.
 * 2. IDENTITY PERSISTENCE: Ensures the session is only refreshed when the 
 *    Director physically enters or exits the vault.
 * 3. NEXT.JS 15 SYNC: Optimized for React 19 concurrent rendering.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

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
       * ✅ OMEGA LOOP GUARD:
       * We physically block router.refresh() for TOKEN_REFRESHED events.
       * This prevents the infinite middleware redirect cycle that hits 
       * the 429 rate limit.
       */
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log(`[Aura Identity] State Change: ${event}. Synchronizing Vault...`);
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