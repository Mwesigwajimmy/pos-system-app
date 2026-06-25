import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * --- BBU1 SOVEREIGN GLOBAL GATEKEEPER ---
 * VERSION: v32.5 OMEGA-ULTIMATUM (ARMED)
 * ARCHITECTURE: Multi-Country / Unblockable Edge Tunnel
 * 
 * CORE SECURITY:
 * 1. BOT CLOAKING: Returns 404 to non-browser/suspicious traffic.
 * 2. SECRET VAULT: Verifies internal keys using Deno Environment Secrets.
 * 3. NEURAL LINK: Tunnels data from restricted regions to Stockholm.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sovereign-signature',
}

serve(async (req) => {
  // 1. SILENT HANDSHAKE (CORS Camouflage)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. APEX FORENSIC SCAN (Detects Hackers, Crawlers, and Bots)
    const userAgent = req.headers.get('user-agent') || '';
    const cfIp = req.headers.get('cf-connecting-ip') || '0.0.0.0';
    const cfRegion = req.headers.get('cf-ipcountry') || 'Unknown';
    
    // BOT & CRAWLER CLOAKING: If traffic is suspicious, return 404 (Not Found).
    // This makes fishers believe the Sovereign Node doesn't exist.
    const isThreat = /bot|spider|crawl|headless|puppeteer|selenium|postman|curl|python|wget/i.test(userAgent) || !userAgent;
    
    if (isThreat) {
      console.warn(`[INTERCEPTED]: Unauthorized probe from ${cfRegion} (${cfIp}). Cloaking node.`);
      return new Response(null, { status: 404 }); 
    }

    // 3. HARDENED CONNECTION TO SWEDEN (Stockholm Primary Vault)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: req.headers.get('Authorization')! } }
      }
    )

    // 4. IDENTITY HANDSHAKE (Deep Authentication)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Neural Link Terminated. Identity Desync." }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5. UNBLOCKABLE TUNNEL LOGIC
    const { action, payload, internalKey } = await req.json();

    // ✅ APEX FIX: Verify the internal system key against the SECURE VAULT
    // This prevents fishers from guessing the key because it's no longer in the code.
    if (internalKey !== Deno.env.get('INTERNAL_SYSTEM_KEY')) {
       console.error(`[SECURITY ALERT]: Invalid Omega Protocol attempt by ${user.email}`);
       return new Response(null, { status: 404 }); // Cloak the error
    }

    console.log(`[SOVEREIGN NODE]: Secure tunnel active for ${user.email} from ${cfRegion}`);

    let result;

    // This switch processes logic at the Edge to bypass regional database throttling
    switch (action) {
      case 'SECURE_SYNC':
        // Safe forwarding to the primary database in Sweden
        const { data, error } = await supabaseClient
          .from('sovereign_audit_anomalies')
          .insert({ ...payload, business_id: user.user_metadata.business_id })
          .select();
        result = { data, error };
        break;

      case 'REGIONAL_HEARTBEAT':
        result = { 
            status: "OPERATIONAL", 
            node: "EDGE_ALPHA", 
            region: cfRegion,
            identity: "VERIFIED" 
        };
        break;

      default:
        result = { status: "CONNECTED", timestamp: new Date().toISOString() };
    }

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json', 
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'
      },
      status: 200,
    })

  } catch (error) {
    console.error(`[FORENSIC ERROR]: ${error.message}`);
    // Generic response to hide architecture details from external probes
    return new Response(JSON.stringify({ error: "Signal interference detected." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})