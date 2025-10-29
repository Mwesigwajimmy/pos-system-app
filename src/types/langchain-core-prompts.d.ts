// src/types/langchain-core-prompts.d.ts
// A comprehensive, "revolutionary" declaration file for a powerful and
// type-safe prompt templating system.

declare module "@langchain/core/prompts" {

  // --- Core Message Types ---

  /** The role of the message author. */
  export type MessageRole = 'system' | 'human' | 'ai' | 'tool';

  /**
   * The base interface for a structured message.
   */
  export class BaseMessage {
    content: string;
    role: MessageRole;
    constructor(content: string, role: MessageRole);
  }

  export class SystemMessage extends BaseMessage {
    constructor(content: string);
  }

  export class HumanMessage extends BaseMessage {
    constructor(content: string);
  }

  export class AIMessage extends BaseMessage {
    constructor(content: string);
  }
  
  export class ToolMessage extends BaseMessage {
    tool_call_id: string;
    constructor(content: string, tool_call_id: string);
  }

  // --- Prompt Template Components ---

  /**
   * A placeholder for a dynamic list of messages, typically used for injecting
   * conversation history into a prompt.
   */
  export class MessagesPlaceholder {
    /** The name of the variable in the input object that holds the message history. */
    variableName: string;
    constructor(variableName?: string);
  }

  /**
   * Represents a valid message input for the `fromMessages` factory.
   * It can be a tuple of `[role, template_string]` or a `MessagesPlaceholder`.
   */
  export type MessageInput = [MessageRole, string] | MessagesPlaceholder;

  /**
   * A powerful template for creating structured chat prompts.
   * It manages variables, placeholders, and formats the final output into an
   * array of message objects ready for a chat model.
   */
  export class ChatPromptTemplate {
    /**
     * An array of all input variables that the template expects.
     * Automatically inferred from the message templates.
     */
    readonly inputVariables: string[];

    constructor(messages: any[]); // The internal constructor is kept flexible

    /**
     * Creates a ChatPromptTemplate from a user-friendly array of message definitions.
     * @param messages An array of message tuples or MessagesPlaceholder instances.
     */
    static fromMessages(messages: MessageInput[]): ChatPromptTemplate;

    /**
     * Partially applies variables to the prompt template, returning a new template.
     * This is useful for creating reusable templates with some values pre-filled.
     * @param values An object mapping variable names to their values.
     * @returns A new ChatPromptTemplate instance with the provided values applied.
     */
    partial(values: Record<string, any>): ChatPromptTemplate;

    /**
     * Formats the prompt template with the given values into a structured array
     * of BaseMessage objects, ready to be sent to a chat model.
     * @param values An object containing the values for all required input variables.
     * @returns An array of formatted BaseMessage objects.
     */
    format(values?: Record<string, any>): BaseMessage[];
  }
}