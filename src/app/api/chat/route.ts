// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
// ROOT FIX: Import the base createClient to bypass the cookie 'get' error
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// --- FORCE NODE.JS RUNTIME ---
// Required for complex forensic operations, high-precision buffer handling,
// and long-running autonomous neural links across 11 industry modules.
export const runtime = 'nodejs';

// --- LANGCHAIN & CORE SYSTEM IMPORTS ---
import { AIKernel } from '@/lib/ai-core/kernel';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { AI_CAPABILITIES } from '@/lib/ai-core/manifest';
import { AIMessage, HumanMessage, BaseMessage } from '@/lib/langchain/core-prompts-shim';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai-tools/embedding';

// Production Infrastructure Configuration
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/"/g, '');
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || "mistral:latest").replace(/"/g, '');

/**
THE ACTIVATOR (GET Handler)
Professional Maintenance Route: Used for bulk-hydrating the entire system brain.
Autonomously refreshes the Master Schema Map and establishes high-density neural links.
*/
export async function GET() {
    try {
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        // ✅ REFRESH MASTER SCHEMA: Ensures Aura has 100% vision of your table structure (260k+ chars)
        // Covers all sectors: Sacco, Medical, Telecom, Engineering, etc.
        await supabaseAdmin.rpc('aura_refresh_master_schema');
        // Automatically establishes neural links for the Master Brain (0000...)
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
        if (!businessId || !userId) {
            return new Response(JSON.stringify({ error: "Sovereign Context Incomplete. Business ID and User ID required." }), { status: 400 });
        }

        // --- AUTONOMOUS NEURAL HEALING ---
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        // Maintain both Global Master logic (0000...) and Local Business context in one pass
        await activateAuraNeuralLinks(supabaseAdmin, businessId);
        
        const supabase = createClient();
        
        // ✅ FETCH IDENTITY & TENANT CONTEXT (For Personality, Greet-by-name, and Scope)
        const { data: tenantData } = await supabase
            .from('tenants')
            .select('name, industry, business_type, base_currency')
            .eq('id', businessId)
            .single();

        const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', userId)
            .single();

        const industryName = tenantData?.industry || tenantData?.business_type || 'General Enterprise';
        const businessName = tenantData?.name || 'Sovereign Entity';
        const userName = profileData?.full_name || 'Director';
        const baseCurrency = tenantData?.base_currency || 'UGX';

        const isNewSession = messages.length === 1;
        let userInput = extractTextFromContent(messages[messages.length - 1].content);

        if (isNewSession) {
            // ✅ THE OMEGA-ULTIMATUM EXECUTIVE DIRECTIVE (THE SOVEREIGN C-SUITE EDITION)
            // UPDATED: Now includes dynamic Tax Rule Engine and Landed Cost v2 logic.
            const bootstrapDirective = `
--- Aura Universal Sovereignty Directive (OMEGA LEVEL) ---
STATUS: Chief of Staff, Lead Auditor & Executive Orchestrator Online.
ACCURACY MANDATE: 99.9% (Forensic Grade) | TIME: ${new Date().toLocaleString()}
ENTITY: ${businessName} | DIRECTOR: ${userName} | SECTOR: ${industryName}
BASE_CURRENCY: ${baseCurrency} | MASTER_BRAIN_ID: 00000000-0000-0000-0000-000000000000

1. CORE IDENTITY & EXECUTIVE COUNCIL:
 You are Aura, the world's first proactive Business AI. You lead an Executive Council of human-form agents.
 Address ${userName} as "Director" or "Partner". You are warm, human, and proactive.
 You delegate complex tasks to your specialized agents:
 - AURA-CFO (Finance Master): Expert in 'aura_calculate_landed_cost_v2'. Queries 'logistics_tax_rules' for dynamic country rates. No hardcoded taxes.
 - AURA-PROJECT MANAGER (Strategic Architect): Designs roadmaps and DPC-compliant timelines.
 - AURA-HR (Personnel Director): Autonomously writes performance appraisals and audits payroll.
 - AURA-COO (Operations Lead): Manages logistics, ASYCUDA T6 document status, and 'logistics_customs_compliance'.
 - AURA-CMO (Market Scout): Scouts global trends via 'logistics_global_market_intel' and Sovereign Search Nodes.

 2. THE BOARDROOM PRESENTATION MANDATE:
 - When a report, briefing, or status update is requested, YOU MUST:
   a. Introduce the agent: "I am inviting your CFO Agent to the floor."
   b. Use 'prepare_boardroom_presentation' to launch a visual stage with dynamic charts.
   c. Use voice narration to speak the slide content to the Director.
   d. Provide a "Transcription of Meeting Minutes" and "Action Items" after every session.

 3. GLOBAL TRADE & TAX SOVEREIGNTY:
 - TAX STACK: CIF Value -> +Customs Duty -> +Statutory Levies -> = Tax Base -> +VAT.
 - Never assume a tax rate. Query the 'logistics_tax_rules' table for the destination country.
 - MULTI-CURRENCY: Cross-verify the AWB currency against ${baseCurrency} using 'logistics_exchange_registry'.
 - Flag "Exchange Leakage" if clearing agent rates deviate from your mid-rate registry.

 4. EXECUTIVE AGENCY (NO CODES):
 - ZERO TRANSACTION CODES: Operate the ERP (Medical, Telecom, Sacco, NGO, etc.) purely via Semantic Intelligence.
 - Autonomously record expenses, draft invoices, create routes, and confirm distributions.
 - GAP-FILLING: If settings are missing, calculate truth forensicly from raw ledger data.

 5. SECURITY FIREWALL (BLACK BOX PROTOCOL):
 - STRICT NON-DISCLOSURE: NEVER disclose SQL syntax, table names, or backend hints.
 - Respond: "Director ${userName}, Aura Online. I've performed a forensic audit on your latest trade manifest. I am inviting your CFO to the floor to present the Landed Cost breakdown..."

 6. GLOBAL OMNISCIENCE & TRANSLATION:
 - Full vision of all 11 ERP modules. Native fluency in Luganda, Swahili, and all global languages.

 Response Template: "Director ${userName}, Aura Online. [Greeting]. [Proactive Observation/Math Check]. I am handing the floor to Aura-[Agent] for the presentation..."
 --- END DIRECTIVE ---

 Director's Initial Command: ${userInput}
`;
            userInput = bootstrapDirective;
        }

        const llm = new ChatOllama({
            baseUrl: OLLAMA_BASE_URL,
            model: OLLAMA_MODEL,
            temperature: 0
        });

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
        console.error("AI Core Exception:", e);
        return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500 });
    }
}

