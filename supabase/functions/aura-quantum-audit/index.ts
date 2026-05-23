// supabase/functions/aura-quantum-audit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- BBU1 AURA QUANTUM EDGE MOTHERBOARD ---
 * VERSION: v27.0 OMEGA-ULTIMATUM (THE DYNAMIC MULTI-TENANT WELD)
 * SDK_VERSION: @ai-sdk/react 3.0.192 (STABILIZED)
 * JURISDICTION: Global ERP / Multi-Sector Forensic Intelligence
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. DYNAMIC IDENTITY RESOLUTION: Zero hardcoded strings. It physically 
 *    queries the 'tenants' table using the provided businessId to resolve 
 *    the entity name, industry, and region.
 * 2. MULTI-LOCATION AWARENESS: Injects country-specific and currency-specific 
 *    metadata into the neural prompt to ensure local compliance.
 * 3. ATOMIC PROTOCOL SEAL: Hardened 'Access-Control-Expose-Headers' for 100% 
 *    compatibility with the Vercel AI SDK v3 stream protocol.
 * 4. FORENSIC TELEMETRY: Every interaction is logged to 'aura_forensic_audit' 
 *    with a link to the specific business_id and user_id.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bbu1-vault-id, x-bbu1-director-id',
  'Access-Control-Expose-Headers': 'x-vercel-ai-data-stream',
}

