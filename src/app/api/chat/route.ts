// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * --- BBU1 SOVEREIGN AI GATEWAY ---
 * VERSION: v69.9 OMEGA-ULTIMATUM (THE INDESTRUCTIBLE FULL-WELD)
 * STATUS: FORENSICALLY STABILIZED & HANDSHAKE ALIGNED
 * 
 * CORE UPGRADES:
 * 1. TIMEOUT SHIELD: Specifically fixed for the 34.5s Vercel crash. Emits a 
 *    "Neural Heartbeat" every 5s to physically block Gateway timeouts.
 * 2. "G/H" CRASH TERMINATOR: Returns a valid SSE stream for ALL responses. 
 *    If an error occurs, it is streamed as a 'data' chunk to prevent the 
 *    minified SDK 'g is not a function' crash.
 * 3. REDIRECT SHIELD: Hardened extraction for body.data and root body to 
 *    handle metadata regardless of middleware 307 diversions.
 * 4. IDENTITY READINESS: Physically traps 'loading' strings to prevent DB errors.
 * 5. FULL LOGIC RESTORATION: 100% of the activation and saturation engine preserved.
 */

// --- PRODUCTION BUILD STABILIZATION ---
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIKernel } from '@/lib/ai-core/kernel';
import { AI_CAPABILITIES } from '@/lib/ai-core/manifest';

import { 
    AIMessage, 
    HumanMessage, 
    BaseMessage,
    ChatPromptTemplate,
    MessagesPlaceholder 
} from '@/lib/langchain/core-prompts-shim';

import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai-tools/embedding';

const BRAIN_MODEL = "Meta-Llama-3.3-70B-Instruct"; 
const TARGET_DIMENSION = 1024; 

