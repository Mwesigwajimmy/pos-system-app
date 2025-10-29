// Export all from chat-ollama-shim (safe, no conflict)
export * from './chat-ollama-shim';

// Export all from langchain-agents-shim (safe, no conflict)
export * from './langchain-agents-shim';

// Explicitly export/alias types using 'export type' for isolatedModules compatibility.
export type {
  RunManager as CorePromptsRunManager,
  RunnableConfig as CorePromptsRunnableConfig,
  IPromptTool,
} from './core-prompts-shim';

export type {
  RunManager as CoreToolsRunManager,
  RunnableConfig as CoreToolsRunnableConfig,
  DynamicToolParams,
} from './core-tools-shim';

// Export values/classes normally
export {
  BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
  MessagesPlaceholder,
  ChatPromptTemplate,
  PromptTool,
} from './core-prompts-shim';

export {
  DynamicTool,
} from './core-tools-shim';

// Export any needed aliases for clarity
export type { ChatOllamaTool } from './chat-ollama-shim';