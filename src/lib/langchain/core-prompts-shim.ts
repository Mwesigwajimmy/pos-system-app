import { z } from 'zod';
import { ToolCall } from '@langchain/community/chat_models/ollama'; // <--- IMPORT ToolCall here

type MessageRole = 'system' | 'human' | 'ai' | 'tool';

export class BaseMessage {
  content: string;
  role: MessageRole;

  constructor(content: string, role: MessageRole) {
    this.content = content;
    this.role = role;
  }
}

export class SystemMessage extends BaseMessage {
  constructor(content: string) {
    super(content, 'system');
  }
}

export class HumanMessage extends BaseMessage {
  constructor(content: string) {
    super(content, 'human');
  }
}

export class AIMessage extends BaseMessage {
  // --- FIX: Add the tool_calls property ---
  tool_calls?: ToolCall[]; 

  constructor(content: string, fields?: { tool_calls?: ToolCall[] }) {
    super(content, 'ai');
    // --- FIX: Assign tool_calls if provided ---
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

  constructor(variableName = 'chat_history') {
    this.variableName = variableName;
  }

  getMessages(values: Record<string, any>): BaseMessage[] {
    const messages = values[this.variableName];
    if (!messages) {
      return [];
    }
    if (!Array.isArray(messages)) {
      throw new Error(
        `Value for MessagesPlaceholder "${this.variableName}" must be an array of BaseMessage objects.`
      );
    }
    return messages;
  }
}

class MessageTemplate {
  template: string;
  role: MessageRole;

  constructor(template: string, role: MessageRole) {
    this.template = template;
    this.role = role;
  }

  format(values: Record<string, any>): BaseMessage {
    const content = this.template.replace(/{(\w+)}/g, (_, key) => {
      if (values[key] !== undefined) {
        return String(values[key]);
      }
      return `{${key}}`;
    });

    switch (this.role) {
      case 'system':
        return new SystemMessage(content);
      case 'human':
        return new HumanMessage(content);
      case 'ai':
        // No tool_calls logic here, as it's for parsing LLM output
        return new AIMessage(content); 
      default:
        return new BaseMessage(content, this.role);
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

  static fromMessages(
    messages: (
      | [string, string]
      | MessagesPlaceholder
      | MessageTemplate
    )[]
  ): ChatPromptTemplate {
    const promptMessages = messages.map((msg) => {
      if (msg instanceof MessagesPlaceholder || msg instanceof MessageTemplate) {
        return msg;
      }
      if (Array.isArray(msg) && msg.length === 2) {
        const [role, template] = msg;
        return new MessageTemplate(template, role as MessageRole);
      }
      throw new Error('Invalid message format. Must be a tuple [role, template], a MessagesPlaceholder, or a MessageTemplate.');
    });
    return new ChatPromptTemplate(promptMessages);
  }

  private discoverInputVariables(messages: PromptMessage[]): string[] {
    const variables = new Set<string>();
    for (const msg of messages) {
      if (msg instanceof MessageTemplate) {
        const matches = msg.template.matchAll(/{(\w+)}/g);
        for (const match of matches) {
          variables.add(match[1]);
        }
      } else if (msg instanceof MessagesPlaceholder) {
        variables.add(msg.variableName);
      }
    }
    return Array.from(variables);
  }

  partial(values: Record<string, any>): ChatPromptTemplate {
    const newMessages = this.messages.map((msg) => {
      if (msg instanceof MessageTemplate) {
        const newTemplateString = msg.template.replace(/{(\w+)}/g, (match, key) => {
          return values[key] !== undefined ? String(values[key]) : match;
        });
        return new MessageTemplate(newTemplateString, msg.role);
      }
      return msg;
    });
    return new ChatPromptTemplate(newMessages);
  }

  format(values: Record<string, any> = {}): BaseMessage[] {
    const result: BaseMessage[] = [];
    for (const msg of this.messages) {
      if (msg instanceof MessageTemplate) {
        result.push(msg.format(values));
      } else if (msg instanceof MessagesPlaceholder) {
        const placeholderMessages = msg.getMessages(values);
        result.push(...placeholderMessages);
      }
    }
    return result;
  }
}

export interface RunnableConfig {
  configurable?: { [key: string]: any };
  [key: string]: any;
}

export interface RunManager {
  config: RunnableConfig;
}

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
      return await this._execute(validatedInput, { config });
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred during tool execution.';
      try {
        const { SystemEventLoggerTool } = await import('../ai-tools');
        const logger = new SystemEventLoggerTool();
        await logger.invoke({
          event_type: "error",
          payload: {
            failed_tool: this.name,
            error_message: errorMessage,
            input_provided: input,
            business_id: config.configurable?.businessId,
            user_id: config.configurable?.userId,
          }
        }, config);
      } catch (logError) {
        console.error("Critical: Failed to log system event from tool catch block.", logError);
      }
      return JSON.stringify({ success: false, error: `Tool ${this.name} failed: ${errorMessage}` });
    }
  }
}