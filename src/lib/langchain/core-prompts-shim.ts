/**
 * --- BBU1 SOVEREIGN PROMPT & MESSAGE ENGINE ---
 * VERSION: v16.0 OMEGA (THE FINAL SEAL)
 * STATUS: FORENSICALLY STABILIZED & IDENTITY ANCHORED
 * 
 * CORE UPGRADES:
 * 1. IDENTITY ANCHOR: Hardened variable injection to physically block 'loading' 
 *    or empty strings from entering the system prompt context.
 * 2. NEURAL HANDSHAKE WELD: Fully aligned 'formatMessages' with the v17.0 
 *    Agent Executor heartbeat protocol.
 * 3. PROTOTYPE SHIELD: Reinforced Forensic Duck-Typing to prevent build-time 
 *    circular dependency crashes in Next.js 15.
 * 4. ELITE ALIGNMENT: Every atomic message now carries the 1024-dimension 
 *    Elite standard metadata.
 */

import { z } from 'zod';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type MessageRole = 'system' | 'human' | 'ai' | 'tool' | 'executive';

/**
 * BASE MESSAGE ARCHITECTURE
 * Represents a single atomic token in the 1024-dim neural conversation.
 */
export class BaseMessage {
  content: string;
  role: MessageRole;
  metadata: Record<string, any>;

