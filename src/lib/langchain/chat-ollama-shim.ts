// src/lib/langchain/chat-ollama-shim.ts
/**
 * --- BBU1 SOVEREIGN ENGINE SHIM (OMEGA-ULTIMATUM) ---
 * VERSION: v15.5 OMEGA (ALIGNED FOR SAMBANOVA ELITE 1024)
 * ENGINE: Meta-Llama-3.3-70B-Instruct (via SambaNova Cloud)
 * 
 * FORENSIC UPGRADES:
 * 1. STREAM BUFFER WELD: Implemented a line-buffer to prevent JSON parsing crashes 
 *    on partial stream chunks. This kills the "Neural Link Interrupted" 500 errors.
 * 2. PROPERTY ALIGNMENT: Fixed the tool_calls yield property to ensure absolute 
 *    synchronization with the v15.5 Sovereign Agent Executor.
 * 3. DYNAMIC TOOL MAPPING: Accept all BBU1 tools passed from the Kernel motherboard.
 * 4. SHADOW WELD: Preserved eval('require') logic for vm2 production build stability.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseMessage } from './core-prompts-shim';

// --- Tool Definition Interface ---
export interface ChatOllamaTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (args: Record<string, unknown>) => Promise<any>;
}

// --- CORE TOOL IMPLEMENTATIONS ---

/**
 * CODE INTERPRETER: The "Forensic Engine"
 */
