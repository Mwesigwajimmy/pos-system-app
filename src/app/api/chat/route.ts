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
 * Primary endpoint: Upgraded to be FULLY AUTONOMOUS.
 * Heals blind sectors on-the-fly and initializes the forensic mission context.
 */
export async function POST(req: NextRequest) {
  try {
    // ✅ FIX: Extracted tenantModules to enable Autonomous Tool mapping
    const { messages, businessId, userId, tenantModules } = await req.json();

    if (!businessId || !userId) {
      return new Response(JSON.stringify({ error: "Context incomplete. Business ID and User ID required." }), { status: 400 });
    }

    // --- AUTONOMOUS NEURAL HEALING ---
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await activateAuraNeuralLinks(supabaseAdmin, businessId);

    const supabase = createClient();
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('name, industry, business_type')
      .eq('id', businessId)
      .single();

    const industryName = tenantData?.industry || tenantData?.business_type || 'General Enterprise';
    const businessName = tenantData?.name || 'Authorized Business';

    const isNewSession = messages.length === 1;
    let userInput = extractTextFromContent(messages[messages.length - 1].content);

    if (isNewSession) {
      // ✅ UPGRADED: Added "Autonomous Editor" authorization to the directive
      const bootstrapDirective = `
        --- Aura Executive Sovereignty Directive ---
        STATUS: Forensic Core Initialized.
        ENTITY: ${businessName}.
        SECTOR: ${industryName}.
        CONTEXT_ID: ${businessId}.
        ACTIVE_MODULES: ${tenantModules?.join(', ') || 'Core only'}.

        MISSION PARAMETERS:
        1. Access 'ai_knowledge' where 'content_type' is 'database_schema' to map system tables.
        2. Integrate intelligence from 'business_dna' and 'forensic_baseline' categories.
        3. AUTONOMOUS EDITOR PROTOCOL: You are now authorized to invoke 'aura_autonomous_edit' to physically update system records, correct ledger entries, and manage inventory state.
        4. Response Template: "Aura Executive Online. Forensic links to ${industryName} DNA established. Autonomous Editor Protocol is ACTIVE. How shall we proceed with the audit or system modifications?"
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
    
    // ✅ FIX: Kernel now receives the tenantModules for tool-switching logic
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
          tenantModules: tenantModules || [] // ✅ Pass the modules into the kernel config
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
 * --- TURBO NEURAL AWAKENING ENGINE ---
 * Automatically resolves blind rows (the 48 missing embeddings).
 * Handles JSONB structure extraction and auto-categorization.
 */
export async function activateAuraNeuralLinks(adminClient: any, targetBusinessId?: string) {
    let query = adminClient
        .from('ai_knowledge')
        .select('id, content, content_type')
        .is('embedding', null);
    
    if (targetBusinessId) {
        query = query.eq('business_id', targetBusinessId);
    }

    const { data: blindRows, error: fetchError } = await query.limit(10);
  
    if (fetchError || !blindRows || blindRows.length === 0) {
      return { success: true, message: "Neural pathways established." };
    }
  
    console.log(`Aura Forensic: Auto-Healing ${blindRows.length} blind sectors...`);
  
    const healingTasks = blindRows.map(async (row: any) => {
      try {
        let textToEmbed = "";
        if (typeof row.content === 'string') {
            textToEmbed = row.content;
        } else if (row.content?.raw_text) {
            textToEmbed = row.content.raw_text;
        } else {
            textToEmbed = JSON.stringify(row.content);
        }

        const vector = await generateEmbedding(textToEmbed);
  
        let resolvedType = row.content_type;
        if (!resolvedType) {
            if (textToEmbed.includes('DNA:')) resolvedType = 'business_dna';
            else if (textToEmbed.includes('FORENSIC BASELINE:')) resolvedType = 'forensic_baseline';
            else if (textToEmbed.includes('database_schema') || row.content?.type === 'database_schema') resolvedType = 'database_schema';
            else resolvedType = 'general_knowledge';
        }

        await adminClient
          .from('ai_knowledge')
          .update({ 
              embedding: vector,
              content_type: resolvedType
          })
          .eq('id', row.id);
          
        return true;
      } catch (err: any) {
        console.error(`Link Failure [${row.id}]:`, err.message);
        return false;
      }
    });

    const results = await Promise.all(healingTasks);
    return { success: true, links_established: results.filter(Boolean).length };
}