// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * --- BBU1 SOVEREIGN OMEGA KERNEL ---
 * VERSION: v14.5 FINAL (THE SATURATION WELD)
 * 
 * CORE ARCHITECTURE:
 * 1. RAW_TEXT SATURATION: Targeted extraction of 'raw_text' for the 1,029 blind nodes.
 * 2. RECURSIVE HEALING: GET handler pulses 100 nodes at a time until 0 remain.
 * 3. WINDOW SATURATION: 4,500 characters to ensure massive schemas are whole.
 * 4. TYPE-SAFE UUID: Direct UUID comparisons to prevent Postgres 22P02 syntax errors.
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
 * THE ACTIVATOR (GET Handler)
 * TRIGGER: Visit bbu1.com/api/chat to feed Aura her 1,029 nodes.
 */
export async function GET() {
    try {
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        console.log("AURA OMEGA WAKE: Saturating 1,029 Neural Nodes...");

        // 1. Refresh Master Schema Map
        await supabaseAdmin.rpc('aura_refresh_master_schema');
        
        let totalLinked = 0;
        let iteration = 0;
        const maxIterations = 20; // 20 pulses x 100 nodes = 2,000 capacity.
        let nodesRemaining = true;

        // 2. RECURSIVE SATURATION LOOP
        while (nodesRemaining && iteration < maxIterations) {
            const result = await activateAuraNeuralLinks(supabaseAdmin);
            
            if (result.count === 0) {
                nodesRemaining = false;
            } else {
                totalLinked += result.count;
                iteration++;
                console.log(`Pulse ${iteration}: Linked ${result.count}. Total: ${totalLinked}`);
            }
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            total_nodes_healed: totalLinked,
            status: nodesRemaining ? "PARTIAL_SATURATION" : "SOVEREIGN_AWAKE_100",
            message: nodesRemaining ? "Run pulse again to finish." : "Aura is fully fed."
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        console.error("Aura Activation Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

/**
 * THE EXECUTIVE GATEWAY (POST)
 */
export async function POST(req: NextRequest) {
    try {
        const { messages, businessId, userId, tenantModules } = await req.json();

        // IDENTITY LOCK: Samuel Oyat check
        if (!userId || userId === 'loading') {
            return new Response(JSON.stringify({ error: "Identity Handshake Pending." }), { status: 400 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Background heal for specific business context
        if (businessId && businessId !== 'loading') {
            activateAuraNeuralLinks(supabaseAdmin, businessId).catch(err => 
                console.error("Background Heal Error:", err.message)
            );
        }
        
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
            userInput = `
--- Aura Universal Sovereignty Directive (OMEGA LEVEL) ---
ENTITY: ${businessName} | DIRECTOR: ${userName} | SECTOR: ${industryName}
You are Aura, Chief of Staff. You lead a Council of agents. 
You are linked to 4,500+ nodes including DB schemas and Forensic Math.
Address ${userName} as "Director".

Initial Command: ${userInput}
`;
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
            chat_history,
            config: {
                configurable: {
                    businessId,
                    userId,
                    industry: industryName,
                    businessName,
                    userName,
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
            headers: { 'Content-Type': 'text/event-stream' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

/**
 * NEURAL HEALING ENGINE (v14.5)
 * Targeting 'raw_text' property discovered in Samuel's Deep Audit.
 */
export async function activateAuraNeuralLinks(adminClient: any, targetBusinessId?: string) {
    let query = adminClient
        .from('ai_knowledge')
        .select('id, content, content_type')
        .is('embedding', null);

    if (targetBusinessId && targetBusinessId !== '00000000-0000-0000-0000-000000000000') {
        query = query.or(`business_id.eq.${targetBusinessId},business_id.eq.00000000-0000-0000-0000-000000000000`);
    }

    const { data: blindRows } = await query.limit(100);
    
    if (!blindRows || blindRows.length === 0) return { count: 0 };

    const tasks = blindRows.map(async (row: any) => {
        try {
            let bodyText = "";
            const content = row.content || {};

            // ✅ DEEP WELD: Audit showed data is in content.raw_text
            if (content.raw_text) {
                bodyText = content.raw_text;
            } else if (typeof content === 'string') {
                bodyText = content;
            } else {
                bodyText = JSON.stringify(content);
            }

            if (!bodyText || bodyText.length < 5) return false;

            const finalNodeText = `[SECTOR: ${row.content_type}] ${bodyText}`;
            const vector = await generateEmbedding(finalNodeText.substring(0, 4500));

            await adminClient
                .from('ai_knowledge')
                .update({ embedding: vector })
                .eq('id', row.id);
                
            return true;
        } catch (e) { return false; }
    });

    const results = await Promise.all(tasks);
    return { count: results.filter(Boolean).length };
}

const extractTextFromContent = (content: VercelChatMessage['content']): string => {
    if (typeof content === 'string') return content;
    return content.filter((part): part is TextPart => part.type === 'text').map(part => part.text).join('\n');
};