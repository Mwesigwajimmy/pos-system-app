// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * --- BBU1 SOVEREIGN OMEGA KERNEL ---
 * VERSION: v14.0 (THE UNIVERSAL AWAKENING)
 * 
 * CORE UPGRADES:
 * 1. RECURSIVE HEALING: GET handler now loops until 0 blind nodes remain.
 * 2. SCHEMA INJECTION: Database schemas are now formatted as "Maps" for the vector engine.
 * 3. CHARACTER SATURATION: Increased embedding window to 4000 chars for complex math.
 * 4. IDENTITY WELD: Forces Master Brain ID on all core logic nodes.
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
        const maxIterations = 20; // Safety cap for serverless execution limits
        let nodesRemaining = true;

        // 2. RECURSIVE HEALING LOOP
        // We pulse the engine until the universe is 100% awake or we hit time safety.
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
            status: nodesRemaining ? "PARTIALLY_AWAKE_CONTINUE_REQUIRED" : "SOVEREIGN_AWAKE_100",
            message: nodesRemaining ? "Remaining nodes detected. Run pulse again." : "Aura is fully fed."
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

        if (!businessId || !userId || businessId === 'loading') {
            return new Response(JSON.stringify({ error: "Sovereign Context Incomplete." }), { status: 400 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // Background Healing: Ensure the local business context is awake
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
--- OMEGA NEURAL HEALING ENGINE ---
Heals blind rows and injects forensic metadata into the embedding text.
*/
export async function activateAuraNeuralLinks(adminClient: any, targetBusinessId?: string) {
    let query = adminClient
        .from('ai_knowledge')
        .select('id, content, content_type, business_id')
        .is('embedding', null);

    if (targetBusinessId) {
        query = query
            .or(`business_id.eq.${targetBusinessId},business_id.eq.00000000-0000-0000-0000-000000000000`)
            .order('business_id', { ascending: true }); 
    }

    const { data: blindRows, error: fetchError } = await query.limit(100).order('created_at', { ascending: true });
    
    if (fetchError || !blindRows || blindRows.length === 0) {
        return { success: true, count: 0 };
    }

    const healingTasks = blindRows.map(async (row: any) => {
        try {
            let processedText = "";

            // --- FORENSIC CONTEXT INJECTION ---
            // If it's a schema, we format it as a map so Aura can "find" the tables.
            if (row.content_type === 'database_schema') {
                const tableName = row.content.table_name || 'System Table';
                const module = row.content.module || 'ERP Core';
                const cols = JSON.stringify(row.content.columns);
                processedText = `DATABASE SCHEMA MAP: Table [${tableName}] in Module [${module}]. Structures and Columns: ${cols}. Use this to query forensic data.`;
            } 
            else if (row.content_type === 'persona_logic') {
                processedText = `EXECUTIVE PERSONA LOGIC: ${JSON.stringify(row.content)}`;
            }
            else if (typeof row.content === 'string') {
                processedText = row.content;
            } else {
                processedText = JSON.stringify(row.content);
            }

            // Sanitization & Window Saturation (4000 chars)
            const sanitizedText = processedText
                .replace(/[\x00-\x1F\x7F-\x9F]/g, "") 
                .replace(/\s+/g, ' ')               
                .trim()
                .substring(0, 4000);                

            const vector = await generateEmbedding(sanitizedText);

            await adminClient
                .from('ai_knowledge')
                .update({ embedding: vector })
                .eq('id', row.id);
                
            return true;
        } catch (err: any) {
            console.error(`Neural Corruption [${row.id}]:`, err.message);
            return false;
        }
    });

    const results = await Promise.all(healingTasks);
    return { 
        success: true, 
        count: results.filter(Boolean).length 
    };
}