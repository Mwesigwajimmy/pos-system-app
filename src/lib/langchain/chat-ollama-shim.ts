'use client';

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseMessage } from './core-prompts-shim';
import { GoogleGenerativeAI, Part, Content } from '@google/generative-ai';

/**
 * --- BBU1 SOVEREIGN ENGINE SHIM ---
 * VERSION: 12.8 PRO (SHADOW BUNDLE STABILIZED)
 * ENGINE: Google Gemini 1.5 Pro
 * 
 * FIX LOG:
 * 1. SHADOW WELD: Implemented eval('require') for vm2 to bypass Webpack analyzer.
 * 2. BUILD INTEGRITY: Eliminates "Can't resolve fs/module" errors in browser builds.
 * 3. SOVEREIGN PERSISTENCE: 100% of executive logic and tool capabilities preserved.
 */

// --- Tool Definition ---
export interface ChatOllamaTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (args: Record<string, unknown>) => Promise<any>;
}

// --- Tool Implementations (PRESERVED EXECUTIVE LOGIC) ---
const codeInterpreterTool: ChatOllamaTool = {
  name: 'code_interpreter',
  description: 'Executes sandboxed Python-like code using a JavaScript VM. REQUIRED for high-precision financial calculations, algorithms, and forensic data manipulation.',
  schema: z.object({
    code: z.string().describe("The Python-like code to execute. Must be self-contained. Use 'return' for the final output."),
  }),
  async execute(args): Promise<any> {
    // Safety check for browser-side analysis
    if (typeof window !== 'undefined') return { success: false, error: "Runtime Restriction: Forensic Code execution requires Server-Level Authority." };

    const { code } = args as { code: string };
    
    // ✅ SHADOW WELD: Cloaks vm2 from Webpack static analysis
    const { VM } = eval('require')('vm2');
    
    console.log(`[Aura Executive] Executing Code Block...`);
    
    const vmOptions = {
      timeout: 5000,
      sandbox: { console, Math, JSON, Array, Object },
      eval: false,
      wasm: false,
      allowAsync: true,
    };
    
    const vm = new VM(vmOptions);
    try {
      const wrappedCode = `(async () => { ${code} })();`;
      const result = await vm.run(wrappedCode);
      return { success: true, result: result ?? 'Execution finished with no return value.' };
    } catch (error: any) {
      console.error('[Aura Executive] Analysis Error:', error.message);
      return { success: false, error: error.message };
    }
  },
};

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
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}6&longitude=${longitude}&current_weather=true`;
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
  baseUrl?: string; 
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

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'model';
  content: string;
  tool_calls?: ToolCall[];
}

/**
 * GeminiSovereignModel (Exported as ChatOllama)
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
        console.warn("Aura Critical Warning: GOOGLE_API_KEY is missing from environment variables.");
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

  async *chat(
    messages: BaseMessage[],
    extra?: Record<string, any>
  ): AsyncGenerator<{ type: 'chunk' | 'tool_calls' | 'final'; content: any }> {
    this.log('Establishing Neural Link. History Depth:', messages.length);

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      tools: this.formatTools() as any,
    });

    const contents: Content[] = messages.map(m => {
      let role = 'user';
      if (m.role === 'ai' || m.role === 'assistant') role = 'model';
      
      return {
        role,
        parts: [{ text: m.content }],
      };
    });

    try {
      const result = await model.generateContentStream({
        contents,
        generationConfig: {
          temperature: 0, 
          ...extra
        },
      });

      let fullContent = '';
      let toolCalls: ToolCall[] = [];

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullContent += chunkText;
          yield { type: 'chunk', content: chunkText };
        }
        
        const calls = chunk.functionCalls();
        if (calls) {
          const formattedCalls: ToolCall[] = calls.map(c => ({
            id: Math.random().toString(36).substring(7),
            type: 'function' as const,
            function: {
              name: c.name,
              arguments: JSON.stringify(c.args)
            }
          }));
          toolCalls = [...toolCalls, ...formattedCalls];
        }
      }

      if (toolCalls.length > 0) {
        this.log('Council Actions Detected:', toolCalls.map(tc => tc.function.name));
        yield { type: 'tool_calls', content: toolCalls };
      }

      yield { type: 'final', content: fullContent };

    } catch (error: any) {
      this.log('Neural Link Interrupted:', error.message);
      
      if (error.message.includes('429')) {
          throw new Error("Aura Protocol: Global rate limit reached. Scaling capacity...");
      }
      
      throw new Error(`Aura Sovereign Engine Failure: ${error.message}`);
    }
  }

  async call(messages: BaseMessage[], extra?: Record<string, any>): Promise<string> {
    let finalResponse = '';
    for await (const { type, content } of this.chat(messages, extra)) {
      if (type === 'final') {
        finalResponse = content;
      }
    }
    return finalResponse;
  }
}

export { GeminiSovereignModel as ChatOllama };