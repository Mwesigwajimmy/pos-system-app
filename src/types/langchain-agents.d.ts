/**
 * --- BBU1 SOVEREIGN NEURAL ORCHESTRATION METADATA ---
 * A comprehensive declaration file providing strong type safety for the 
 * Advanced Autonomous AgentExecutor and its C-Suite components.
 * 
 * Capability: Multi-Agent ReAct Orchestration, Parallel Tool Execution, Forensic Logging.
 * JURISDICTION: Global Ecosystem (BBU1 Universe).
 * VERSION: v10.8 (Omega Sovereign Core).
 */

import { ChatOllama } from '../lib/langchain/chat-ollama-shim';
import { DynamicTool } from '../lib/langchain/core-tools-shim';
import { ChatPromptTemplate, BaseMessage } from '../lib/langchain/core-prompts-shim';

// AUTHORITATIVE IMPORT: Sourcing structural types from the physical shim implementation.
import type { 
  AgentAction, 
  AgentFinish, 
  AgentStreamEvent, 
  AgentExecutorOptions, 
  AgentStreamInput 
} from '../lib/langchain/langchain-agents-shim';

declare module "@/lib/langchain/langchain-agents-shim" {

  /**
   * EXECUTIVE ACTION METADATA
   * Represents a discrete strategic move by an agent (e.g., AURA-CFO).
   */
  export interface AgentAction {
    /** The specific specialist tool requested (e.g., 'aura_calculate_landed_cost'). */
    tool: string;
    /** Validated Zod-compliant input for the business function. */
    toolInput: any;
    /** The agent's internal thought process recorded for the audit trail. */
    log: string; 
  }

  /**
   * EXECUTIVE CONCLUSION
   * The final forensic result produced by the Council.
   */
  export interface AgentFinish {
    /** The linguistic response presented to the Director. */
    output: string;
  }

  /**
   * NEURAL STREAM EVENT (DISCRIMINATED UNION)
   * High-precision event packets for real-time boardroom rendering.
   * This typing ensures the Dashboard UI correctly interprets chunks, tools, and finishes.
   */
  export type AgentStreamEvent =
    | { event: 'on_chat_model_stream'; data: { chunk: { content: string } } }
    | { event: 'on_agent_finish'; data: AgentFinish }
    | { event: 'on_agent_action'; data: AgentAction }
    | { event: 'on_tool_end'; data: { output: string } };

  /** 
   * SOVEREIGN INPUT
   * Represents the Director's query and the historical neural memory of the session.
   */
  export interface AgentStreamInput {
    input: string;
    chat_history?: BaseMessage[];
  }

  /**
   * EXECUTIVE EXECUTOR OPTIONS
   * Configuration metadata for the Autonomous C-Suite.
   */
  export interface AgentExecutorOptions {
    agent: {
      /** The Cloud Gemini brain shim. */
      llm: ChatOllama;
      /** The high-authority Omega-Level directive. */
      prompt: ChatPromptTemplate;
    };
    /** The suite of industry-specific tools (Medical, Finance, etc.). */
    tools: DynamicTool<any>[];
    /** Enables high-density diagnostic logging. */
    verbose?: boolean;
    /** Safety iteration limit for deep forensic loops. */
    maxSteps?: number;
  }

  // --- Executive Factory Definitions ---

  /**
   * The authoritative options for assembling the Executive Council.
   */
  export interface CreateAgentOptions {
    llm: ChatOllama;
    tools: DynamicTool<any>[];
    prompt: ChatPromptTemplate;
  }

  /**
   * SOVEREIGN REACT FACTORY
   * A factory function that constructs a runnable autonomous agent.
   * Orchestrates the bridge between Cloud Reasoning and Physical ERP tools.
   */
  export function createReactAgent(opts: CreateAgentOptions): {
    llm: ChatOllama;
    tools: DynamicTool<any>[];
    prompt: ChatPromptTemplate;
  };

  /**
   * NOTE: The AgentExecutor class itself is defined in the physical .ts file
   * to maintain execution sovereignty. This block provides metadata to the
   * TypeScript compiler for global system synchronization.
   */
  
  export { AgentAction, AgentFinish, AgentStreamEvent, AgentExecutorOptions, AgentStreamInput };
}

/**
 * STATUS: Agent Orchestration Types Validated.
 * VERSION: v10.8 Sovereign Core.
 * COMPATIBILITY: Multi-Agent ReAct Compliant.
 */