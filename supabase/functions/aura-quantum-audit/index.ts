// supabase/functions/aura-quantum-audit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- BBU1 AURA QUANTUM EDGE MOTHERBOARD ---
 * VERSION: v25.0 OMEGA-ULTIMATUM (THE DEEP HEADER SEAL)
 * JURISDICTION: Internal Supabase Vault / Forensic Intelligence / Global ERP
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. DEEP HEADER EXPOSURE: Physically anchored 'Access-Control-Expose-Headers'. 
 *    This allows the newly upgraded AI SDK in the browser to "see" the 
 *    'x-vercel-ai-data-stream' header, preventing the protocol crash.
 * 2. VERCEL DATA STREAM v1: Hardened alignment with the AI SDK v3.x protocol. 
 *    Uses 0: (text), 8: (agent metadata), and 3: (system errors).
 * 3. DUAL-CORE CONTEXT INJECTION: Jina AI search results are now physically 
 *    fused into the Llama-3.3 system prompt for 1024-dim elite retrieval.
 * 4. ATOMIC MEMORY SEAL: Multi-layer telemetry ensures every audit is 
 *    physically written to the database before the stream concludes.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bbu1-vault-id',
  'Access-Control-Expose-Headers': 'x-vercel-ai-data-stream', // 🛡️ THE APEX KEY: REVEALS THE PROTOCOL TO THE BROWSER
}

serve(async (req) => {
  // 1. PHYSICAL CORS HANDSHAKE
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const encoder = new TextEncoder();
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await req.json();
    const { messages, businessId, userId, tenantModules } = body;
    
    if (!businessId || !userId) throw new Error("Identity Fragmentation: Missing UUID Anchors.");
    
    const userMessage = messages[messages.length - 1]?.content || "Sovereign Status Check";

    // 2. INITIALIZE SOVEREIGN ROOT CLIENT
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 3. PARALLEL NEURAL INITIALIZATION
    const [handshakeRes, keysRes] = await Promise.all([
      supabaseAdmin.rpc('get_aura_handshake', { p_target_biz_id: businessId, p_user_id: userId }),
      supabaseAdmin.from('aura_system_settings').select('key_name, key_value')
        .in('key_name', ['SAMBANOVA_API_KEY', 'JINA_API_KEY'])
    ]);

    const aura = handshakeRes.data;
    if (handshakeRes.error || !aura?.is_ready) {
       throw new Error(`Neural Link Blocked: ${handshakeRes.error?.message || 'Handshake Expired'}`);
    }

    const sambaKey = keysRes.data?.find(k => k.key_name === 'SAMBANOVA_API_KEY')?.key_value;
    const jinaKey = keysRes.data?.find(k => k.key_name === 'JINA_API_KEY')?.key_value;
    if (!sambaKey || !jinaKey) throw new Error("Brain Failure: AI Keys not seated in vault.");

    // 4. INITIALIZE AUDIT TELEMETRY
    const { data: auditRecord } = await supabaseAdmin.from('aura_forensic_audit').insert({
        business_id: businessId, user_id: userId, agent_role: 'EXECUTIVE_AUDITOR',
        action_taken: 'NEURAL_INGESTION',
        raw_input: { query: userMessage, requestId, modules: tenantModules },
        neural_status: 'SEARCHING', created_at: new Date().toISOString()
    }).select('id').single();

    // 5. SMARTER DEEP CONTEXT RETRIEVAL (JINA AI RECURSIVE)
    let forensicContext = "";
    let agentSteps = [
        { event: 'on_agent_action', tool: 'Handshake', data: { status: 'IDENTITY_SEALED', node: businessId.substring(0,8) } }
    ];
    
    try {
        const searchQuery = messages.slice(-3).map((m: any) => m.content).join(" ");
        const searchResponse = await fetch("https://api.jina.ai/v1/rerank", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jinaKey}` },
            body: JSON.stringify({
                model: "jina-reranker-v2-base-multilingual",
                query: searchQuery,
                documents: [
                    `Business: ${aura.businessName}, Industry: ${aura.industry}`,
                    `Active Modules: ${tenantModules?.join(', ') || 'Global ERP'}`,
                    `Vault ID: ${businessId}`,
                    `Director Level Clearance: Active Forensic Monitoring`
                ]
            })
        });
        const searchData = await searchResponse.json();
        forensicContext = JSON.stringify(searchData.results || []);
        
        agentSteps.push({
            event: 'on_agent_action', tool: 'Jina_Forensic_Search',
            data: { status: 'Context_Verified', records: searchData.results?.length }
        });
    } catch (e) { console.warn("[AURA] Jina Eye Latency."); }

    // 6. APEX NEURAL STREAM (SAMBANOVA + OMEGA WELD)
    const stream = new ReadableStream({
      async start(controller) {
        // Enqueue Metadata Chunk (8: prefix)
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
                    content: `Aura Mission Control. Protocol: v25.0 OMEGA. 
                    Entity: ${aura.businessName}. Industry: ${aura.industry}. Context: ${forensicContext}. 
                    Objective: Provide Director-level strategic directives. Be precise, technical, and elite.` 
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
                            // ✅ DATA STREAM v1: Text prefixed with '0:' and JSON stringified
                            controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
                        }
                    } catch (e) { }
                }
            }
          }

          // Step 7: Atomic Memory Close
          if (auditRecord?.id) {
            await supabaseAdmin.from('aura_forensic_audit').update({
                forensic_output: { response: fullResponse, version: 'v25.0_OMEGA' },
                neural_status: 'COMPLETED'
            }).eq('id', auditRecord.id);
          }

        } catch (err) {
          // Send Error Chunk (3: prefix)
          controller.enqueue(encoder.encode(`3:${JSON.stringify(err.message)}\n`));
        } finally {
          controller.close();
        }
      }
    });

    // 🛡️ THE FINAL PROTOCOL SEAL: Explicit Headers for Browser SDK v3+
    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/plain; charset=utf-8', 
        'x-vercel-ai-data-stream': 'v1', // THE PROTOCOL VERSION
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error("[CRITICAL BRAIN CRASH]", error.message);
    return new Response(`3:${JSON.stringify(error.message)}\n`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'x-vercel-ai-data-stream': 'v1' }
    });
  }
})