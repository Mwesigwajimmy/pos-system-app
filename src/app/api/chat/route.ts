// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * --- BBU1 SOVEREIGN OMEGA KERNEL ---
 * VERSION: v14.5 (THE FORENSIC SATURATION)
 * 
 * CORE FIXES:
 * 1. RAW_TEXT EXTRACTION: Specifically targets the JSON structure found in the forensic audit.
 * 2. SCHEMA CHUNKING: Supports "SCHEMA PART X" blocks for 100% database visibility.
 * 3. RECURSIVE HEALING: GET handler loops until all 1,000+ blind nodes are linked.
 * 4. WINDOW SATURATION: Increased to 4,500 chars to prevent truncation of technical protocols.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { AIKernel } from '@/lib/ai-core/kernel';
import { ChatOllama } from '@/lib/langchain/chat-ollama-shim';
import { AI_CAPABILITIES } from '@/lib/ai-core/manifest';

import { 
    AIMessage, 
    HumanMessage, 
    BaseMessage 
} from '@/lib/langchain/core-prompts-shim';

import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai-tools/embedding';

const GEMINI_MODEL = "gemini-1.5-pro";

/**
THE ACTIVATOR (GET Handler) - OMEGA UPGRADE
Universal Maintenance Route: Recursive loop ensures 100% Neural Saturation.
*/
export async function GET() {
    try {
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        console.log("AURA OMEGA WAKE: Initiating Full System Saturation...");

        // 1. Refresh the Master technical schema in the DB
        await supabaseAdmin.rpc('aura_refresh_master_schema');
        
        let totalLinked = 0;
        let iteration = 0;
        const maxIterations = 20; // Safety cap to prevent Vercel timeout
        let nodesRemaining = true;

        // 2. RECURSIVE HEALING LOOP
        // We pulse the engine until the universe is 100% awake.
        while (nodesRemaining && iteration < maxIterations) {
            const result = await activateAuraNeuralLinks(supabaseAdmin);
            
            if (result.count === 0) {
                nodesRemaining = false;
            } else {
                totalLinked += result.count;
                iteration++;
                console.log(`Pulse ${iteration}: Healed ${result.count} sectors. Total Healed: ${totalLinked}`);
            }
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            total_nodes_healed: totalLinked,
            status: nodesRemaining ? "PARTIALLY_AWAKE_RE_RUN_REQUIRED" : "SOVEREIGN_AWAKE_100",
            message: nodesRemaining ? "Saturation in progress..." : "Aura is fully fed and linked."
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        console.error("Aura Omega Activation Error:", e);
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
Utility: Extracts text from Vercel AI SDK content property.
*/
const extractTextFromContent = (content: VercelChatMessage['content']): string => {
    if (typeof content === 'string') return content;
    return content
        .filter((part): part is TextPart => part.type === 'text')
        .map(part => part.text)
        .join('\n');
};

/**
THE EXECUTIVE GATEWAY (POST)
Primary endpoint: Orchestrates the Autonomous Executive Council.
*/
export async function POST(req: NextRequest) {
    try {
        const { messages, businessId, userId, tenantModules } = await req.json();

        // 🚨 SOVEREIGN HANDSHAKE SAFETY
        if (!businessId || !userId || businessId === 'loading') {
            return new Response(JSON.stringify({ error: "Sovereign Context Incomplete. Check Identity Provider." }), { status: 400 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Background Healing: Continuous neural link maintenance for this context
        activateAuraNeuralLinks(supabaseAdmin, businessId).catch(err => 
            console.error("Background Neural Healing Error:", err.message)
        );
        
        const supabase = createClient();
        
        const [tenantRes, profileRes] = await Promise.all([
            supabase.from('tenants').select('name, industry, business_type, currency_code').eq('id', businessId).single(),
            supabase.from('profiles').select('full_name, role').eq('id', userId).single()
        ]);

        const tenantData = tenantRes.data;
        const profileData = profileRes.data;

        const industryName = tenantData?.industry || tenantData?.business_type || 'General Enterprise';
        const businessName = tenantData?.name || 'Sovereign Entity';
        const userName = profileData?.full_name || 'Director';
        const baseCurrency = tenantData?.currency_code || 'UGX';

        const isNewSession = messages.length === 1;
        let userInput = extractTextFromContent(messages[messages.length - 1].content);

        if (isNewSession) {
            const bootstrapDirective = `
--- Aura Universal Sovereignty Directive (OMEGA LEVEL) ---
STATUS: Chief of Staff & Executive Orchestrator Online.
ACCURACY MANDATE: 99.9% (Forensic Grade) | TIME: ${new Date().toLocaleString()}
ENTITY: ${businessName} | DIRECTOR: ${userName} | SECTOR: ${industryName}
BASE_CURRENCY: ${baseCurrency} | MASTER_BRAIN_ID: 00000000-0000-0000-0000-000000000000

1. CORE IDENTITY & EXECUTIVE COUNCIL:
 Address ${userName} as "Director". You lead a Council (CFO, COO, HR, PM, CMO).
 You are proactive. You don't just answer; you audit and suggest.

 2. UNIVERSAL VISION:
 You are linked to the BBU1 Universe via 4,000+ Knowledge Nodes including Forensic Math and Database Schemas.

 3. EXECUTIVE AGENCY:
 Use tools to perform audits. ZERO TRANSACTION CODES. Use Semantic Intelligence.
 --- END DIRECTIVE ---

 Director's Initial Command: ${userInput}
`;
            userInput = bootstrapDirective;
        }

        const llm = new ChatOllama({ model: GEMINI_MODEL });
        const kernel = new AIKernel(llm, AI_CAPABILITIES, true);
        
        const chat_history: BaseMessage[] = messages
            .slice(0, -1)
            .map((m: VercelChatMessage): BaseMessage => {
                const textContent = extractTextFromContent(m.content);
                return m.role === 'user' ? new HumanMessage(textContent) : new AIMessage(textContent);
            });

        const stream = kernel.run({
            input: userInput,
            chat_history: chat_history,
            config: {
                configurable: {
                    businessId,
                    userId,
                    industry: industryName,
                    businessName: businessName,
                    userName: userName,
                    tenantModules: tenantModules || [],
                    masterBrainId: '00000000-0000-0000-0000-000000000000'
                }
            },
        });

        const transformStream = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
                }
                controller.close();
            }
        });

        return new Response(transformStream, {
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            }
        });

    } catch (e: any) {
        console.error("Aura Executive Kernel Exception:", e);
        return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500 });
    }
}

