// src/lib/langchain/core-prompts-shim.ts
/**
 * --- BBU1 SOVEREIGN PROMPT & MESSAGE ENGINE ---
 * VERSION: v15.2 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * STATUS: FORENSICALLY STABILIZED & HANDSHAKE ALIGNED
 * 
 * UPGRADE LOG:
 * 1. TEMPLATE RESILIENCE: Upgraded regex to handle multi-tenant variable injection.
 * 2. IDENTITY ANCHOR: Maintained forensic_id and 1024-dim brain standards.
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

export class BaseMessage {
  content: string;
  role: MessageRole;
  metadata: Record<string, any>;

  constructor(content: string, role: MessageRole, metadata: Record<string, any> = {}) {
    this.content = content;
    this.role = role;
    const forensicId = `MSG-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    this.metadata = {
        ...metadata,
        forensic_id: forensicId,
        timestamp: new Date().toISOString(),
        brain_standard: "Elite 1024-dim",
        jurisdiction: "Global BBU1"
    };
  }
}

export class SystemMessage extends BaseMessage { constructor(content: string) { super(content, 'system'); } }
export class HumanMessage extends BaseMessage { constructor(content: string) { super(content, 'human'); } }
export class AIMessage extends BaseMessage {
  tool_calls?: ToolCall[]; 
  constructor(content: string, fields?: { tool_calls?: ToolCall[] }) {
    super(content, 'ai');
    this.tool_calls = fields?.tool_calls;
  }
}
export class ToolMessage extends BaseMessage {
  tool_call_id: string;
  constructor(content: string, tool_call_id: string) {
    super(content, 'tool');
    this.tool_call_id = tool_call_id;
  }
}

export class MessagesPlaceholder {
  variableName: string;
  constructor(variableName = 'chat_history') { this.variableName = variableName; }
  getMessages(values: Record<string, any>): BaseMessage[] {
    const messages = values[this.variableName];
    if (!messages) return [];
    if (!Array.isArray(messages)) throw new Error(`Aura Core Error: MessagesPlaceholder "${this.variableName}" must be an array.`);
    return messages;
  }
}

class MessageTemplate {
  template: string;
  role: MessageRole;
  constructor(template: string, role: MessageRole) { this.template = template; this.role = role; }

  format(values: Record<string, any>): BaseMessage {
    // ✅ OMEGA FIX: Robust formatting to prevent "undefined" string injection
    const content = this.template.replace(/{(\w+)}/g, (match, key) => {
      return values[key] !== undefined ? String(values[key]) : match;
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

export class ChatPromptTemplate {
  messages: PromptMessage[];
  inputVariables: string[];
  constructor(messages: PromptMessage[]) {
    this.messages = messages;
    this.inputVariables = this.discoverInputVariables(messages);
  }

  static fromMessages(messages: ( [string, string] | MessagesPlaceholder | MessageTemplate )[]): ChatPromptTemplate {
    const promptMessages = messages.map((msg) => {
      if (msg instanceof MessagesPlaceholder || msg instanceof MessageTemplate) return msg;
      if (Array.isArray(msg) && msg.length === 2) return new MessageTemplate(msg[1], msg[0] as MessageRole);
      throw new Error('Aura Template Error: Invalid prompt format.');
    });
    return new ChatPromptTemplate(promptMessages);
  }

  private discoverInputVariables(messages: PromptMessage[]): string[] {
    const variables = new Set<string>();
    for (const msg of messages) {
      if (msg instanceof MessageTemplate) {
        const matches = msg.template.matchAll(/{(\w+)}/g);
        for (const match of matches) { variables.add(match[1]); }
      } else if (msg instanceof MessagesPlaceholder) { variables.add(msg.variableName); }
    }
    return Array.from(variables);
  }

  format(values: Record<string, any> = {}): BaseMessage[] {
    const result: BaseMessage[] = [];
    for (const msg of this.messages) {
      if (msg instanceof MessageTemplate) { result.push(msg.format(values)); }
      else if (msg instanceof MessagesPlaceholder) { result.push(...msg.getMessages(values)); }
    }
    return result;
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

export abstract class PromptTool<T extends z.ZodObject<any>> implements IPromptTool {
  abstract name: string;
  abstract description: string;
  abstract schema: T;
  protected abstract _execute(input: z.infer<T>, runManager: RunManager): Promise<string>;

  async invoke(input: unknown, config: RunnableConfig = {}): Promise<string> {
    try {
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      const validatedInput = this.schema.parse(parsedInput);
      if (!config.configurable?.businessId && this.name !== 'system_logger' && this.name !== 'get_aura_blind_nodes') {
          throw new Error("Aura Security: Business context missing from tool run.");
      }
      return await this._execute(validatedInput, { config });
    } catch (error: any) {
      const errorMessage = error.message || 'Handshake failed.';
      console.error(`[AURA LINK FAULT] Tool '${this.name}':`, errorMessage);
      try {
        const tools = await import('../ai-tools/system');
        if (tools.SystemEventLoggerTool) {
          const logger = new tools.SystemEventLoggerTool();
          await logger.invoke({ event_type: "error", payload: { failed_tool: this.name, error_message: errorMessage, timestamp: new Date().toISOString(), brain_standard: "Elite 1024-dim" } }, config);
        }
      } catch (logError) { console.error("Forensic logging node unreachable."); }
      return JSON.stringify({ success: false, status: "Neural Link Interrupted", error: errorMessage });
    }
  }
  async call(input: unknown, config?: RunnableConfig): Promise<string> { return this.invoke(input, config); }
}