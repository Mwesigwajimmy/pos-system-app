// src/types/chat-ollama-shim.d.ts
/**
 * --- BBU1 SOVEREIGN NEURAL BRIDGE DECLARATION (OMEGA-ULTIMATUM) ---
 * VERSION: v14.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * STATUS: FORENSICALLY SYNCHRONIZED
 * 
 * This file provides high-authority type definitions for the Model Shim.
 * It serves as the primary type-safety layer between the BBU1 Executive Kernel
 * and the underlying Cloud Infrastructure (Google Gemini 1.5 Pro).
 * 
 * UPGRADE LOG:
 * 1. NEURAL REALIGNMENT: Synchronized for 1024-dimension Voyage Elite context.
 * 2. API STABILITY: Added apiVersion and brain_dim metadata for v1 Stable lane.
 * 3. EXECUTOR HARMONY: Expanded class definition to include 'invoke' and 'stream' 
 *    aliases, preventing message channel interruptions.
 * 4. REGIONAL RESILIENCE: Validated for Uganda-East Africa corridor connectivity.
 */

import { z } from 'zod';

declare module "@/lib/langchain/chat-ollama-shim" {

  /**
   * SOVEREIGN EXECUTIVE TOOL
   * Represents a physical ERP function (Accounting, Medical, SACCO) 
   * that can be operated by Aura's agents via semantic intent.
   */
  export interface Tool {
    /** The unique business-logic name (e.g., 'aura_autonomous_edit'). */
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
   * UPGRADED: Now supports 1024-dim brain standard and stable versioning.
   */
  export interface ChatOllamaOptions {
    /** Global Cloud Endpoint (Standard: generativelanguage.googleapis.com). */
    baseUrl?: string;
    /** The target brain (Standard: 'gemini-1.5-pro'). */
    model?: string;
    /** Handshake safety limit (default: 120,000ms for deep forensic audits). */
    timeoutMs?: number;
    /** The suite of capabilities assigned to this specific session. */
    tools?: Tool[];
    /** Enables high-density diagnostic logging in the server console. */
    verbose?: boolean;
    /** Sovereign API Credentials (GOOGLE_API_KEY). */
    apiKey?: string;
    /** ✅ OMEGA FIX: Explicit API versioning to bypass 404 regional blocks. */
    apiVersion?: 'v1' | 'v1beta';
    /** ✅ ELITE ALIGNMENT: 1024-dimensional memory signature. */
    brain_dim?: 1024;
    /** Additional executive configuration parameters. */
    [key: string]: any;
  }

  /**
   * NEURAL TOOL CALL
   * Represents an autonomous intent from an agent to perform a system action.
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
   */
  export interface OllamaMessage {
    /** 
     * Executive Roles: 
     * 'system' (Directive), 'user' (Director), 
     * 'assistant' (Aura/Agents), 'tool' (Observations), 'model' (Gemini Native).
     */
    role: 'system' | 'user' | 'assistant' | 'tool' | 'model';
    /** The linguistic content (Natural Language or Forensic Data). */
    content: string;
    /** List of autonomous tool intents detected in the reasoning pass. */
    tool_calls?: ToolCall[];
    /** For 'tool' role: The forensic ID of the call being responded to. */
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
     * Yields incremental chunks and tool-calls for real-time boardroom rendering.
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

    /**
     * ✅ OMEGA INVOKE
     * Explicit LangChain compatibility alias to prevent message channel timeouts.
     */
    invoke(
      messages: any[],
      extra?: Record<string, any>
    ): Promise<{ content: string }>;

    /**
     * ✅ OMEGA STREAM
     * Real-time neural chunk yielding for the UI display.
     */
    stream(
      messages: any[],
      extra?: Record<string, any>
    ): AsyncGenerator<{ content: string }>;
  }
}

/**
 * STATUS: Cloud-Native Neural Bridge Fully Aligned.
 * DNA_STANDARD: Elite 1024-dim Saturated.
 * JURISDICTION: Unified Business Universe (Global).
 */