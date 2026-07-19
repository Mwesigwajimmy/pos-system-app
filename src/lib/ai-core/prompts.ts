/**
 * --- BBU1 SOVEREIGN PROMPT & MESSAGE ENGINE ---
 * VERSION: v10.3 OMEGA-CONCIERGE (THE RECEPTIONIST UPGRADE)
 * The definitive orchestration layer for linguistic business intelligence.
 * This engine handles the translation of C-Suite directives into model-ready structures.
 * 
 * Capability: Multi-Lingual Templating, Forensic Metadata, ReAct Scratchpad Support.
 * UPGRADED: Added Telephony Signal Processing & Web-Visitor Pathway Context.
 * Integrity Grade: OMEGA-LEVEL / Executive Audit Ready.
 */

// --- 1. SOVEREIGN MESSAGE ARCHITECTURE ---

/**
 * MESSAGE ROLES
 * system: Core Directive
 * human: Director inquiry (Text)
 * telephony: Inbound/Outbound voice transcript 🎙️
 * visitor: Web-visitor event (Pathway tracking) 🌐
 * ai: Aura Reasoning/Response
 * tool: Database/API Observation
 * executive: C-Suite High-Level Protocol
 */
export type MessageRole = 'system' | 'human' | 'ai' | 'tool' | 'executive' | 'telephony' | 'visitor';

/**
 * AUTHORITATIVE BASE MESSAGE
 * The physical root of all linguistic data within the BBU1 Universe.
 */
export class BaseMessage {
  constructor(
    public content: string,
    public role: string,
    public metadata: Record<string, any> = { 
      timestamp: new Date().toISOString(),
      forensic_seal: Math.random().toString(36).substring(7) 
    }
  ) {}
}

/**
 * HUMAN MESSAGE (DIRECTOR)
 * Represents commands or inquiries from the Director or Business Owner via text.
 */
export class HumanMessage extends BaseMessage {
  constructor(content: string) {
    super(content, 'human');
  }
}

/**
 * TELEPHONY MESSAGE (VOICE)
 * 🎙️ Represent transcripts from incoming or outgoing phone calls.
 * Includes Caller ID and Telephony Session metadata for Forensic logging.
 */
export class TelephonyMessage extends BaseMessage {
  constructor(content: string, callerId: string, sessionId: string) {
    super(content, 'telephony');
    this.metadata.caller_id = callerId;
    this.metadata.telephony_session = sessionId;
  }
}

/**
 * VISITOR PATHWAY MESSAGE
 * 🌐 Represents real-time website visitor activity.
 * Allows Aura to proactively "speak" to users based on the page they are viewing.
 */
export class VisitorMessage extends BaseMessage {
  constructor(pathway: string, fingerprint: string) {
    super(`Visitor is currently viewing: ${pathway}`, 'visitor');
    this.metadata.visitor_fingerprint = fingerprint;
    this.metadata.current_pathway = pathway;
  }
}

/**
 * AI MESSAGE (AURA / AGENTS)
 * Represents thoughts, reasoning, or final conclusions from the Executive Council.
 * UPGRADED: Now handles voice synthesis parameters for the Receptionist identity.
 */
export class AIMessage extends BaseMessage {
  public tool_calls?: any[];
  public voice_settings?: {
    accent?: string;
    speed?: number;
    tonality?: 'professional' | 'warm' | 'urgent' | 'executive';
  };

  constructor(content: string, fields?: { tool_calls?: any[], voice_settings?: any }) {
    super(content, 'ai');
    if (fields?.tool_calls) {
      this.tool_calls = fields.tool_calls;
    }
    if (fields?.voice_settings) {
      this.voice_settings = fields.voice_settings;
    }
  }
}

/**
 * SYSTEM MESSAGE (DIRECTIVE)
 * Represents the Sovereign "Black Box" instructions (Omega Ultimatum).
 */
export class SystemMessage extends BaseMessage {
  constructor(content: string) {
    super(content, 'system');
  }
}

/**
 * TOOL MESSAGE (OBSERVATION)
 * Represents the factual result of a database query or external API call.
 */
export class ToolMessage extends BaseMessage {
  constructor(content: string, public tool_call_id: string) {
    super(content, 'tool');
  }
}

