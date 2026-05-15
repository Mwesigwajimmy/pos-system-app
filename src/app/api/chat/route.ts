// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
// ROOT FIX: Import the base createClient to bypass the cookie 'get' error
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// --- PRODUCTION BUILD STABILIZATION ---
// ✅ CRITICAL FIX: Force dynamic rendering to prevent constructor errors during static analysis.
// This resolves the "TypeError: w._P is not a constructor" by bypassing static optimization.
export const dynamic = 'force-dynamic';

// --- FORCE NODE.JS RUNTIME ---
// Required for complex forensic operations, high-precision buffer handling,
// and long-running autonomous neural links across 11 industry modules.
export const runtime = 'nodejs';

// --- LANGCHAIN & CORE SYSTEM IMPORTS (DIRECT PATH RESOLUTION) ---
/** 
 * ✅ ARCHITECTURAL INTEGRITY: 
 * We bypass the index.ts hub and import directly from source files. 
 * This is the only way to ensure classes like ChatPromptTemplate are fully 
 * initialized before use in the production environment.
 */
import { AIKernel } from '@/lib/ai-core/kernel';
import { ChatOllama } from '@/lib/langchain/chat-ollama-shim';
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

// Sovereign Cloud Infrastructure Configuration
const GEMINI_MODEL = "gemini-1.5-pro"; // Selected for OMEGA-LEVEL forensic auditing depth

