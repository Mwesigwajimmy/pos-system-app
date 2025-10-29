// This is the full, finalized code for the prompt engine.
export class BaseMessage { constructor(public content: string, public role: string) {} }
export class HumanMessage extends BaseMessage { constructor(content: string) { super(content, 'human'); } }
export class AIMessage extends BaseMessage { constructor(content: string) { super(content, 'ai'); } }
export class SystemMessage extends BaseMessage { constructor(content: string) { super(content, 'system'); } }
export class ToolMessage extends BaseMessage { constructor(content: string, public tool_call_id: string) { super(content, 'tool'); } }
export class MessagesPlaceholder {
  constructor(public variableName: string = 'chat_history') {}
  getMessages(values: Record<string, any>): BaseMessage[] {
    const messages = values[this.variableName];
    if (!messages) return [];
    if (!Array.isArray(messages)) throw new Error(`Value for MessagesPlaceholder "${this.variableName}" must be an array.`);
    return messages;
  }
}
class MessageTemplate {
  constructor(public template: string, public role: string) {}
  format(values: Record<string, any>): BaseMessage {
    const content = this.template.replace(/{(\w+)}/g, (_, key) => values[key] ?? `{${key}}`);
    switch (this.role) {
      case 'system': return new SystemMessage(content);
      case 'human': return new HumanMessage(content);
      case 'ai': return new AIMessage(content);
      default: return new BaseMessage(content, this.role);
    }
  }
}
export class ChatPromptTemplate {
  constructor(public messages: (MessageTemplate | MessagesPlaceholder)[]) {}
  static fromMessages(messages: ( [string, string] | MessagesPlaceholder )[]): ChatPromptTemplate {
    const promptMessages = messages.map(msg => msg instanceof MessagesPlaceholder ? msg : new MessageTemplate(msg[1], msg[0]));
    return new ChatPromptTemplate(promptMessages);
  }
  format(values: Record<string, any> = {}): BaseMessage[] {
    return this.messages.flatMap(msg => msg instanceof MessageTemplate ? msg.format(values) : msg.getMessages(values));
  }
}