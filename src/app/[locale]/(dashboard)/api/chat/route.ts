import { NextRequest } from 'next/server';
import { CoreMessage as VercelChatMessage, TextPart } from 'ai';

// --- ADD THIS LINE TO FORCE NODE.JS RUNTIME ---
export const runtime = 'nodejs';
// This resolves the 'process.versions' and other Node.js API errors
// caused by Supabase Realtime and other dependencies (like vm2).
// ----------------------------------------------

// --- FIX: ALL LANGCHAIN IMPORTS MUST USE THE CONSISTENT ALIASES/SHIMS ---
import { AIKernel } from '@/lib/ai-core/kernel';
// CORRECTED IMPORT: This now uses the webpack alias to prevent duplicate identifiers.
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { AI_CAPABILITIES } from '@/lib/ai-core/manifest';
// CORRECTED IMPORT: Changed to relative path to be consistent with kernel.ts, or could be aliased.
import { AIMessage, HumanMessage, BaseMessage } from '@/lib/langchain/core-prompts-shim';


// Use environment variables for production-grade configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:latest";

/**
 * A robust utility to extract and concatenate text content from the Vercel AI SDK's
 * potentially multimodal 'content' property.
 * @param content The 'content' property from a VercelChatMessage.
 * @returns A single string containing all text found in the content parts.
 */
const extractTextFromContent = (content: VercelChatMessage['content']): string => {
  if (typeof content === 'string') {
    return content;
  }
  return content
    .filter((part): part is TextPart => part.type === 'text')
    .map(part => part.text)
    .join('\n');
};

/**
 * The primary API endpoint that serves as the gateway to the AI Kernel.
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

    const isNewSession = messages.length === 1;
    let userInput = extractTextFromContent(messages[messages.length - 1].content);

    if (isNewSession) {
      const bootstrapDirective = `
        --- System Initialization Directive ---
        Priority: CRITICAL. Execute before all other tasks.
        1. Execute the 'scan_database_schema' tool to understand the current data structures.
        2. Take the output from the scan and use the 'ingest_knowledge' tool to commit it to long-term memory under the source 'database_schema'.
        3. Execute the 'scan_api_routes' tool to understand my available backend capabilities.
        4. Take the output from the scan and use the 'ingest_knowledge' tool to commit it to long-term memory under the source 'api_routes'.
        5. After completing the initialization, respond with "System initialized. I have reviewed the latest system and data structures. How can I assist you?". Then, proceed to the user's original request if they provided one.
        --- End of Directive ---

        User's Original Request: ${userInput}
      `;
      userInput = bootstrapDirective;
    }

    const llm = new ChatOllama({ baseUrl: OLLAMA_BASE_URL, model: OLLAMA_MODEL });
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
      config: { configurable: { businessId, userId } },
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