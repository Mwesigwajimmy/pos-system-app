// src/types/langchain-core-prompts.d.ts
/**
 * --- BBU1 SOVEREIGN LINGUISTIC ARCHITECTURE ---
 * A comprehensive, "revolutionary" declaration file for a high-authority
 * and type-safe prompt templating system.
 * 
 * UPGRADED: Cloud-Native v10.8 (Sovereign C-Suite Edition)
 * Target: Multi-Agent Orchestration & Forensic Auditing.
 */

declare module "@langchain/core/prompts" {

  // --- 1. Core Sovereign Message Types ---

  /** The role of the message author within the BBU1 Ecosystem. */
  export type MessageRole = 'system' | 'human' | 'ai' | 'tool' | 'executive';

  /**
   * THE AUTHORITATIVE BASE MESSAGE
   * The physical root of all structured linguistic intelligence.
   * UPGRADED: Includes forensic metadata for the 15-year retention mandate.
   */
  export class BaseMessage {
    content: string;
    role: MessageRole;
    /** Metadata containing timestamps, business context, and sector-specific identifiers. */
    metadata?: Record<string, any>;
    constructor(content: string, role: MessageRole, metadata?: Record<string, any>);
  }

  /** Represents instructions from the Sovereign System Directive. */
  export class SystemMessage extends BaseMessage {
    constructor(content: string);
  }

  /** Represents commands or inquiries from the Director (User). */
  export class HumanMessage extends BaseMessage {
    constructor(content: string);
  }

  /** 
   * THE EXECUTIVE AI MESSAGE
   * Represents reasoning or final conclusions from Aura or her agents.
   * UPGRADED: Includes tool_calls for autonomous CFO/COO function execution.
   */
  export class AIMessage extends BaseMessage {
    /** Intent to execute BBU1 system tools (Invoicing, Audit, Ledger Seals). */
    tool_calls?: any[]; 
    constructor(content: string, fields?: { tool_calls?: any[] });
  }
  
  /** Represents factual observations from the BBU1 database or external API nodes. */
  export class ToolMessage extends BaseMessage {
    /** The unique link to the original tool request. */
    tool_call_id: string;
    constructor(content: string, tool_call_id: string);
  }

  // --- 2. Dynamic Prompt Template Components ---

  /**
   * NEURAL MESSAGES PLACEHOLDER
   * A structural placeholder for dynamic neural memory (chat history).
   * Essential for maintaining context across long-running executive sessions.
   */
  export class MessagesPlaceholder {
    /** The key in the input object that holds the BaseMessage array (default: 'chat_history'). */
    variableName: string;
    constructor(variableName?: string);
  }

  /**
   * EXECUTIVE MESSAGE INPUT
   * A valid message definition for the C-Suite factory.
   * Can be a tuple [role, template] or a dynamic Placeholder.
   */
  export type MessageInput = [MessageRole, string] | MessagesPlaceholder;

  /**
   * THE SOVEREIGN CHAT PROMPT TEMPLATE
   * The motherboard for assembling high-density instructions for the Cloud Brain.
   * Manages variable interpolation, partial hydration, and structural formatting.
   */
  export class ChatPromptTemplate {
    /**
     * Array of required variables (e.g., ['businessName', 'directorName']).
     * Automatically inferred from the linguistic templates.
     */
    readonly inputVariables: string[];

    constructor(messages: any[]);

    /**
     * EXECUTIVE FACTORY
     * Creates a Sovereign Template from a user-friendly array of message definitions.
     * @param messages An array of high-density message tuples or Placeholders.
     */
    static fromMessages(messages: MessageInput[]): ChatPromptTemplate;

    /**
     * PARTIAL NEURAL HYDRATION
     * Pre-fills variables (like BusinessID) to create reusable, sector-specific templates.
     * @param values Object mapping variables to their forensic values.
     * @returns A new ChatPromptTemplate instance with partial values applied.
     */
    partial(values: Record<string, any>): ChatPromptTemplate;

    /**
     * FINAL LINGUISTIC FORMATTING
     * Flattens the template into a sequence of BaseMessages ready for the Gemini Core.
     * @param values Final values for all required business variables.
     * @returns A forensic array of formatted BaseMessage objects.
     */
    format(values?: Record<string, any>): BaseMessage[];
  }
}

/**
 * STATUS: Linguistic Definitions Synchronized.
 * VERSION: v10.8 Sovereign Core.
 * JURISDICTION: Global (BBU1 Universe).
 */