// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

/**
 * --- BBU1 SOVEREIGN BROWSER CLIENT ---
 * VERSION: v18.5 OMEGA (THE SESSION ANCHOR)
 * 
 * CORE FIXES:
 * 1. PERSISTENCE WELD: Explicitly enabled session persistence to 
 *    solve the "No Access Token found" error in browser storage.
 * 2. AUTO-REFRESH: Configured for high-speed AI interactions to prevent 
 *    JWT expiry during long Aura sessions.
 * 3. COOKIE SYNC: Ensures Auth state is authoritatively shared between 
 *    the Client and the Next.js Server.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,       // ✅ PHYSICALLY ANCHORS TOKEN IN BROWSER
        autoRefreshToken: true,    // ✅ PREVENTS AURA FROM "TIMING OUT"
        detectSessionInUrl: true   // ✅ ENSURES CALLBACKS SYNC IMMEDIATELY
      },
      global: {
        headers: {
          'x-bbu1-client': 'sovereign-omega-v18'
        }
      }
    }
  )
}