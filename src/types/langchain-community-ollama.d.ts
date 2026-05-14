/**
 * --- BBU1 SOVEREIGN NEURAL BRIDGE DECLARATION ---
 * This file provides high-authority type definitions for the Model Shim.
 * It serves as the primary type-safety layer between the BBU1 Executive Kernel
 * and the underlying Cloud Infrastructure (Google Gemini 1.5 Pro).
 * 
 * Capability: Multi-Agent Parallelism, Forensic Validation, Cloud Handshaking.
 * Integrity Grade: OMEGA-LEVEL Sovereign Core.
 */

import { z } from 'zod';

declare module "@/lib/langchain/chat-ollama-shim" {

  /**
   * SOVEREIGN EXECUTIVE TOOL
   * Represents a physical ERP function (Accounting, Medical, SACCO) 
   * that can be operated by Aura's agents via semantic intent.
   */
  export interface Tool {
    /** The unique business-logic name (e.g., 'aura_calculate_landed_cost'). */
    name: string;
    /** High-density description to guide the Cloud Brain's reasoning. */
    description: string;
    /** Strict Zod schema for input validation and forensic integrity. */
    schema: z.ZodObject<any>;
    /** The physical logic execution node. */
    execute: (args: Record<string, unknown>) => Promise<any>;
  }

  /**
   * EXECUTIVE ENGINE OPTIONS
   * Configuration metadata for the Cloud Neural Link.
   * UPGRADED: Now supports high-precision parameters for Gemini 1.5 Pro.
   */
  export interface ChatOllamaOptions {
    /** Global Cloud Endpoint (Bypassed if using official Cloud SDK). */
    baseUrl?: string;
    /** The target brain (e.g., 'gemini-1.5-pro' or 'gemini-1.5-flash'). */
    model?: string;
    /** Handshake safety limit (default: 120,000ms for deep audits). */
    timeoutMs?: number;
    /** The suite of capabilities assigned to this specific session. */
    tools?: Tool[];
    /** Enables high-density diagnostic logging in the server console. */
    verbose?: boolean;
    /** Sovereign API Credentials (e.g., GOOGLE_API_KEY). */
    apiKey?: string;
    /** Additional executive configuration parameters. */
    [key: string]: any;
  }

  /**
   * NEURAL TOOL CALL
   * Represents an autonomous intent from an agent to perform a system action.
   * Optimized for parallel execution in the C-Suite ReAct loop.
   */
  export interface ToolCall {
    /** Unique forensic link to this specific execution request. */
    id: string;
    /** Type of agency (standard: 'function'). */
    type: 'function';
    /** The specific business function requested. */
    function: {
      /** The name as defined in the AI Manifest. */
      name: string;
      /** Serialized JSON arguments for the tool execution. */
      arguments: string;
    };
  }

  /**
   * SOVEREIGN LINGUISTIC MESSAGE
   * The fundamental unit of communication within the BBU1 Universe.
   * Maps LangChain shims to Google Gemini Cloud-native roles.
   */
  export interface OllamaMessage {
    /** 
     * Executive Roles: 
     * 'system' (Directive), 'user' (Director), 
     * 'assistant' (Aura/Agents), 'tool' (Observations).
     */
    role: 'system' | 'user' | 'assistant' | 'tool' | 'model';
    /** The linguistic content of the message. */
    content: string;
    /** List of autonomous tool intents detected in the reasoning pass. */
    tool_calls?: ToolCall[];
    /** For 'tool' role: The ID of the call being responded to. */
    tool_call_id?: string;
  }

  /**
   * THE SOVEREIGN CHAT MODEL (UPGRADED SHIM)
   * The physical class implementation that manages the cloud handshake.
   */
  export class ChatOllama {
    constructor(opts?: ChatOllamaOptions);
    
    /**
     * PRIMARY NEURAL CHAT
     * Generates a streaming response from the Cloud Brain.
     */
    chat(
      messages: any[], 
      extra?: Record<string, any>
    ): AsyncGenerator<{ type: 'chunk' | 'tool_calls' | 'final'; content: any }>;

    /**
     * UNIFIED CALL
     * Resolves the entire reasoning pass into a single executive string.
     */
    call(
      messages: any[], 
      extra?: Record<string, any>
    ): Promise<string>;
  }
}

/**
 * STATUS: Cloud-Native Interface Synchronized.
 * VERSION: v10.8 (Omega Sovereign Core).
 * TARGET: 24/7 Universal Business Operations.
 */