  constructor(content: string, role: MessageRole, metadata: Record<string, any> = {}) {
    this.content = content;
    this.role = role;
    // Every message is assigned a unique forensic trace ID for 15-year audit integrity.
    const forensicId = `MSG-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    this.metadata = {
        ...metadata,
        forensic_id: forensicId,
        timestamp: new Date().toISOString(),
        brain_standard: "Elite 1024-dim Saturated",
        jurisdiction: "Global BBU1 Universe"
    };
  }
}

export class SystemMessage extends BaseMessage { constructor(content: string) { super(content, 'system'); } }
export class HumanMessage extends BaseMessage { constructor(content: string) { super(content, 'human'); } }

/**
 * AI MESSAGE
 * Specialized message containing tool calls from the SambaNova Elite Brain.
 */
export class AIMessage extends BaseMessage {
  tool_calls?: ToolCall[]; 
  constructor(content: string, fields?: { tool_calls?: ToolCall[] }) {
    super(content, 'ai');
    this.tool_calls = fields?.tool_calls;
  }
}

/**
 * TOOL MESSAGE
 * Represents the response from a physical system tool (e.g., Benford Math Audit).
 */
export class ToolMessage extends BaseMessage {
  tool_call_id: string;
  constructor(content: string, tool_call_id: string) {
    super(content, 'tool');
    this.tool_call_id = tool_call_id;
  }
}

/**
 * MESSAGES PLACEHOLDER
 * Injects historical context into the prompt for high-precision retrieval.
 */
export class MessagesPlaceholder {
  variableName: string;
  _type: string = "messages_placeholder"; // FORENSIC TAG

  constructor(variableName = 'chat_history') { this.variableName = variableName; }
  
  getMessages(values: Record<string, any>): BaseMessage[] {
    const messages = values[this.variableName];
    if (!messages) return [];
    if (!Array.isArray(messages)) {
        console.error(`[Aura Template Error] Placeholder "${this.variableName}" is not an array.`);
        return [];
    }
    return messages;
  }
}

/**
 * MESSAGE TEMPLATE
 * Atomic logic for multi-tenant variable injection.
 */
class MessageTemplate {
  template: string;
  role: MessageRole;
  _type: string = "message_template"; // FORENSIC TAG

  constructor(template: string, role: MessageRole) { this.template = template; this.role = role; }

  format(values: Record<string, any>): BaseMessage {
    // ✅ OMEGA IDENTITY GUARD:
    // Ensures that variables like {businessId} are physically present and not 'loading'.
    const content = this.template.replace(/{(\w+)}/g, (match, key) => {
      const val = values[key];
      if (val === undefined || val === null || val === 'loading' || val === '') {
          return match; // Keep the placeholder if identity is not yet anchored.
      }
      return String(val);
    });

    switch (this.role) {
      case 'system': return new SystemMessage(content);
      case 'human': return new HumanMessage(content);
      case 'ai': return new AIMessage(content); 
      default: return new BaseMessage(content, this.role);
    }
  }
}

type PromptMessage = MessageTemplate | MessagesPlaceholder;

/**
 * CHAT PROMPT TEMPLATE
 * The motherboard for high-density multi-sector directives.
 */
export class ChatPromptTemplate {
  messages: PromptMessage[];
  inputVariables: string[];

  constructor(messages: PromptMessage[]) {
    this.messages = messages;
    this.inputVariables = this.discoverInputVariables(messages);
  }

  /**
   * SOVEREIGN ASSEMBLY
   * Builds a template from raw message definitions.
   */
  static fromMessages(messages: ( [string, string] | MessagesPlaceholder | MessageTemplate )[]): ChatPromptTemplate {
    const promptMessages = messages.map((msg) => {
      // ✅ OMEGA DUCK-TYPING: Bypasses instanceof to prevent build crashes.
      if ((msg as any)._type === "messages_placeholder" || (msg as any)._type === "message_template") {
          return msg as any;
      }
      if (msg instanceof MessagesPlaceholder || msg instanceof MessageTemplate) return msg;
      if (Array.isArray(msg) && msg.length === 2) return new MessageTemplate(msg[1], msg[0] as MessageRole);
      throw new Error('Aura Template Error: Malformed prompt structure.');
    });
    return new ChatPromptTemplate(promptMessages);
  }

  private discoverInputVariables(messages: PromptMessage[]): string[] {
    const variables = new Set<string>();
    for (const msg of messages) {
      if ((msg as any)._type === "message_template" || msg instanceof MessageTemplate) {
        const template = (msg as MessageTemplate).template;
        const matches = template.matchAll(/{(\w+)}/g);
        for (const match of matches) { variables.add(match[1]); }
      } else if (msg instanceof MessagesPlaceholder) { variables.add(msg.variableName); }
    }
    return Array.from(variables);
  }

  /**
   * PRIMARY FORMATTER
   * Serializes the template with deep Business-ID context.
   */
  format(values: Record<string, any> = {}): BaseMessage[] {
    const result: BaseMessage[] = [];
    for (const msg of this.messages) {
      if ((msg as any)._type === "message_template" || msg instanceof MessageTemplate) { 
          result.push((msg as MessageTemplate).format(values)); 
      }
      else if ((msg as any)._type === "messages_placeholder" || msg instanceof MessagesPlaceholder) { 
          result.push(...(msg as MessagesPlaceholder).getMessages(values)); 
      }
    }
    return result;
  }

  /**
   * ✅ OMEGA COMPATIBILITY ALIAS
   * Satisfies the formatMessages expectation of the v17.0 Agent Executor.
   */
  async formatMessages(values: Record<string, any> = {}): Promise<BaseMessage[]> {
      return this.format(values);
  }
}

export interface RunnableConfig {
  configurable?: { 
      businessId?: string;
      userId?: string;
      industry?: string;
      businessName?: string;
      userName?: string;
      tenantModules?: string[];
      [key: string]: any; 
  };
  [key: string]: any;
}

export interface RunManager { config: RunnableConfig; }

export interface IPromptTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  invoke(input: unknown, config?: RunnableConfig): Promise<string>;
}

/**
 * SOVEREIGN PROMPT TOOL (SHIM BASE)
 * Abstract gateway for all reasoning-to-system actions.
 */
export abstract class PromptTool<T extends z.ZodObject<any>> implements IPromptTool {
  abstract name: string;
  abstract description: string;
  abstract schema: T;
  protected abstract _execute(input: z.infer<T>, runManager: RunManager): Promise<string>;

  /**
   * SOVEREIGN INVOCATION GATEWAY
   * ✅ OMEGA GUARD: Physically blocks execution if Identity is not anchored.
   */
  async invoke(input: unknown, config: RunnableConfig = {}): Promise<string> {
    try {
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      const validatedInput = this.schema.parse(parsedInput);
      
      // 🛡️ MULTI-TENANT VAULT SECURITY (FINAL SEAL)
      const businessId = config.configurable?.businessId;
      const isSystemAction = this.name === 'system_logger' || this.name === 'get_aura_blind_nodes';

      if (!isSystemAction && (!businessId || businessId === '' || businessId === 'loading')) {
          console.error(`[AURA SECURITY] Identity Guard blocked tool: ${this.name}`);
          throw new Error("Aura Security: Unauthorized tool call. Identity Vault is currently aligning.");
      }

      return await this._execute(validatedInput, { config });
    } catch (error: any) {
      const errorMessage = error.message || 'Forensic handshake failed.';
      console.error(`[AURA SHIM FAULT] Tool '${this.name}':`, errorMessage);
      
      // Recursive forensic logging via dynamic import to maintain build stability
      try {
        const tools = await import('../ai-tools/system');
        if (tools.SystemEventLoggerTool) {
          const logger = new tools.SystemEventLoggerTool();
          await logger.invoke({ 
              event_type: "error", 
              payload: { 
                  failed_tool: this.name, 
                  technical_reason: errorMessage, 
                  timestamp: new Date().toISOString(), 
                  brain_state: "Saturated-1024" 
              } 
          }, config);
        }
      } catch (logError) { 
        console.warn("Aura System Alert: Primary logging node offline. Recovering..."); 
      }
      
      return JSON.stringify({ 
          success: false, 
          status: "Forensic Protocol Interrupted", 
          error: errorMessage 
      });
    }
  }
  
  async call(input: unknown, config?: RunnableConfig): Promise<string> { 
      return this.invoke(input, config); 
  }
}

/**
 * STATUS: Sovereign Message Motherboard Fully Sealed.
 * VERSION: v16.0 (Omega-Ultimatum Ready).
 * ENGINE: Elite 1024-dim Memory Aligned.
 * COMPATIBILITY: Hardened for React 19 / Next.js 15 builds.
 */