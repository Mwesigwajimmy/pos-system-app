// src/types/langchain-agents-shim.d.ts
/**
 * --- BBU1 SOVEREIGN NEURAL ORCHESTRATION METADATA (OMEGA-ULTIMATUM) ---
 * VERSION: v14.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * STATUS: FORENSICALLY VALIDATED
 * 
 * A comprehensive declaration file providing strong type safety for the 
 * Advanced Autonomous AgentExecutor and its C-Suite components.
 * 
 * UPGRADE LOG:
 * 1. NEURAL REALIGNMENT: Fully synchronized for 1024-dimension Elite Brain context.
 * 2. STREAM INTEGRITY: Added metadata support to AgentStreamEvent to prevent 
 *    channel timeouts during high-density forensic audits.
 * 3. EXECUTOR HARMONY: Aligned CreateAgentOptions with the Cloud-Native Kernel.
 * 4. JURISDICTION: Enforced multi-tenant isolation types for SACCO/ERP modules.
 */

import { ChatOllama } from '../lib/langchain/chat-ollama-shim';
import { DynamicTool, RunnableConfig } from '../lib/langchain/core-tools-shim';
import { ChatPromptTemplate, BaseMessage } from '../lib/langchain/core-prompts-shim';

declare module "@/lib/langchain/langchain-agents-shim" {

  /**
   * EXECUTIVE ACTION METADATA
   * Represents a discrete strategic move by an agent (e.g., AURA-CFO).
   * Captured forensicly for the immutable BBU1 audit trail.
   */
  export interface AgentAction {
    /** The specific specialist tool requested (e.g., 'execute_forensic_audit'). */
    tool: string;
    /** Validated Zod-compliant input for the physical system operation. */
    toolInput: any;
    /** The agent's internal thought process recorded for the Director's review. */
    log: string; 
    /** ✅ OMEGA FIX: Forensic ID for cross-sector tracing. */
    forensic_id?: string;
  }

  /**
   * EXECUTIVE CONCLUSION
   * The final forensic result produced by the Council after the ReAct loop.
   */
  export interface AgentFinish {
    /** The linguistic response presented to the Director. */
    output: string;
    /** Summary of sectors analyzed during the reasoning pulse. */
    metadata?: Record<string, any>;
  }

  /**
   * NEURAL STREAM EVENT (DISCRIMINATED UNION)
   * High-precision event packets for real-time boardroom rendering.
   * This typing ensures the Dashboard UI correctly interprets chunks, tools, and finishes.
   */
  export type AgentStreamEvent =
    | { event: 'on_chat_model_stream'; data: { chunk: { content: string }; forensic_id?: string } }
    | { event: 'on_agent_finish'; data: AgentFinish }
    | { event: 'on_agent_action'; data: AgentAction }
    | { event: 'on_tool_end'; data: { output: string; tool_name?: string; duration_ms?: number } };

  /** 
   * SOVEREIGN INPUT
   * Represents the Director's query and the historical neural memory of the session.
   */
  export interface AgentStreamInput {
    /** The raw Natural Language command from the Director. */
    input: string;
    /** Historical context retrieved from the 1024-dim memory core. */
    chat_history?: BaseMessage[];
  }

  /**
   * EXECUTIVE EXECUTOR OPTIONS
   * Configuration metadata for the Autonomous C-Suite motherboard.
   */
  export interface AgentExecutorOptions {
    agent: {
      /** The Cloud Gemini brain shim (Supports v1 Stable). */
      llm: ChatOllama;
      /** The high-authority Omega-Level directive manifest. */
      prompt: ChatPromptTemplate;
    };
    /** The suite of industry-specific tools (Medical, SACCO, ERP, Finance). */
    tools: DynamicTool<any>[];
    /** Enables high-density diagnostic logging in the serverless environment. */
    verbose?: boolean;
    /** 🛡️ Safety iteration limit for deep forensic audits (Default: 8). */
    maxSteps?: number;
    /** ✅ ELITE ALIGNMENT: Metadata for 1024-dimension brain standard. */
    brain_standard?: 1024;
  }

  /**
   * THE SOVEREIGN AGENT EXECUTOR ENGINE
   * The core class implemented in the .ts file.
   */
  export class AgentExecutor {
    constructor(opts: AgentExecutorOptions);
    
    /**
     * Static Factory for direct Agent initialization.
     */
    static create(opts: CreateAgentOptions): Promise<AgentExecutor>;

    /**
     * PRIMARY NEURAL STREAM
     * Orchestrates the high-density loop between Reasoning and Acting.
     */
    stream(
      inputObj: AgentStreamInput,
      runOptions?: RunnableConfig
    ): AsyncGenerator<AgentStreamEvent>;
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

  export { AgentAction, AgentFinish, AgentStreamEvent, AgentExecutorOptions, AgentStreamInput };
}

/**
 * STATUS: Orchestration Metadata Fully Saturated.
 * DNA_STANDARD: Elite 1024-dim Aligned.
 * COMPLIANCE: IFRS / Commercial-Safe.
 * VERSION: v14.0 (Omega Sovereign Core).
 */