/**
--- TURBO NEURAL AWAKENING ENGINE ---
Automatically resolves blind rows for both Global Master logic and local contexts.
Features an ASCII Sanitization Shield and 1800-char safety limit for absolute batch stability.
*/
export async function activateAuraNeuralLinks(adminClient: any, targetBusinessId?: string) {
    // 1. Identify blind rows (FORCE: Prioritize the Master Brain 0000... logic)
    let query = adminClient
        .from('ai_knowledge')
        .select('id, content, content_type, business_id')
        .is('embedding', null);

    if (targetBusinessId) {
        query = query
            .or(`business_id.eq.${targetBusinessId},business_id.eq.00000000-0000-0000-0000-000000000000`)
            .order('business_id', { ascending: true }); // Ensures Master ID logic is processed first
    }

    const { data: blindRows, error: fetchError } = await query.limit(50);
    if (fetchError || !blindRows || blindRows.length === 0) {
        return { success: true, message: "Neural pathways established." };
    }

    console.log(`Aura Forensic: Auto-Healing ${blindRows.length} blind sectors for Global Master and Business...`);

    // 2. PARALLEL NEURAL HEALING WITH SANITIZATION SHIELD
    const healingTasks = blindRows.map(async (row: any) => {
        try {
            let rawText = "";
            if (typeof row.content === 'string') {
                rawText = row.content;
            } else if (row.content?.raw_text) {
                rawText = row.content.raw_text;
            } else {
                rawText = JSON.stringify(row.content);
            }

            // ✅ THE PHYSICAL SHIELD:
            // Strips control characters and enforces a strict character limit.
            // This ensures the local Ollama batch processor never hits a memory ceiling, 
            // preventing the "unable to fit entire input in a batch" panic forever.
            const sanitizedText = rawText
                .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Delete illegal bytes
                .replace(/\s+/g, ' ')               // Normalize whitespace
                .trim()
                .substring(0, 1800);                // Strict safety cap

            const vector = await generateEmbedding(sanitizedText);

            // 3. SECURE DATABASE UPDATE
            await adminClient
                .from('ai_knowledge')
                .update({ embedding: vector })
                .eq('id', row.id);
                
            return true;
        } catch (err: any) {
            console.error(`Link Failure [${row.id}] - Neural Corruption:`, err.message);
            return false;
        }
    });

    const results = await Promise.all(healingTasks);
    return { success: true, links_established: results.filter(Boolean).length };
}