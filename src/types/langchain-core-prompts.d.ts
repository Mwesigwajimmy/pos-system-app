// src/types/langchain-core-prompts.d.ts
/**
 * --- BBU1 SOVEREIGN LINGUISTIC ARCHITECTURE (OMEGA-ULTIMATUM) ---
 * VERSION: v14.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * STATUS: FORENSICALLY STABILIZED
 * 
 * A comprehensive, high-authority declaration file for a type-safe 
 * prompt templating system. Governs the linguistic "DNA" of Aura.
 * 
 * UPGRADE LOG:
 * 1. NEURAL REALIGNMENT: Fully synchronized for 1024-dimension retrieval context.
 * 2. AGENT ORCHESTRATION: Enhanced AIMessage types for autonomous C-Suite tools.
 * 3. FORENSIC RETENTION: Strict metadata typing for the 15-year immutable audit trail.
 * 4. HANDSHAKE INTEGRITY: Aligned for Gemini 1.5 Pro and Voyage-2 Elite synergy.
 */

declare module "@langchain/core/prompts" {

  // --- 1. Core Sovereign Message Types ---

  /** The role of the message author within the BBU1 Ecosystem. */
  export type MessageRole = 'system' | 'human' | 'ai' | 'tool' | 'executive';

  /**
   * THE AUTHORITATIVE BASE MESSAGE
   * The physical root of all structured linguistic intelligence.
   * UPGRADED: Optimized for high-density forensic auditing data.
   */
  export class BaseMessage {
    /** The linguistic content of the message (Natural Language or JSON). */
    content: string;
    /** The Sovereign role assigned to the author. */
    role: MessageRole;
    /** 
     * FORENSIC METADATA
     * Containing timestamps, business context, sector-specific identifiers,
     * and the 1024-dim neural signature for the 15-year retention mandate. 
     */
    metadata?: Record<string, any> & {
        forensic_id?: string;
        business_id?: string;
        timestamp?: string;
        brain_standard?: "Elite 1024-dim";
    };
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
   * UPGRADED: Aligned for 1-million-token context window processing.
   */
  export class AIMessage extends BaseMessage {
    /** 
     * AUTONOMOUS AGENCY: Intent to execute physical BBU1 tools 
     * (Ledger Seals, SACCO Dividends, ERP Routing). 
     */
    tool_calls?: {
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }[]; 
    constructor(content: string, fields?: { tool_calls?: any[] });
  }
  
  /** Represents factual observations from the 1024-dim BBU1 database nodes. */
  export class ToolMessage extends BaseMessage {
    /** The unique forensic link to the original tool request. */
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
    /** The key in the input object that holds the BaseMessage array. */
    variableName: string;
    constructor(variableName?: string);
    /** Retrieves formatted history for the current reasoning pulse. */
    getMessages(values: Record<string, any>): BaseMessage[];
  }

  /**
   * EXECUTIVE MESSAGE INPUT
   * A valid message definition for the C-Suite factory.
   */
  export type MessageInput = [MessageRole, string] | MessagesPlaceholder;

  /**
   * THE SOVEREIGN CHAT PROMPT TEMPLATE
   * The motherboard for assembling high-density instructions for the Cloud Brain.
   * Manages variable interpolation, partial hydration, and 1024-dim semantic alignment.
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
     * Creates a Sovereign Template from high-density message definitions.
     * @param messages An array of high-density message tuples or Placeholders.
     */
    static fromMessages(messages: (MessageInput | [string, string])[]): ChatPromptTemplate;

    /**
     * PARTIAL NEURAL HYDRATION
     * Pre-fills variables (like BusinessID) to create reusable templates.
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
    
    /**
     * formatMessages
     * Explicit alias to ensure compatibility with deep Kernel streaming.
     */
    formatMessages(values?: Record<string, any>): Promise<BaseMessage[]>;
  }
}

/**
 * STATUS: Linguistic Definitions Saturated.
 * ENGINE: Gemini 1.5 Pro Reasoning / Voyage-2 Elite Memory.
 * VERSION: v14.0 Sovereign Core.
 * JURISDICTION: Unified Business Universe (BBU1).
 */