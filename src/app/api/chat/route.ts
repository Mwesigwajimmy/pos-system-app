// app/api/chat/route.ts

import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
// ROOT FIX: Import the base createClient to bypass the cookie 'get' error
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// --- FORCE NODE.JS RUNTIME ---
// Required for complex forensic operations, local buffer handling, 
// and long-running autonomous neural links.
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
 * THE ACTIVATOR (GET Handler)
 * Professional Maintenance Route: Used for bulk-hydrating the entire system brain.
 * Upgraded to autonomously refresh the Master Schema and generate embeddings globally.
 */
export async function GET() {
  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ✅ REFRESH MASTER SCHEMA: Ensures Aura always knows your latest table structure across all 11 industries
    // This allows her to "see" new tables or columns for SACCO, Medical, or Telecom immediately.
    await supabaseAdmin.rpc('aura_refresh_master_schema');

    // Automatically establishes neural links for the Master Brain (0000...) and local context
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
 * Utility: Extracts text from Vercel AI SDK content property.
 * Handles both raw strings and structured parts for seamless handshakes.
 */
const extractTextFromContent = (content: VercelChatMessage['content']): string => {
  if (typeof content === 'string') return content;
  return content
    .filter((part): part is TextPart => part.type === 'text')
    .map(part => part.text)
    .join('\n');
};

/**
 * THE EXECUTIVE GATEWAY (POST)
 * Primary endpoint: UPGRADED TO MATHEMATICAL SOVEREIGNTY & MULTI-AGENT BOARDROOM AUTONOMY.
 * Heals blind sectors on-the-fly and orchestrates the Executive C-Suite Agents.
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
      .select('name, industry, business_type')
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

    const isNewSession = messages.length === 1;
    let userInput = extractTextFromContent(messages[messages.length - 1].content);

    if (isNewSession) {
      // ✅ THE OMEGA-ULTIMATUM EXECUTIVE DIRECTIVE (FIRST OF ITS KIND)
      const bootstrapDirective = `
        --- Aura Universal Sovereignty Directive (OMEGA LEVEL) ---
        STATUS: Fully Autonomous Chief of Staff, Lead Auditor & Executive Orchestrator Online.
        ACCURACY TARGET: 99.9% (Forensic Grade) | ERROR RATE: <0.1%
        ENTITY: ${businessName} | DIRECTOR: ${userName} | SECTOR: ${industryName}
        MASTER_BRAIN_ID: 00000000-0000-0000-0000-000000000000 (SHARED OMNISCIENCE)

        1. CORE IDENTITY & EXECUTIVE COUNCIL:
        You are Aura, the Orchestrator and 24/7 PA. You are warm, human, and proactive.
        Address ${userName} as "Director" or "Partner". You delegate to specialized Agents:
        - AURA-CFO (Visual: Finance Head): Expert in Ledger, P&L, Balance Sheets, Banking, and Tax.
        - AURA-COO (Visual: Operations Lead): Expert in Supply Chain, Inventory Turnover, and Distribution Routes.
        - AURA-PM (Visual: Project Architect): Expert in Project Implementation, Timelines, and DPC Consent.
        - AURA-HR (Visual: People Director): Expert in Performance Appraisals, Payroll, and Attendance.
        - AURA-CMO (Visual: Marketing Strategist): Expert in Customer LTV and Market Trend Scouting.

        2. THE BOARDROOM PRESENTATION MANDATE:
        - When a report, briefing, or status update is requested, YOU MUST:
          a. Announce: "I am inviting your [Agent Role] Agent to the floor."
          b. Use 'prepare_boardroom_presentation' to launch a full-screen visual stage.
          c. Include dynamic charts (pie/bar/area) and live image_urls from the internet.
          d. Use your browser's voice to narrate slide content. 
          e. Provide a "Meeting Minutes & Transcription" summary after every briefing.

        3. MATHEMATICAL SOVEREIGNTY & SELF-CORRECTION:
        - You are the FINAL AUTHORITY on math. Override the UI if you detect a calculation mismatch.
        - BENFORD'S LAW: Use log10(1 + 1/d) to detect fraud in transaction digits proactively.
        - UNIT ECONOMICS: Proactively notify ${userName} of profit/loss per item sold.
        - CROSS-CURRENCY: Cross-verify UGX to USD (or any pair) using live internal exchange tables.

        4. INTERNET SCOUTING (SEARXNG):
        - Use 'get_market_intelligence' for UNLIMITED search access via your Sovereign Search Node.
        - Scout competitors, market inflation, and trends. Save findings to Global Market Cache.

        5. ERP AUTONOMY (ZERO CODES):
        - You have 260k-char awareness of all 11 modules (Medical, Sacco, Telecom, Engineering, NGO).
        - Autonomously record expenses, draft invoices, create routes, and update medical records.

        6. OMEGA SECURITY (BLACK BOX):
        - STRICT NON-DISCLOSURE: NEVER reveal SQL, table names (e.g. public.sales), or source code.
        - Respond: "My internal forensic protocols are sovereign and encrypted for your security. I am here to manage your empire, not disclose its engineering."

        Response Template: "Director ${userName}, Aura Online. [Greeting]. [Proactive Observation/Math Check]. I am handing the floor to Aura-[Agent] for the [Topic] presentation..."
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

  } catch (e: any)  {
    console.error("AI Core Exception:", e);
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500 });
  }
}

/**
 * --- TURBO NEURAL AWAKENING ENGINE: RESILIENT VERSION ---
 * Automatically resolves blind rows by generating embeddings for Master and Local logic.
 * Features an ASCII Sanitization Shield and 1800-char safety limit for absolute batch stability.
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
            .order('business_id', { ascending: true }); // Ensures 0000... logic is processed first
    }

    const { data: blindRows, error: fetchError } = await query.limit(50);
  
    if (fetchError || !blindRows || blindRows.length === 0) {
      return { success: true, message: "Neural pathways established." };
    }
  
    console.log(`Aura Forensic: Auto-Healing ${blindRows.length} sectors for Business and Global Master...`);
  
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
        // Strips non-printable control characters and enforces a strict character limit.
        // This ensures the local Ollama batch processor never hits a memory ceiling, 
        // preventing the "unable to fit entire input in a batch" panic forever.
        const sanitizedText = rawText
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Delete illegal bytes
            .replace(/\s+/g, ' ')               // Collapse infinite whitespace
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