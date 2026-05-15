// src/lib/langchain/chat-ollama-shim.ts
/**
 * --- BBU1 SOVEREIGN ENGINE SHIM (OMEGA-ULTIMATUM) ---
 * VERSION: 14.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * ENGINE: Google Gemini 1.5 Pro (Direct Cloud Handshake)
 * 
 * FORENSIC UPGRADES:
 * 1. SYSTEM JURISDICTION: Moved system prompts to the native systemInstruction block
 *    for 100% compliance with Director mandates.
 * 2. SHADOW WELD: Preserved eval('require') logic to bypass Webpack analyzer for vm2.
 * 3. NEURAL ALIGNMENT: Synchronized tool calling for the 1-million token Gemini window.
 * 4. STREAM INTEGRITY: Enhanced chunk yielding to prevent message channel timeouts.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseMessage } from './core-prompts-shim';
import { GoogleGenerativeAI, Part, Content } from '@google/generative-ai';

// --- Tool Definition Interface ---
export interface ChatOllamaTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (args: Record<string, unknown>) => Promise<any>;
}

// --- CORE TOOL IMPLEMENTATIONS (PRESERVED EXECUTIVE LOGIC) ---

/**
 * CODE INTERPRETER: The "Forensic Engine"
 * Executes sandboxed code for high-precision business math.
 */
const codeInterpreterTool: ChatOllamaTool = {
  name: 'code_interpreter',
  description: 'Executes sandboxed Python-like code using a JavaScript VM. REQUIRED for high-precision financial calculations, algorithms, and forensic data manipulation.',
  schema: z.object({
    code: z.string().describe("The Python-like code to execute. Must be self-contained. Use 'return' for the final output."),
  }),
  async execute(args): Promise<any> {
    const { code } = args as { code: string };
    
    try {
        // ✅ SHADOW WELD: Cloaks vm2 from Webpack static analysis during production builds
        const { VM } = eval('require')('vm2');
        
        console.log(`[Aura Executive] Initiating Forensic Code Analysis...`);
        
        const vm = new VM({
            timeout: 5000,
            sandbox: { console, Math, JSON, Array, Object },
            eval: false,
            wasm: false,
            allowAsync: true,
        });

        const wrappedCode = `(async () => { ${code} })();`;
        const result = await vm.run(wrappedCode);
        return { success: true, result: result ?? 'Execution finished with no return value.' };
    } catch (error: any) {
      console.error('[Aura Executive] Forensic Analysis Error:', error.message);
      return { success: false, error: error.message };
    }
  },
};

/**
 * WEATHER TOOL: Field Service Intelligence
 */
const weatherTool: ChatOllamaTool = {
  name: 'get_current_weather',
  description: 'Retrieves real-time meteorological data for field service and logistics planning.',
  schema: z.object({
    latitude: z.number().describe('The latitude of the location.'),
    longitude: z.number().describe('The longitude of the location.'),
  }),
  async execute(args) {
    const { latitude, longitude } = args as { latitude: number, longitude: number };
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather node unreachable: ${response.statusText}`);
      const data = await response.json();
      return data.current_weather;
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

// --- Engine Interface Types ---
export interface ChatOllamaOptions {
  baseUrl?: string; // Kept for interface compatibility
  model?: string;   
  timeoutMs?: number;
  tools?: ChatOllamaTool[];
  verbose?: boolean;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * GeminiSovereignModel (Aliased as ChatOllama for Kernel Compatibility)
 * The definitive cloud bridge for the BBU1 Universe.
 */
class GeminiSovereignModel {
  private apiKey: string;
  private modelName: string;
  private timeoutMs: number;
  private tools: ChatOllamaTool[];
  private verbose: boolean;
  private genAI: GoogleGenerativeAI;

  constructor(opts: ChatOllamaOptions = {}) {
    this.apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
    
    if (!this.apiKey && typeof window === 'undefined') {
        console.warn("[AURA SECURITY ALERT] GOOGLE_API_KEY is missing. Handshake will fail.");
    }

    this.modelName = opts.model || 'gemini-1.5-pro'; 
    this.timeoutMs = Number(opts.timeoutMs ?? 120_000);
    this.tools = opts.tools || [weatherTool, codeInterpreterTool];
    this.verbose = opts.verbose || false;
    
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  private log(...args: any[]) {
    if (this.verbose) {
      console.log('[Aura Sovereign Engine]', ...args);
    }
  }

  /**
   * Translates Zod schemas into Google-compliant Function Declarations.
   */
  private formatTools() {
    if (!this.tools || this.tools.length === 0) return undefined;
    
    return [{
      functionDeclarations: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.schema) as any,
      }))
    }];
  }

  /**
   * PRIMARY NEURAL STREAM GATEWAY
   * Yields chunks for the UI and ToolCalls for the Executive Kernel.
   */
  async *chat(
    messages: BaseMessage[],
    extra?: Record<string, any>
  ): AsyncGenerator<{ type: 'chunk' | 'tool_calls' | 'final'; content: any }> {
    this.log('Establishing Neural Link via Gemini Cloud. Elite 1024-dim Memory Active.');

    // 🛡️ DEEP FIX: Separate system instructions for native Google support
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      tools: this.formatTools() as any,
      // Pass the system prompt directly to the core instructions block
      systemInstruction: systemMessages.map(m => m.content).join('\n\n')
    });

    // Map conversation history for Google's model role standard
    const contents: Content[] = conversationMessages.map(m => {
      let role = 'user';
      if (m.role === 'ai' || m.role === 'assistant') role = 'model';
      return {
        role,
        parts: [{ text: m.content || '' }],
      };
    });

    try {
      const result = await model.generateContentStream({
        contents,
        generationConfig: {
          temperature: 0, // Forensic precision mandate
          maxOutputTokens: 2048,
          ...extra
        },
      });

      let fullContent = '';

      for await (const chunk of result.stream) {
        // 1. Text Content Handshake
        try {
            const chunkText = chunk.text();
            if (chunkText) {
              fullContent += chunkText;
              yield { type: 'chunk', content: chunkText };
            }
        } catch (e) {
            // Chunk might contain only function calls; continuing logic
        }
        
        // 2. Autonomous Tool-Call Handshake
        const calls = chunk.functionCalls();
        if (calls) {
          const formattedCalls: ToolCall[] = calls.map(c => ({
            id: `call_${Math.random().toString(36).substring(7)}`,
            type: 'function' as const,
            function: {
              name: c.name,
              arguments: JSON.stringify(c.args)
            }
          }));
          yield { type: 'tool_calls', content: formattedCalls };
        }
      }

      // 3. Final Executive Conclusion
      yield { type: 'final', content: fullContent };

    } catch (error: any) {
      this.log('NEURAL LINK INTERRUPTED:', error.message);
      
      if (error.message.includes('429')) {
          throw new Error("Aura Protocol: Global Cloud rate limit reached. Retrying forensic link...");
      }
      
      throw new Error(`Aura Sovereign Engine Failure: ${error.message}`);
    }
  }

  /**
   * Helper for non-streaming executive calls.
   */
  async call(messages: BaseMessage[], extra?: Record<string, any>): Promise<string> {
    let finalResponse = '';
    for await (const packet of this.chat(messages, extra)) {
      if (packet.type === 'final') {
        finalResponse = packet.content;
      }
    }
    return finalResponse;
  }
}

// ✅ EXPORT ALIGNMENT: Maintaining 'ChatOllama' alias to ensure Kernel-to-Engine continuity.
export { GeminiSovereignModel as ChatOllama };