// --- 2. DYNAMIC CONTEXT HANDLERS ---

/**
 * MESSAGES PLACEHOLDER
 * Orchestrates the injection of historical "Neural Memory" (chat history) into a prompt.
 */
export class MessagesPlaceholder {
  constructor(public variableName: string = 'chat_history') {}

  /**
   * Hydrates the placeholder with real messages from the session context.
   */
  getMessages(values: Record<string, any>): BaseMessage[] {
    const messages = values[this.variableName];
    if (!messages) return [];
    
    if (!Array.isArray(messages)) {
      throw new Error(`Aura Context Fault: Placeholder "${this.variableName}" requires an array of BaseMessage objects.`);
    }
    return messages;
  }
}

/**
 * MESSAGE TEMPLATE
 * A linguistic blueprint that supports dynamic variable injection using {key} syntax.
 */
class MessageTemplate {
  constructor(public template: string, public role: string) {}

  /**
   * Performs high-precision string interpolation for sector-specific variables.
   */
  format(values: Record<string, any>): BaseMessage {
    const content = this.template.replace(/{(\w+)}/g, (match, key) => {
      if (values[key] !== undefined) {
        return String(values[key]);
      }
      return match; // Keep the {key} if no value is provided (allows partial formatting)
    });

    switch (this.role) {
      case 'system':    return new SystemMessage(content);
      case 'human':     return new HumanMessage(content);
      case 'telephony': return new TelephonyMessage(content, values.caller_id, values.session_id);
      case 'visitor':   return new VisitorMessage(values.pathway, values.fingerprint);
      case 'ai':        return new AIMessage(content);
      default:          return new BaseMessage(content, this.role);
    }
  }
}

// --- 3. THE EXECUTIVE PROMPT ORCHESTRATOR ---

/**
 * CHAT PROMPT TEMPLATE (SOVEREIGN EDITION)
 * The motherboard for assembling complex multi-agent instructions.
 * Designed to satisfy the "Omniscience" requirements of the BBU1 Kernel.
 */
export class ChatPromptTemplate {
  constructor(public messages: (MessageTemplate | MessagesPlaceholder)[]) {}

  /**
   * Static Factory: Assembles a template from a tuple list or existing placeholders.
   * Format: [ ["system", "You are {name}"], new MessagesPlaceholder("history") ]
   */
  static fromMessages(
    messages: ([string, string] | MessagesPlaceholder | MessageTemplate)[]
  ): ChatPromptTemplate {
    const promptMessages = messages.map((msg) => {
      if (msg instanceof MessagesPlaceholder || msg instanceof MessageTemplate) {
        return msg;
      }
      if (Array.isArray(msg) && msg.length === 2) {
        return new MessageTemplate(msg[1], msg[0]);
      }
      throw new Error('Aura Template Error: Invalid message segment detected during assembly.');
    });
    return new ChatPromptTemplate(promptMessages);
  }

  /**
   * PARTIAL FORMATTING
   * Allows the Kernel to fill in some variables (like Business Name) while leaving
   * others (like User Input) for the final execution pass.
   */
  partial(values: Record<string, any>): ChatPromptTemplate {
    const newMessages = this.messages.map((msg) => {
      if (msg instanceof MessageTemplate) {
        const partiallyFormattedText = msg.template.replace(/{(\w+)}/g, (match, key) => {
          return values[key] !== undefined ? String(values[key]) : match;
        });
        return new MessageTemplate(partiallyFormattedText, msg.role);
      }
      return msg;
    });
    return new ChatPromptTemplate(newMessages);
  }

  /**
   * FINAL NEURAL HYDRATION
   * Flattens templates and placeholders into a pure array of BaseMessages for the LLM.
   */
  format(values: Record<string, any> = {}): BaseMessage[] {
    return this.messages.flatMap((msg) => {
      if (msg instanceof MessageTemplate) {
        return msg.format(values);
      } else if (msg instanceof MessagesPlaceholder) {
        return msg.getMessages(values);
      }
      return [];
    });
  }
}

/**
 * STATUS: Sovereign Prompt Engine Online.
 * VERSION: v10.3 (Omega Concierge Ready)
 * TARGET: Multi-Agent C-Suite + Telephony Gateway (Vapi/Retell).
 */