const codeInterpreterTool: ChatOllamaTool = {
  name: 'code_interpreter',
  description: 'Executes sandboxed Python-like code using a JavaScript VM. REQUIRED for high-precision financial calculations and forensic data manipulation.',
  schema: z.object({
    code: z.string().describe("The Python-like code to execute. Use 'return' for the final output."),
  }),
  async execute(args): Promise<any> {
    const { code } = args as { code: string };
    try {
        // ✅ SHADOW WELD: Cloaks vm2 from Webpack
        const { VM } = eval('require')('vm2');
        const vm = new VM({
            timeout: 5000,
            sandbox: { console, Math, JSON, Array, Object },
            eval: false, wasm: false, allowAsync: true,
        });
        const wrappedCode = `(async () => { ${code} })();`;
        const result = await vm.run(wrappedCode);
        return { success: true, result: result ?? 'Execution finished.' };
    } catch (error: any) {
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
    latitude: z.number().describe('The latitude.'),
    longitude: z.number().describe('The longitude.'),
  }),
  async execute(args) {
    const { latitude, longitude } = args as { latitude: number, longitude: number };
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      const response = await fetch(url);
      const data = await response.json();
      return data.current_weather;
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

// --- Engine Interface Types ---
export interface ChatOllamaOptions {
  baseUrl?: string; 
  model?: string;   
  timeoutMs?: number;
  tools?: any[]; 
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
 * SambaNovaSovereignModel (Aliased as ChatOllama for Kernel Compatibility)
 * VERSION 15.5: Stream-Stabilized & Tool-Synchronized.
 */
class SambaNovaSovereignModel {
  private apiKey: string;
  private modelName: string;
  private tools: any[];
  private verbose: boolean;

  constructor(opts: ChatOllamaOptions = {}) {
    this.apiKey = process.env.SAMBANOVA_API_KEY || '';
    
    if (!this.apiKey && typeof window === 'undefined') {
        console.warn("[AURA ENGINE ALERT] SAMBANOVA_API_KEY is missing.");
    }

    this.modelName = opts.model || 'Meta-Llama-3.3-70B-Instruct'; 
    this.tools = [...(opts.tools || []), weatherTool, codeInterpreterTool];
    this.verbose = opts.verbose || false;
  }

  private log(...args: any[]) {
    if (this.verbose) console.log('[Aura Sovereign Engine v15.5]', ...args);
  }

  /**
   * Translates Zod schemas into OpenAI-compliant Function Definitions.
   */
  private formatTools() {
    if (!this.tools || this.tools.length === 0) return undefined;
    
    return this.tools.map(tool => {
      const name = tool.name;
      const description = tool.description;
      const schema = tool.schema || tool.jsonSchema;

      return {
        type: "function",
        function: {
          name: name,
          description: description,
          parameters: schema ? (zodToJsonSchema(schema) as any) : { type: "object", properties: {} },
        }
      };
    });
  }

  /**
   * PRIMARY NEURAL STREAM GATEWAY (v15.5)
   * High-velocity Handshake with SambaNova Cloud.
   * FIX: Added forensic line-buffering to prevent JSON fragmentation crashes.
   */
  async *chat(
    messages: BaseMessage[],
    extra?: Record<string, any>
  ): AsyncGenerator<{ type: 'chunk' | 'tool_calls' | 'final'; content: any; tool_calls?: any[] }> {
    this.log('Establishing Neural Link. Forensic Buffer Active.');

    const ENDPOINT = "https://api.sambanova.ai/v1/chat/completions";

    try {
      const bizId = extra?.businessId || "GLOBAL";

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "x-bbu1-vault-id": bizId 
        },
        body: JSON.stringify({
            model: this.modelName,
            messages: messages.map(m => ({ 
                role: m.role === 'ai' ? 'assistant' : m.role, 
                content: m.content 
            })),
            tools: this.formatTools(),
            stream: true,
            temperature: 0.1,
            max_tokens: 4000
        })
      });

      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `Gateway Refusal: HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Voice stream reader initialization failed.");

      let fullContent = '';
      let accumulatedToolCalls: any[] = [];
      
      /**
       * ✅ THE OMEGA FORENSIC BUFFER
       * We store partial lines here to ensure we never JSON.parse a fragment.
       */
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Concatenate new data with the previous partial line
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        
        // Keep the last (potentially incomplete) line in the buffer
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine.startsWith("data: ") || cleanLine === "data: [DONE]") continue;

            try {
                const json = JSON.parse(cleanLine.replace("data: ", ""));
                const delta = json.choices[0]?.delta;

                // 1. Handle Text Content
                if (delta?.content) {
                    fullContent += delta.content;
                    yield { type: 'chunk', content: delta.content };
                }

                // 2. Handle Tool Calls
                if (delta?.tool_calls) {
                    delta.tool_calls.forEach((toolCall: any) => {
                        const index = toolCall.index ?? 0;
                        
                        if (!accumulatedToolCalls[index]) {
                            accumulatedToolCalls[index] = {
                                id: toolCall.id,
                                type: 'function',
                                function: { name: toolCall.function.name, arguments: '' }
                            };
                        }
                        
                        if (toolCall.function?.arguments) {
                            accumulatedToolCalls[index].function.arguments += toolCall.function.arguments;
                        }
                    });
                }
            } catch (e) { 
                // Silently skip malformed lines to maintain stream integrity
            }
        }
      }

      // 3. Final Handshake
      // Yield tools under both 'content' and 'tool_calls' for absolute compatibility
      const finalTools = accumulatedToolCalls.filter(tc => tc !== undefined);
      if (finalTools.length > 0) {
          yield { 
            type: 'tool_calls', 
            content: finalTools,
            tool_calls: finalTools // ✅ OMEGA WELD: Matches AgentExecutor v15.5
          };
      }
      
      yield { type: 'final', content: fullContent };

    } catch (error: any) {
      this.log('NEURAL LINK INTERRUPTED:', error.message);
      throw new Error(`SambaNova Bridge Failure: ${error.message}`);
    }
  }

  async call(messages: BaseMessage[], extra?: Record<string, any>): Promise<string> {
    let finalResponse = '';
    for await (const packet of this.chat(messages, extra)) {
      if (packet.type === 'final') finalResponse = packet.content;
    }
    return finalResponse;
  }
}

// ✅ EXPORT ALIGNMENT
export { SambaNovaSovereignModel as ChatOllama };