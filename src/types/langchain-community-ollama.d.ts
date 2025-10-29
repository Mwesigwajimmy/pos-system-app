import { z } from 'zod';

declare module "@/lib/langchain/chat-ollama-shim" {
  export interface Tool {
    name: string;
    description: string;
    schema: z.ZodObject<any>;
    execute: (args: Record<string, unknown>) => Promise<any>;
  }

  export interface ChatOllamaOptions {
    baseUrl?: string;
    model?: string;
    timeoutMs?: number;
    tools?: Tool[];
    verbose?: boolean;
    [key: string]: any;
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
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
  }
}
