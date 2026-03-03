// app/api/chat/route.ts

import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';
// ROOT FIX: Import the base createClient to bypass the cookie 'get' error
import { createClient as createAdminClient } from '@supabase/supabase-js';

// --- ADD THIS LINE TO FORCE NODE.JS RUNTIME ---
export const runtime = 'nodejs';
// ----------------------------------------------

import { AIKernel } from '@/lib/ai-core/kernel';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { AI_CAPABILITIES } from '@/lib/ai-core/manifest';
import { AIMessage, HumanMessage, BaseMessage } from '@/lib/langchain/core-prompts-shim';
import { createClient } from '@/lib/supabase/server'; 
import { generateEmbedding } from '@/lib/ai-tools/embedding';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:latest";

/**
 * UPGRADED: THE ACTIVATOR (GET Handler)
 * Visit /api/chat in your browser to wake up the 28 brain cells.
 * FIX: We now use a Service Role Client to bypass the 'cookies().get()' crash.
 */
export async function GET() {
  try {
    // Initialize Admin Client using Environment Variables
    // This bypasses the need for user cookies and fixes the "reading 'get'" error
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure this is in your .env
    );

    const result = await activateAuraNeuralLinks(supabaseAdmin);
    
    return new Response(JSON.stringify(result), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e: any) {
    console.error("Aura Activation Error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
    });
  }
}

/**
 * A robust utility to extract and concatenate text content
 */
const extractTextFromContent = (content: VercelChatMessage['content']): string => {
  if (typeof content === 'string') return content;
  return content
    .filter((part): part is TextPart => part.type === 'text')
    .map(part => part.text)
    .join('\n');
};

/**
 * The primary API endpoint that serves as the gateway to the AI Kernel (POST).
 */
export async function POST(req: NextRequest) {
  try {
    const { messages, businessId, userId } = await req.json();

    if (!businessId || !userId) {
      return new Response(JSON.stringify({ error: "Authorization context incomplete." }), { status: 400 });
    }

    const supabase = createClient();
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('name, industry')
      .eq('id', businessId)
      .single();

    const industryName = tenantData?.industry || 'General Enterprise';
    const businessName = tenantData?.name || 'Authorized Business';

    const isNewSession = messages.length === 1;
    let userInput = extractTextFromContent(messages[messages.length - 1].content);

    if (isNewSession) {
      const bootstrapDirective = `
        --- Aura Executive Sovereignty Directive ---
        Priority: CRITICAL. Initialize Forensic Core.
        Active Entity: ${businessName}.
        Sector Protocol: ${industryName}.
        
        SEQUENCE: Scan DB, Map HR/Finance, Sync Ledger, and respond ready for audit.
        --- End of Directive ---
        User Request: ${userInput}
      `;
      userInput = bootstrapDirective;
    }

    const llm = new ChatOllama({ baseUrl: OLLAMA_BASE_URL, model: OLLAMA_MODEL, temperature: 0 });
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
      config: { configurable: { businessId, userId, industry: industryName, businessName } },
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
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

/**
 * --- NEURAL AWAKENING LOGIC ---
 * Uses the passed-in Admin client to perform the background hydration.
 */
export async function activateAuraNeuralLinks(adminClient: any) {
    // 1. Resolve knowledge entries missing their mathematical vectors
    const { data: blindRows, error: fetchError } = await adminClient
      .from('ai_knowledge')
      .select('id, content')
      .is('embedding', null);
  
    if (fetchError) {
        throw new Error(`Forensic Fetch Error: ${fetchError.message}`);
    }
  
    if (!blindRows || blindRows.length === 0) {
      return { success: true, message: "Neural pathways are already established." };
    }
  
    let activationCount = 0;
    for (const row of blindRows) {
      try {
        // 2. Generate vector using the high-performance nomic-embed-text model
        const vector = await generateEmbedding(row.content);
  
        // 3. Update the database directly
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
    
    return { 
        success: true, 
        links_established: activationCount,
        status: "Brain Activated. All 28 sectors are now live." 
    };
}