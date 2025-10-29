import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BaseMessage } from './core-prompts-shim';

// --- Tool Definition ---
export interface ChatOllamaTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (args: Record<string, unknown>) => Promise<any>;
}

// --- Tool Implementations ---
const codeInterpreterTool: ChatOllamaTool = {
  name: 'code_interpreter',
  description: 'Executes sandboxed Python-like code using a JavaScript VM. Can be used for complex calculations, algorithms, or data manipulation. Use it to solve logic puzzles, perform math, or process text.',
  schema: z.object({
    code: z.string().describe("The Python-like code to execute. Must be self-contained. Use 'return' for the final output."),
  }),
  async execute(args): Promise<any> {
    const { code } = args as { code: string };
    const { VM } = require('vm2');
    console.log(`[Code Interpreter] Executing code:\n---\n${code}\n---`);
    const vmOptions = {
      timeout: 5000,
      sandbox: { console },
      eval: false,
      wasm: false,
      allowAsync: true,
    };
    const vm = new VM(vmOptions);
    try {
      const wrappedCode = `(async () => { ${code} })();`;
      const result = await vm.run(wrappedCode);
      console.log(`[Code Interpreter] Result:`, result);
      return { success: true, result: result ?? 'Execution finished with no return value.' };
    } catch (error: any) {
      console.error('[Code Interpreter] Error:', error.message);
      return { success: false, error: error.message };
    }
  },
};

const weatherTool: ChatOllamaTool = {
  name: 'get_current_weather',
  description: 'Get the current weather for a specific location using latitude and longitude.',
  schema: z.object({
    latitude: z.number().describe('The latitude of the location.'),
    longitude: z.number().describe('The longitude of the location.'),
  }),
  async execute(args) {
    const { latitude, longitude } = args as { latitude: number, longitude: number };
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch weather data: ${response.statusText}`);
      const data = await response.json();
      return data.current_weather;
    } catch (error: any) {
      return { error: error.message };
    }
  },
};

// --- Main ChatOllama Types ---
export interface ChatOllamaOptions {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  tools?: ChatOllamaTool[];
  verbose?: boolean;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// --- Main Model Implementation ---
class OllamaChatModel {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  tools: ChatOllamaTool[];
  verbose: boolean;

  constructor(opts: ChatOllamaOptions = {}) {
    this.baseUrl = (opts.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    this.model = opts.model || 'gemma:2b';
    this.timeoutMs = Number(opts.timeoutMs ?? 120_000);
    this.tools = opts.tools || [weatherTool, codeInterpreterTool];
    this.verbose = opts.verbose || false;
  }

  private log(...args: any[]) {
    if (this.verbose) {
      console.log('[ChatOllama]', ...args);
    }
  }

  private formatTools() {
    if (this.tools.length === 0) return undefined;
    return this.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.schema),
      },
    }));
  }

  async *chat(
    messages: BaseMessage[],
    extra?: Record<string, any>
  ): AsyncGenerator<{ type: 'chunk' | 'tool_calls' | 'final'; content: any }> {
    this.log('Received chat call with history length:', messages.length);

    const ollamaMessages: OllamaMessage[] = messages.map(m => {
      const role = m.role === 'ai' ? 'assistant' : m.role;
      const ollamaMessage: OllamaMessage = { role: role as OllamaMessage['role'], content: m.content };
      if (m instanceof BaseMessage && (m as any).tool_call_id) {
        ollamaMessage.tool_call_id = (m as any).tool_call_id;
      }
      return ollamaMessage;
    });

    const url = `${this.baseUrl}/api/chat`;
    const body: any = {
      model: this.model,
      messages: ollamaMessages,
      stream: true,
      options: {
        temperature: 0,
        ...extra
      }
    };

    const formattedTools = this.formatTools();
    if (formattedTools) {
      body.tools = formattedTools;
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Model server error: ${response.status} ${response.statusText} ${txt}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let toolCalls: ToolCall[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            fullContent += parsed.message.content;
            yield { type: 'chunk', content: parsed.message.content };
          }
          if (parsed.message?.tool_calls) {
            toolCalls = [...toolCalls, ...parsed.message.tool_calls];
          }
          if (parsed.done) {
            break;
          }
        }
      }

      if (toolCalls.length > 0) {
        this.log('Detected tool calls:', toolCalls.map(tc => tc.function.name));
        yield { type: 'tool_calls', content: toolCalls };
      }

      yield { type: 'final', content: fullContent };

    } finally {
      clearTimeout(id);
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

export { OllamaChatModel as ChatOllama };