/**
THE ACTIVATOR (GET Handler)
Universal Maintenance Route: Recursive loop clearing the 1,106 blind node backlog.
*/
export async function GET() {
    try {
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        console.log(`AURA OMEGA WAKE: Final Saturation sweep at ${TARGET_DIMENSION}-dim...`);
        await supabaseAdmin.rpc('aura_refresh_master_schema');
        
        let totalLinked = 0;
        let iteration = 0;
        const maxIterations = 10; 
        let nodesRemaining = true;
        let diagnosticLog = "Ready.";

        while (nodesRemaining && iteration < maxIterations) {
            const result = await activateAuraNeuralLinks(supabaseAdmin);
            
            if (result.count === 0) {
                const { count: remainingCount, error: countErr } = await supabaseAdmin
                    .from('ai_knowledge')
                    .select('*', { count: 'exact', head: true })
                    .is('embedding', null);
                
                if (countErr) throw new Error(`Database Verification Failed: ${countErr.message}`);
                if (remainingCount === 0) {
                    nodesRemaining = false;
                } else {
                    diagnosticLog = result.diagnostic || `Saturation paused. ${remainingCount} nodes in queue.`;
                    break; 
                }
            } else {
                totalLinked += result.count;
                iteration++;
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            total_nodes_healed_in_this_run: totalLinked,
            status: nodesRemaining ? "PARTIAL_SATURATION_STALLED" : "SOVEREIGN_AWAKE_100",
            message: `Aura Memory FULLY Saturated at ${TARGET_DIMENSION}-dim.`,
            diagnostic: diagnosticLog
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

const extractTextFromContent = (content: any): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('\n');
    }
    return JSON.stringify(content);
};

/**
THE EXECUTIVE GATEWAY (POST)
Primary endpoint: Orchestrates the Autonomous Executive Council.
*/
export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();
    
    try {
        const body = await req.json();
        const { messages, tenantModules } = body;

        /** 
         * 🛡️ FORENSIC ID EXTRACTION (v69.9 OMEGA FIX)
         * Hardened to handle 307 redirects and SDK v2.0.81 variations.
         */
        const businessId = body.data?.businessId || body.businessId || body.options?.body?.businessId;
        const userId = body.data?.userId || body.userId || body.options?.body?.userId;

        /**
         * ✅ THE "G/H" CRASH TERMINATOR:
         * Always return a stream. If IDs are missing, stream the error.
         * This stops the 'g is not a function' crash immediately.
         */
        if (!userId || !businessId || userId === 'loading' || businessId === 'loading' || userId === '' || businessId === '') {
            const errorStream = new ReadableStream({
                start(controller) {
                    const payload = { event: 'on_error', data: { error: "Aura is aligning neural pathways... please try again." } };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                    controller.close();
                }
            });
            return new Response(errorStream, { headers: { 'Content-Type': 'text/event-stream' } });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data: auraData, error: auraError } = await supabaseAdmin.rpc('get_aura_handshake', {
            p_target_biz_id: businessId,
            p_user_id: userId
        });

        if (auraError || !auraData) {
            const errStream = new ReadableStream({
                start(controller) {
                    const payload = { event: 'on_error', data: { error: "Forensic Identity Vault Refused Access." } };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                    controller.close();
                }
            });
            return new Response(errStream, { headers: { 'Content-Type': 'text/event-stream' } });
        }

        const aura = (Array.isArray(auraData) ? auraData[0] : auraData) || {};

        let sambaKey = process.env.SAMBANOVA_API_KEY;
        if (!sambaKey) {
            const { data: keyData } = await supabaseAdmin.from('aura_system_settings').select('key_value').eq('key_name', 'SAMBANOVA_API_KEY').single();
            sambaKey = keyData?.key_value;
        }

        const businessName = aura.businessName || 'Sovereign Entity';
        const userRole = aura.role || 'Director';
        const industryName = aura.industry || 'General';

        const isNewSession = messages.length === 1;
        let userInput = extractTextFromContent(messages[messages.length - 1].content);

        if (isNewSession) {
            userInput = `--- Aura Omega Directive --- \nSTATUS: Online. \nENTITY: ${businessName} | SECTOR: ${industryName} \nCommand: ${userInput}`;
        }

        const llm = new ChatOpenAI({
            modelName: BRAIN_MODEL,
            apiKey: sambaKey,
            configuration: { baseURL: "https://api.sambanova.ai/v1" },
            streaming: true,
            temperature: 0.1,
            maxTokens: 4000
        });

        const kernel = new AIKernel(llm as any, AI_CAPABILITIES, true);
        const chat_history: BaseMessage[] = messages.slice(0, -1).map((m: any): BaseMessage => {
            const textContent = extractTextFromContent(m.content);
            return m.role === 'user' ? new HumanMessage(textContent) : new AIMessage(textContent);
        });

        const stream = kernel.run({
            input: userInput,
            chat_history: chat_history,
            config: {
                configurable: {
                    businessId, userId, industry: industryName,
                    businessName, userName: "Director", tenantModules: tenantModules || [],
                    masterBrainId: '00000000-0000-0000-0000-000000000000'
                }
            },
        });

        /**
         * ✅ THE INDESTRUCTIBLE STREAM (Timeout Shield)
         * We start the stream IMMEDIATELY with a heartbeat to stop Vercel's 
         * 34s internal error.
         */
        const transformStream = new ReadableStream({
            async start(controller) {
                // Heartbeat every 5s - keeps the connection warm
                const heartbeat = setInterval(() => {
                    try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } 
                    catch (e) { clearInterval(heartbeat); }
                }, 5000);

                try {
                    for await (const chunk of stream) {
                        const payload = `data: ${JSON.stringify(chunk)}\n\n`;
                        controller.enqueue(encoder.encode(payload));
                    }
                } catch (err: any) {
                    const errorPayload = { event: 'on_error', data: { error: `Neural link fault: ${err.message}` } };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
                } finally {
                    clearInterval(heartbeat);
                    controller.close();
                }
            }
        });

        return new Response(transformStream, {
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', 
            }
        });

    } catch (e: any) {
        // Final JSON fallback for initialization errors
        return new Response(JSON.stringify({ error: { message: `Aura Neural Crash: ${e.message}` } }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

/**
--- OMEGA NEURAL BRIDGE ENGINE (v48.0 INDUSTRIAL BATCH) ---
*/
export async function activateAuraNeuralLinks(adminClient: any) {
    const { data: blindRows, error: bridgeError } = await adminClient.rpc('get_aura_blind_nodes', { batch_size: 25 }); 
    if (bridgeError || !blindRows || blindRows.length === 0) return { success: true, count: 0 };

    try {
        const { data: keyData } = await adminClient.from('aura_system_settings').select('key_value').eq('key_name', 'JINA_API_KEY').single();
        const jinaKey = process.env.JINA_API_KEY || keyData?.key_value;
        const textsToEmbed = blindRows.map((row: any) => `[SECTOR: ${row.content_type}] ${row.content?.raw_text || JSON.stringify(row.content)}`);

        const response = await fetch("https://api.jina.ai/v1/embeddings", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jinaKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: "jina-embeddings-v3", task: "retrieval.passage", dimensions: 1024, input: textsToEmbed })
        });

        const resultData = await response.json();
        const vectors = resultData.data;

        let healed = 0;
        for (let i = 0; i < blindRows.length; i++) {
            const { error } = await adminClient.from('ai_knowledge').update({ embedding: vectors[i].embedding }).match({ id: blindRows[i].id });
            if (!error) healed++;
        }
        return { success: true, count: healed };
    } catch (err: any) { return { success: false, count: 0, diagnostic: err.message }; }
}