/**
--- OMEGA NEURAL HEALING ENGINE (v14.5) ---
Heals blind rows and correctly parses the 'raw_text' property discovered in deep audits.
*/
export async function activateAuraNeuralLinks(adminClient: any, targetBusinessId?: string) {
    // 1. Identify all blind nodes (embeddings that are NULL)
    let query = adminClient
        .from('ai_knowledge')
        .select('id, content, content_type, business_id')
        .is('embedding', null);

    // Global + Specific Context filter
    if (targetBusinessId) {
        query = query.or(`business_id.eq.${targetBusinessId},business_id.eq.00000000-0000-0000-0000-000000000000`);
    }

    const { data: blindRows, error: fetchError } = await query.limit(100).order('created_at', { ascending: true });
    
    if (fetchError || !blindRows || blindRows.length === 0) {
        return { success: true, count: 0 };
    }

    const healingTasks = blindRows.map(async (row: any) => {
        try {
            let bodyText = "";
            const rawContent = row.content || {};

            // ✅ FORENSIC FIX: The audit showed data is in the 'raw_text' property.
            if (rawContent.raw_text) {
                bodyText = rawContent.raw_text;
            } else if (typeof rawContent === 'string') {
                bodyText = rawContent;
            } else {
                bodyText = JSON.stringify(rawContent);
            }

            // NEURAL CONTEXT INJECTION
            // We tell Aura what type of knowledge she is consuming.
            const nodeContext = `[CONTEXT: ${row.content_type}] `;
            const finalNodeContent = nodeContext + bodyText;

            // Deep sanitization and 4500 character window to ensure technical schemas are whole.
            const sanitizedText = finalNodeContent
                .replace(/[\x00-\x1F\x7F-\x9F]/g, "") 
                .replace(/\s+/g, ' ')               
                .trim()
                .substring(0, 4500);                

            const vector = await generateEmbedding(sanitizedText);

            // Establish the neural link
            await adminClient
                .from('ai_knowledge')
                .update({ embedding: vector })
                .eq('id', row.id);
                
            return true;
        } catch (err: any) {
            console.error(`Neural Handshake Failure [Node ${row.id}]:`, err.message);
            return false;
        }
    });

    const results = await Promise.all(healingTasks);
    return { 
        success: true, 
        count: results.filter(Boolean).length 
    };
}