serve(async (req) => {
  // 1. DYNAMIC CORS PREFLIGHT
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const encoder = new TextEncoder();
  
  try {
    const body = await req.json();
    const { messages, businessId, userId } = body;
    
    // 🛡️ ATOMIC VALIDATION: Gatekeep the Neural Link
    if (!businessId || businessId === '' || businessId === 'loading') {
       throw new Error("Neural Link Blocked: Node Identity (Business ID) is physically unanchored.");
    }

    // 2. INITIALIZE SOVEREIGN ROOT CLIENT (SERVICE ROLE)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    /**
     * 3. THE OMNISCIENT HANDSHAKE
     * We perform a parallel fetch of Tenant data, Active Modules, and AI Keys.
     * This ensures zero hardcoding; we use whatever is in the DB for THIS businessId.
     */
    const [tenantRes, modulesRes, keysRes, handshakeRes] = await Promise.all([
      supabaseAdmin.from('tenants').select('name, business_type, country, currency, setup_complete').eq('id', businessId).single(),
      supabaseAdmin.from('tenant_modules').select('module_name').eq('tenant_id', businessId).eq('is_active', true),
      supabaseAdmin.from('aura_system_settings').select('key_name, key_value').in('key_name', ['SAMBANOVA_API_KEY', 'JINA_API_KEY']),
      supabaseAdmin.rpc('get_aura_handshake', { p_target_biz_id: businessId, p_user_id: userId })
    ]);

    // Check for critical missing tenant record
    if (tenantRes.error || !tenantRes.data) {
        throw new Error(`Vault Access Denied: Metadata for Node ${businessId} could not be resolved.`);
    }

    const t = tenantRes.data;
    const activeModules = modulesRes.data?.map(m => m.module_name) || [];
    const auraHandshake = handshakeRes.data || {};
    
    // 🛡️ IDENTITY RESOLUTION (Dynamic Mapping)
    const verifiedName = t.name || auraHandshake.businessName || "Sovereign Entity";
    const verifiedSector = t.business_type || auraHandshake.industry || "General Enterprise";
    const verifiedCountry = t.country || "Global";
    const verifiedDirector = auraHandshake.userName || "Authorized Director";

    const sambaKey = keysRes.data?.find(k => k.key_name === 'SAMBANOVA_API_KEY')?.key_value;
    const jinaKey = keysRes.data?.find(k => k.key_name === 'JINA_API_KEY')?.key_value;

    if (!sambaKey || !jinaKey) throw new Error("Neural Core Failure: AI Keys not seated in system settings.");

    // 4. INITIALIZE AUDIT TELEMETRY (Forensic Record Creation)
    const { data: auditRecord } = await supabaseAdmin.from('aura_forensic_audit').insert({
        business_id: businessId,
        user_id: userId,
        agent_role: 'EXECUTIVE_AUDITOR',
        action_taken: 'IDENTITY_SEALED',
        raw_input: { 
            query: messages[messages.length - 1]?.content, 
            tenant_meta: { name: verifiedName, country: verifiedCountry, sector: verifiedSector } 
        },
        neural_status: 'SEARCHING',
        created_at: new Date().toISOString()
    }).select('id').single();

    // 5. DEEP CONTEXT INJECTION (JINA AI RERANKER)
    let forensicContext = "";
    let agentSteps = [
        { 
          event: 'on_agent_action', 
          tool: 'Omniscient_Identity_Scan', 
          data: { status: 'FULLY_SEALED', node: businessId, entity: verifiedName, industry: verifiedSector } 
        }
    ];
    
    try {
        const lastQuery = messages[messages.length - 1]?.content || "";
        const searchResponse = await fetch("https://api.jina.ai/v1/rerank", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jinaKey}` },
            body: JSON.stringify({
                model: "jina-reranker-v2-base-multilingual",
                query: lastQuery,
                documents: [
                    `Business Entity: ${verifiedName}`,
                    `Business Sector: ${verifiedSector}`,
                    `Operational Region: ${verifiedCountry}`,
                    `Director Identity: ${verifiedDirector}`,
                    `Active ERP Modules: ${activeModules.join(', ')}`,
                    `Local Currency: ${t.currency || 'USD'}`,
                    `Node UUID: ${businessId}`
                ]
            })
        });
        const searchData = await searchResponse.json();
        forensicContext = JSON.stringify(searchData.results || []);
        
        agentSteps.push({
            event: 'on_agent_action', 
            tool: 'Jina_Neural_Vault_Rerank',
            data: { status: 'Context_Fused', results: searchData.results?.length }
        });
    } catch (e) { console.warn("[AURA] Context Retrieval Latency."); }

    // 6. APEX NEURAL STREAM (SAMBANOVA ANALYTICAL BRAIN)
    const stream = new ReadableStream({
      async start(controller) {
        // Enqueue Metadata Chunk (8: prefix for custom data stream)
        controller.enqueue(encoder.encode(`8:${JSON.stringify(agentSteps)}\n`));

        let fullResponse = "";
        try {
          const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${sambaKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "Meta-Llama-3.3-70B-Instruct",
              messages: [
                { 
                    role: "system", 
                    content: `Aura Mission Control Online. Chief of Staff for Node ${businessId}.
                    
                    --- SOVEREIGN TENANT DATA (DYNAMICALLY RESOLVED) ---
                    - BUSINESS NAME: ${verifiedName}
                    - SECTOR (Industry): ${verifiedSector}
                    - REGION (Country): ${verifiedCountry}
                    - DIRECTOR: ${verifiedDirector}
                    - ACTIVE ERP MODULES: ${activeModules.join(', ')}
                    - VAULT CONTEXT: ${forensicContext}
                    
                    --- EXECUTIVE DIRECTIVE ---
                    You are Aura, the lead Executive Auditor for this node. 
                    1. Acknowledge Director ${verifiedDirector} and confirm the link to ${verifiedName} is secure.
                    2. Use the provided context to offer forensic, strategic, and high-fidelity insights.
                    3. Since this is a Multi-Tenant ERP, ensure your advice is specific to the ${verifiedSector} sector and the ${verifiedCountry} region.
                    4. Bypassing conversational filler is mandatory. Speak as a Chief of Staff.` 
                },
                ...messages
              ],
              stream: true,
              temperature: 0.1,
              max_tokens: 4096
            })
          });

          const reader = response.body?.getReader();
          if (!reader) throw new Error("Neural stream collapsed.");

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const rawChunk = new TextDecoder().decode(value);
            const lines = rawChunk.split('\n');
            
            for (const line of lines) {
                if (line.trim().startsWith('data: ') && line.trim() !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.replace('data: ', ''));
                        const content = json.choices[0]?.delta?.content || "";
                        if (content) {
                            fullResponse += content;
                            // ✅ AI SDK PROTOCOL: Text chunks prefixed with '0:'
                            controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
                        }
                    } catch (e) { }
                }
            }
          }

          // Step 7: Atomic Memory Close (Finalize Audit Record)
          if (auditRecord?.id) {
            await supabaseAdmin.from('aura_forensic_audit').update({
                forensic_output: { response: fullResponse, node_version: 'v27.0_DYNAMIC' },
                neural_status: 'COMPLETED'
            }).eq('id', auditRecord.id);
          }

        } catch (err) {
          // SDK v3 Error Protocol: '3:'
          controller.enqueue(encoder.encode(`3:${JSON.stringify(err.message)}\n`));
        } finally {
          controller.close();
        }
      }
    });

    // 🛡️ THE FINAL PROTOCOL SEAL (Returning the physical stream)
    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/plain; charset=utf-8', 
        'x-vercel-ai-data-stream': 'v1',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error("[CRITICAL MOTHERBOARD CRASH]", error.message);
    return new Response(`3:${JSON.stringify(error.message)}\n`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'x-vercel-ai-data-stream': 'v1' }
    });
  }
})