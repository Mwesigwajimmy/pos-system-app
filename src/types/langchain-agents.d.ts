// src/types/langchain-agents.d.ts
// A comprehensive, "revolutionary" declaration file that provides strong type
// safety for the advanced, streaming AgentExecutor and its components.

import { ChatOllama } from '../lib/langchain/chat-ollama-shim';
import { DynamicTool } from '../lib/langchain/core-tools-shim';
import { ChatPromptTemplate, BaseMessage } from '../lib/langchain/core-prompts-shim';

// FIX: Import the types directly from the implementation file
import type { 
  AgentAction, 
  AgentFinish, 
  AgentStreamEvent, 
  AgentExecutorOptions, 
  AgentStreamInput 
} from '../lib/langchain/langchain-agents-shim';

declare module "@/lib/langchain/langchain-agents-shim" {
  // The AgentExecutor class is already exported from the .ts file.
  // We do NOT need to redefine the class structure here.
  // When you `import { AgentExecutor } from '@/lib/langchain/langchain-agents-shim'`,
  // TypeScript will automatically pick up the class definition from the .ts file.
  // The 'declare module' block is typically for augmenting external modules or
  // providing types for JS modules. Since this is your own TS module,
  // the class itself should only be defined once in the .ts file.

  // Re-export the interfaces if you want them to be directly accessible
  // when importing from this module path if not implicitly picked up.
  // However, `import type` above already makes them available for local use
  // within this declaration file or by consumers importing them directly.
  export { AgentAction, AgentFinish, AgentStreamEvent, AgentExecutorOptions, AgentStreamInput };


  // --- Factory Function Definition ---

  /**
   * The options for creating an agent.
   */
  export interface CreateAgentOptions {
    llm: ChatOllama;
    tools: DynamicTool<any>[];
    prompt: ChatPromptTemplate;
  }

  /**
   * A factory function that constructs a runnable agent from an LLM, tools, and a prompt.
   * NOTE: The original code had `createOpenAIFunctionsAgent` but the implementation
   * in the shim file is `createReactAgent`. Assuming `createReactAgent` is intended.
   */
  export function createReactAgent(opts: CreateAgentOptions): {
    llm: ChatOllama;
    tools: DynamicTool<any>[];
    prompt: ChatPromptTemplate;
  };

  // REMOVE THIS LINE: export { AgentExecutor as default };
}