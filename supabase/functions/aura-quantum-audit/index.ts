// supabase/functions/aura-quantum-audit/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4"

/**
 * --- BBU1 AURA QUANTUM EDGE MOTHERBOARD ---
 * VERSION: v28.1 OMEGA-ULTIMATUM (UI MESSAGE STREAM PROTOCOL — VERIFIED)
 *
 * Wire format and every chunk shape below verified directly against the
 * installed ai@6.0.190 source (node_modules/ai/dist/index.js):
 *  - uiMessageChunkSchema (line ~5235): exact chunk field names/types
 *  - process-ui-message-stream switch (line ~5589): exact chunk handling
 *  - JsonToSseTransformStream (line ~5160): `data: ${JSON.stringify(part)}\n`
 *    per frame, `data: [DONE]\n\n` to close
 *  - UI_MESSAGE_STREAM_HEADERS (line ~5177): exact required headers
 *
 * Identity resolution, Jina reranking, and the SambaNova call are
 * unchanged from the prior version — only the streamed wire format
 * changed, since the old `0:`/`8:` prefixed frames belonged to an
 * older AI SDK version not used by the currently installed package.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bbu1-vault-id, x-bbu1-director-id, x-bbu1-path',
  'Access-Control-Expose-Headers': 'x-vercel-ai-ui-message-stream',
}

/** Verified against UI_MESSAGE_STREAM_HEADERS in node_modules/ai/dist/index.js */
const streamHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'x-vercel-ai-ui-message-stream': 'v1',
  'x-accel-buffering': 'no',
};

/** Reads text content from either a v5 UIMessage (.parts) or the old {role, content} shape. */
function extractText(message: any): string {
  if (!message) return "";
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  }
  return "";
}

/** Matches JsonToSseTransformStream's exact frame format: `data: ${JSON}\n` */
function sseFrame(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const encoder = new TextEncoder();

  try {
    const body = await req.json();
    const { messages, businessId, userId } = body;

    if (!businessId || businessId === '' || businessId === 'loading') {
       throw new Error("Neural Link Blocked: Node Identity (Business ID) is physically unanchored.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const [tenantRes, modulesRes, keysRes, handshakeRes] = await Promise.all([
      supabaseAdmin.from('tenants').select('name, business_type, country, currency, setup_complete').eq('id', businessId).single(),
      supabaseAdmin.from('tenant_modules').select('module_name').eq('tenant_id', businessId).eq('is_active', true),
      supabaseAdmin.from('aura_system_settings').select('key_name, key_value').in('key_name', ['SAMBANOVA_API_KEY', 'JINA_API_KEY']),
      supabaseAdmin.rpc('get_aura_handshake', { p_target_biz_id: businessId, p_user_id: userId })
    ]);

    if (tenantRes.error || !tenantRes.data) {
        throw new Error(`Vault Access Denied: Metadata for Node ${businessId} could not be resolved.`);
    }

    const t = tenantRes.data;
    const activeModules = modulesRes.data?.map(m => m.module_name) || [];
    const auraHandshake = handshakeRes.data || {};

    const verifiedName = t.name || auraHandshake.businessName || "Sovereign Entity";
    const verifiedSector = t.business_type || auraHandshake.industry || "General Enterprise";
    const verifiedCountry = t.country || "Global";
    const verifiedDirector = auraHandshake.userName || "Authorized Director";

    const sambaKey = keysRes.data?.find(k => k.key_name === 'SAMBANOVA_API_KEY')?.key_value;
    const jinaKey = keysRes.data?.find(k => k.key_name === 'JINA_API_KEY')?.key_value;

    if (!sambaKey || !jinaKey) throw new Error("Neural Core Failure: AI Keys not seated in system settings.");

    const lastQuery = extractText(messages[messages.length - 1]);

    const { data: auditRecord } = await supabaseAdmin.from('aura_forensic_audit').insert({
        business_id: businessId,
        user_id: userId,
        agent_role: 'EXECUTIVE_AUDITOR',
        action_taken: 'IDENTITY_SEALED',
        raw_input: {
            query: lastQuery,
            tenant_meta: { name: verifiedName, country: verifiedCountry, sector: verifiedSector }
        },
        neural_status: 'SEARCHING',
        created_at: new Date().toISOString()
    }).select('id').single();

    let forensicContext = "";
    let agentSteps = [
        {
          event: 'on_agent_action',
          tool: 'Omniscient_Identity_Scan',
          data: { status: 'FULLY_SEALED', node: businessId, entity: verifiedName, industry: verifiedSector }
        }
    ];

    try {
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

    // 🔁 Convert v5 UIMessage[] -> simple {role, content} for the
    // SambaNova/OpenAI-compatible chat completions payload.
    const simpleHistory = (messages || []).map((m: any) => ({
      role: m.role,
      content: extractText(m),
    }));

    const stream = new ReadableStream({
      async start(controller) {
        // --- verified against uiMessageChunkSchema ---
        controller.enqueue(encoder.encode(sseFrame({ type: 'start' })));
        controller.enqueue(encoder.encode(sseFrame({ type: 'start-step' })));

        // Agent action steps -> custom data parts. Schema requires
        // type to start with "data-"; `data` field is unknown/any.
        for (const step of agentSteps) {
          controller.enqueue(encoder.encode(sseFrame({ type: 'data-agentStep', data: step })));
        }

        const textId = crypto.randomUUID();
        // Schema: { type: "text-start", id: string }
        controller.enqueue(encoder.encode(sseFrame({ type: 'text-start', id: textId })));

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
                ...simpleHistory
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
                            // Schema: { type: "text-delta", id: string, delta: string }
                            controller.enqueue(encoder.encode(sseFrame({ type: 'text-delta', id: textId, delta: content })));
                        }
                    } catch (e) { }
                }
            }
          }

          // Schema: { type: "text-end", id: string }
          controller.enqueue(encoder.encode(sseFrame({ type: 'text-end', id: textId })));
          controller.enqueue(encoder.encode(sseFrame({ type: 'finish-step' })));
          controller.enqueue(encoder.encode(sseFrame({ type: 'finish' })));

          if (auditRecord?.id) {
            await supabaseAdmin.from('aura_forensic_audit').update({
                forensic_output: { response: fullResponse, node_version: 'v28.1_UI_MESSAGE_STREAM' },
                neural_status: 'COMPLETED'
            }).eq('id', auditRecord.id);
          }

        } catch (err) {
          // Schema: { type: "error", errorText: string }
          controller.enqueue(encoder.encode(sseFrame({ type: 'error', errorText: err.message })));
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: streamHeaders });

  } catch (error) {
    console.error("[CRITICAL MOTHERBOARD CRASH]", error.message);
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseFrame({ type: 'error', errorText: error.message })));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    return new Response(errorStream, { headers: streamHeaders });
  }
})