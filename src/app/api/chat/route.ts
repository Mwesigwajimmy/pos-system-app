// app/api/chat/route.ts

import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
// ROOT FIX: Import the base createClient to bypass the cookie 'get' error
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// --- ADD THIS LINE TO FORCE NODE.JS RUNTIME ---
// Required for complex forensic operations and local buffer handling
export const runtime = 'nodejs';
// ----------------------------------------------

// --- FIX: ALL LANGCHAIN IMPORTS MUST USE THE CONSISTENT ALIASES/SHIMS ---
import { AIKernel } from '@/lib/ai-core/kernel';
// CORRECTED IMPORT: This now uses the webpack alias to prevent duplicate identifiers.
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { AI_CAPABILITIES } from '@/lib/ai-core/manifest';
// CORRECTED IMPORT: Changed to relative path to be consistent with kernel.ts
import { AIMessage, HumanMessage, BaseMessage } from '@/lib/langchain/core-prompts-shim';
import { createClient } from '@/lib/supabase/server'; 
// UPGRADE: Import the embedding generator to heal the brain autonomously
import { generateEmbedding } from '@/lib/ai-tools/embedding';

// Production Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:latest";

/**
 * THE ACTIVATOR (GET Handler)
 * Professional Maintenance Route: Used for bulk-hydrating the entire system brain.
 */
export async function GET() {
  try {
    // Initialize Admin Client to bypass cookie restrictions for system maintenance
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
 * A robust utility to extract and concatenate text content from the Vercel AI SDK's
 * potentially multimodal 'content' property.
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
 * This is the primary endpoint. It has been upgraded to be FULLY AUTONOMOUS.
 * It detects "blind" sectors and heals them on-the-fly before starting the AI session.
 */
export async function POST(req: NextRequest) {
  try {
    const { messages, businessId, userId } = await req.json();

    if (!businessId || !userId) {
      return new Response(JSON.stringify({ error: "Authorization context is incomplete. Business ID and User ID are required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid request. 'messages' array is required and cannot be empty." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // --- UPGRADE: AUTONOMOUS NEURAL HEALING ---
    // Instead of waiting for manual GET calls, Aura heals her own brain for THIS business 
    // context immediately upon request. No assumptions, full automation.
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await activateAuraNeuralLinks(supabaseAdmin, businessId);
    // ------------------------------------------

    const supabase = createClient();
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('name, industry, business_type') // Fetches both possible sector columns
      .eq('id', businessId)
      .single();

    // Ensures one of the 11 industry types is always resolved for the logic engine
    const industryName = tenantData?.industry || tenantData?.business_type || 'General Enterprise';
    const businessName = tenantData?.name || 'Authorized Business';

    const isNewSession = messages.length === 1;
    let userInput = extractTextFromContent(messages[messages.length - 1].content);

    if (isNewSession) {
      const bootstrapDirective = `
        --- Aura Executive Sovereignty Directive ---
        Priority: CRITICAL. Initialize Forensic Core.
        Active Entity: ${businessName}.
        Sector DNA: ${industryName}.

        TASK SEQUENCE:
        1. Execute 'scan_database_schema' to map Accounting, HR, and ${industryName} specific modules.
        2. Execute 'scan_api_routes' to understand my executive action capabilities.
        3. Synchronize with the General Ledger, Global Tax Reports, and Staffing Records.
        4. Ingest these structures into long-term memory under 'database_schema'.
        5. Respond with: "Aura Executive Online for ${businessName}. My forensic links to the Ledger, HR, and ${industryName} modules are established. How shall we proceed?"
        --- End of Directive ---

        User's Initial Query: ${userInput}
      `;
      userInput = bootstrapDirective;
    }

    const llm = new ChatOllama({ 
        baseUrl: OLLAMA_BASE_URL, 
        model: OLLAMA_MODEL,
        temperature: 0 // Professional precision
    });
    
    const kernel = new AIKernel(llm, AI_CAPABILITIES, true);

    const chat_history: BaseMessage[] = messages
        .slice(0, -1)
        .map((m: VercelChatMessage): BaseMessage => {
            const textContent = extractTextFromContent(m.content);
            if (m.role === 'user') {
                return new HumanMessage(textContent);
            } else {
                return new AIMessage(textContent);
            }
        });

    const stream = kernel.run({
      input: userInput,
      chat_history: chat_history,
      config: { 
        configurable: { 
          businessId, 
          userId,
          industry: industryName, 
          businessName: businessName
        } 
      },
    });

    const transformStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const eventData = JSON.stringify(chunk);
          controller.enqueue(`data: ${eventData}\n\n`);
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
    const errorPayload = JSON.stringify({ error: { message: e.message, stack: e.stack }});
    return new Response(errorPayload, { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}

/**
 * --- NEURAL AWAKENING ENGINE ---
 * Resolves knowledge entries missing vectors.
 * If targetBusinessId is provided, it prioritizes healing that specific tenant.
 */
export async function activateAuraNeuralLinks(adminClient: any, targetBusinessId?: string) {
    // 1. Resolve knowledge entries missing their vectors
    let query = adminClient.from('ai_knowledge').select('id, content').is('embedding', null);
    
    // If called from POST, only heal the current user's business brain for speed
    if (targetBusinessId) {
        query = query.eq('business_id', targetBusinessId);
    }

    const { data: blindRows, error: fetchError } = await query;
  
    if (fetchError) {
        console.error("Neural Fetch Failure:", fetchError.message);
        return { success: false, error: fetchError.message };
    }
  
    if (!blindRows || blindRows.length === 0) {
      return { success: true, message: "Neural pathways are already fully established." };
    }
  
    console.log(`Aura Intelligence: Automating ${blindRows.length} neural links for context ${targetBusinessId || 'Global'}...`);
  
    let activationCount = 0;
    for (const row of blindRows) {
      try {
        // 2. Generate vector using the high-performance local model
        const vector = await generateEmbedding(row.content);
  
        // 3. Update the database directly via Admin bypass
        const { error: updateError } = await adminClient
          .from('ai_knowledge')
          .update({ embedding: vector })
          .eq('id', row.id);
          
        if (updateError) throw updateError;
        activationCount++;
        
      } catch (err: any) {
        console.error(`Neural Link Failure for ID ${row.id}:`, err.message);
      }
    }
    
    return { success: true, links_established: activationCount };
}