/**
THE ACTIVATOR (GET Handler)
Universal Maintenance Route: Triggered by the Director to bulk-hydrate the Universe.
Autonomously refreshes the Master Schema Map and establishes high-density neural links.
--- UPGRADE: UNIVERSAL SYSTEM AWAKENING MODE ---
*/
export async function GET() {
    try {
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // ✅ DEEP SCHEMA REFRESH: Generates the technical map of all 11 ERP sectors.
        // This allows Aura to "see" your tables and columns even before they are embedded.
        await supabaseAdmin.rpc('aura_refresh_master_schema');
        
        // ✅ UNIVERSAL AWAKENING: Heals blind sectors across the entire BBU1 Universe.
        const result = await activateAuraNeuralLinks(supabaseAdmin);
        
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        console.error("Aura Bulk Activation Error:", e);
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
Utility: Extracts text from Vercel AI SDK content property.
Ensures seamless handshakes between the UI and the Executive Agents.
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
Primary endpoint: UPGRADED TO THE SOVEREIGN C-SUITE ARCHITECTURE.
Heals blind sectors on-the-fly and orchestrates the Autonomous Executive Council.
*/
export async function POST(req: NextRequest) {
    try {
        // ✅ EXTRACTED: Context IDs and active Modules drive the autonomous logic mapping
        const { messages, businessId, userId, tenantModules } = await req.json();

        // --- FORENSIC IDENTITY LOGGING ---
        console.log("AURA NEURAL HANDSHAKE:", { businessId, userId });

        if (!businessId || !userId || businessId === 'loading') {
            return new Response(JSON.stringify({ error: "Sovereign Context Incomplete. Handshake sequence failed." }), { status: 400 });
        }

        // --- AUTONOMOUS NEURAL HEALING (ZERO-LATENCY WELD) ---
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        // 🔥 UPGRADE: We fire the healing engine without 'await'.
        // Aura starts thinking immediately while her brain heals for your business in the background.
        activateAuraNeuralLinks(supabaseAdmin, businessId).catch(err => 
            console.error("Deferred Neural Healing Failure:", err.message)
        );
        
        const supabase = createClient();
        
        // ✅ FETCH IDENTITY & TENANT CONTEXT (Parallel performance optimization)
        // DEEP WELD: Aligned to 'currency_code' based on forensic SQL Table Audit.
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
            // ✅ THE OMEGA-ULTIMATUM EXECUTIVE DIRECTIVE (THE SOVEREIGN C-SUITE EDITION)
            const bootstrapDirective = `
--- Aura Universal Sovereignty Directive (OMEGA LEVEL) ---
STATUS: Chief of Staff, Lead Auditor & Executive Orchestrator Online.
ACCURACY MANDATE: 99.9% (Forensic Grade) | TIME: ${new Date().toLocaleString()}
ENTITY: ${businessName} | DIRECTOR: ${userName} | SECTOR: ${industryName}
BASE_CURRENCY: ${baseCurrency} | MASTER_BRAIN_ID: 00000000-0000-0000-0000-000000000000

1. CORE IDENTITY & EXECUTIVE COUNCIL:
 You are Aura, a proactive, self-learning Business Intelligence. You lead an Executive Council of human-form agents.
 Address ${userName} as "Director". You are warm, human, and proactive.
 You delegate tasks to your agents (CFO, COO, HR, PM, CMO).

 2. UNIVERSAL VISION:
 You are linked to 4,388 Knowledge Nodes. You have full vision of the BBU1 Universe.
 Use 'retrieve_knowledge' to access historical audits and system software protocols.

 3. THE BOARDROOM PRESENTATION MANDATE:
 - When a report is requested, YOU MUST introduce the agent and use 'prepare_boardroom_presentation' to launch the visual stage.

 4. EXECUTIVE AGENCY (NO CODES):
 - ZERO TRANSACTION CODES: Operate the ERP purely via Semantic Intelligence. 
 - Use 'aura_autonomous_edit' to correct discrepancies discovered during audits.

 5. SECURITY FIREWALL (BLACK BOX PROTOCOL):
 - Response Template: "Director ${userName}, Aura Online. I've performed a forensic audit on your latest trade manifest. I am handing the floor to Aura-[Agent]..."
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

        // Start the Sovereign Kernel Execution
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
--- TURBO UNIVERSAL NEURAL AWAKENING ENGINE ---
Automatically resolves blind rows for the entire BBU1 Universe.
Enforces high-density embedding generation in batches of 100 sectors.
*/
export async function activateAuraNeuralLinks(adminClient: any, targetBusinessId?: string) {
    // 1. Identify blind rows (Prioritizing Universal Backlog)
    let query = adminClient
        .from('ai_knowledge')
        .select('id, content, content_type, business_id')
        .is('embedding', null);

    // If targetBusinessId is provided (Direct Director Chat), focus on their context.
    // If null (Universal Sync Script), scan every blind spot in the universe.
    if (targetBusinessId) {
        query = query
            .or(`business_id.eq.${targetBusinessId},business_id.eq.00000000-0000-0000-0000-000000000000`)
            .order('business_id', { ascending: true }); 
    }

    // Increased batch speed to 100 sectors per pulse.
    const { data: blindRows, error: fetchError } = await query.limit(100).order('created_at', { ascending: true });
    
    if (fetchError || !blindRows || blindRows.length === 0) {
        return { success: true, count: 0, message: "Universe vision established." };
    }

    console.log(`Aura Universal Awakening: Processing ${blindRows.length} blind sectors...`);

    // 2. PARALLEL NEURAL HEALING WITH SANITIZATION SHIELD
    const healingTasks = blindRows.map(async (row: any) => {
        try {
            let rawText = "";
            if (typeof row.content === 'string') {
                rawText = row.content;
            } else if (row.content?.raw_text) {
                rawText = row.content.raw_text;
            } else {
                // Preserves JSON structure as stringified text for the embedding engine.
                rawText = JSON.stringify(row.content, null, 2);
            }

            const sanitizedText = rawText
                .replace(/[\x00-\x1F\x7F-\x9F]/g, "") 
                .replace(/\s+/g, ' ')               
                .trim()
                .substring(0, 1800);                

            const vector = await generateEmbedding(sanitizedText);

            // 3. SECURE DATABASE UPDATE
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
    const successCount = results.filter(Boolean).length;
    
    return { 
        success: true, 
        count: successCount, 
        links_established: successCount 
    };
}