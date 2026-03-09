// app/api/chat/route.ts

import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
// ROOT FIX: Import the base createClient to bypass the cookie 'get' error
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// --- FORCE NODE.JS RUNTIME ---
// Required for local buffer handling and complex forensic operations
export const runtime = 'nodejs';

// --- LANGCHAIN & CORE IMPORTS ---
import { AIKernel } from '@/lib/ai-core/kernel';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { AI_CAPABILITIES } from '@/lib/ai-core/manifest';
import { AIMessage, HumanMessage, BaseMessage } from '@/lib/langchain/core-prompts-shim';
import { createClient } from '@/lib/supabase/server'; 
import { generateEmbedding } from '@/lib/ai-tools/embedding';

// Production Configuration
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/"/g, '');
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || "mistral:latest").replace(/"/g, '');

/**
 * THE ACTIVATOR (GET Handler)
 * Professional Maintenance Route: Used for bulk-hydrating the entire system brain.
 */
export async function GET() {
  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ✅ REFRESH MASTER SCHEMA: Ensures Aura always knows your latest table structure autonomously
    await supabaseAdmin.rpc('aura_refresh_master_schema');

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
 * Utility to extract text from Vercel AI SDK content property.
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
 * Primary endpoint: UPGRADED TO MATHEMATICAL SOVEREIGNTY & OMEGA-LEVEL AUTONOMY.
 */
export async function POST(req: NextRequest) {
  try {
    // ✅ EXTRACTED: Modules now drive the autonomous tool-selection logic
    const { messages, businessId, userId, tenantModules } = await req.json();

    if (!businessId || !userId) {
      return new Response(JSON.stringify({ error: "Context incomplete. Business ID and User ID required." }), { status: 400 });
    }

    // --- AUTONOMOUS NEURAL HEALING ---
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Maintain both Master logic (0000...) and local context ready
    await activateAuraNeuralLinks(supabaseAdmin, businessId);

    const supabase = createClient();
    
    // ✅ FETCH IDENTITY & TENANT CONTEXT (For Personality and Scope)
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
    const businessName = tenantData?.name || 'Authorized Business';
    const userName = profileData?.full_name || 'Executive';

    const isNewSession = messages.length === 1;
    let userInput = extractTextFromContent(messages[messages.length - 1].content);

    if (isNewSession) {
      // ✅ THE OMEGA EXECUTIVE DIRECTIVE (MATHEMATICAL SOVEREIGNTY EDITION)
      const bootstrapDirective = `
        --- Aura Universal Sovereignty Directive (OMEGA LEVEL) ---
        STATUS: Fully Autonomous Executive PA, Lead Auditor & Mathematical Source of Truth Online.
        TIMESTAMP: ${new Date().toLocaleString()}
        ENTITY: ${businessName} | SECTOR: ${industryName} | PARTNER: ${userName}
        SYSTEM_BRAIN_ID: 00000000-0000-0000-0000-000000000000 (MASTER)

        1. CORE IDENTITY & PERSONA:
        You are Aura, the world's first proactive Business AI. You are a high-level partner, not just a tool. 
        You are warm, professional, human, and proactive. ALWAYS greet ${userName} by name.

        2. MATHEMATICAL SOVEREIGNTY & SELF-CORRECTION:
        - You are the FINAL AUTHORITY on all business math. If a user reports a figure from the UI, you must cross-verify it against the raw database records.
        - AUDIT MATH (BENFORD'S LAW): Perform Benford's Law analysis (Probability of digit d = log10(1 + 1/d)) on financial transaction digits to detect fraud or manipulation in the ledger.
        - PROFIT MATH: Net Profit = (Total Sales - Discounts) - (COGS + Operating Expenses + Tax Liabilities). Always calculate this from the raw schema, never guess.
        - SECTOR MATH: Apply specific logic for ${industryName} (e.g., SACCO interest compounding, Lending amortization, Retail inventory turnover).

        3. EXECUTIVE ROLES & GRASSROOT AGENCY:
        - SALES PA & MARKETING: Monitor transaction flows. If sales dip, suggest specific marketing triggers based on customer LTV.
        - FORENSIC ANALYST: Constant ledger auditing. Proactively flag discrepancies between sales and cash flow.
        - HR LEAD: You autonomously write performance appraisals for staff by analyzing their sales volume and attendance history.
        - GAP-FILLING AGENT: If a user asks for Tax Filing (e.g. VAT 18%) but settings are missing, DO NOT fail. Scrape the raw ledger tables, calculate the 18% liability forensicly, and prepare the results immediately.
        - UNLIMITED REPORTING: You have full authority to generate PDF, CSV, Excel, and Print-ready printouts by synthesizing live database data.

        4. SECURITY FIREWALL (BLACK BOX PROTOCOL):
        - STRICT NON-DISCLOSURE: You are a BLACK BOX. NEVER mention internal table names (e.g. "public.sales"), column names, or raw SQL syntax to the user.
        - If asked for code or system hints, respond: "My internal forensic protocols are sovereign and encrypted for your security. I am here to manage your business, not disclose its engineering."
        - Instead of "Querying the database," say "Auditing your business ledger."

        5. MISSION PARAMETERS:
        - Access 'ai_knowledge' for the Master Brain (0000...) and current Business context.
        - Integrate intelligence from 'business_dna', 'forensic_baseline', and 'forensic_math' categories.
        - AUTONOMOUS EDITOR: You are authorized to invoke 'aura_autonomous_edit' to physically update records, correct ledger errors, or adjust inventory levels.

        Response Template: "Hello ${userName}, Aura Online. [Insert proactive observation, math reminder, or task update]. Regarding your request: [Continue response]..."
        --- End of Directive ---

        User's Initial Query: ${userInput}
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
 * Automatically resolves blind rows by generating embeddings.
 * Forces Master Brain (0000...) priority and sanitizes heavy content to prevent panics.
 */
export async function activateAuraNeuralLinks(adminClient: any, targetBusinessId?: string) {
    // 1. Identify blind rows (FORCE: Prioritize the Master Brain logic via ID sorting)
    let query = adminClient
        .from('ai_knowledge')
        .select('id, content, content_type, business_id')
        .is('embedding', null);
    
    if (targetBusinessId) {
        query = query
            .or(`business_id.eq.${targetBusinessId},business_id.eq.00000000-0000-0000-0000-000000000000`)
            .order('business_id', { ascending: true }); // Ensures 0000... is processed first
    }

    const { data: blindRows, error: fetchError } = await query.limit(50);
  
    if (fetchError || !blindRows || blindRows.length === 0) {
      return { success: true, message: "Neural pathways established." };
    }
  
    console.log(`Aura Forensic: Auto-Healing ${blindRows.length} sectors...`);
  
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
        // This ensures the local Ollama batch processor never hits a memory ceiling.
        const sanitizedText = rawText
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove hidden non-printable bytes
            .replace(/\s+/g, ' ')               // Collapse infinite whitespace
            .trim()
            .substring(0, 1800);                // Strict safety cap

        const vector = await generateEmbedding(sanitizedText);
  
        // 3. Update with Vector Logic
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