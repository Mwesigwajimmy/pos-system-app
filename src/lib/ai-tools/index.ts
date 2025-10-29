// The definitive single, authoritative public API for the AI's capabilities.

// --- Concrete Tools Exports ---
export {
    SupabaseToolFactory,
    ProcessPaymentTool,
    FileExporterTool,
    IngestKnowledgeTool,
    KnowledgeRetrievalTool,
    DataTransformerTool
} from './data';

export {
    SystemEventLoggerTool,
    DatabaseSchemaScannerTool,
    APIRouteScannerTool
} from './system';

export {
    UINavigationTool,
    CommunicationDraftTool
}
from './ui';

// --- Concrete Class and Runtime Exports ---
export {
    ChatOllama
} from '../langchain/chat-ollama-shim';

export {
    AgentExecutor, // Export the AgentExecutor class as a named export
    createReactAgent, // Export the agent factory function
} from '../langchain/langchain-agents-shim'; // From your agent shim

// Export explicitly the concrete class for PromptTool from core-prompts-shim
export {
    PromptTool // The Base Tool Abstract Class is a concrete value/class export
} from '../langchain/core-prompts-shim';

// --- Type/Interface Exports (CRITICAL FIX for isolatedModules/Next.js) ---
export type {
    ChatOllamaOptions, // FIX: Exported as type from shim
    OllamaMessage,
    ToolCall
} from '../langchain/chat-ollama-shim';

// Explicitly export types from core-prompts-shim
export type {
    IPromptTool as ChatTool,
    RunnableConfig,
    RunManager,
    BaseMessage, // Re-exporting BaseMessage type
    SystemMessage, // Re-exporting SystemMessage type
    HumanMessage, // Re-exporting HumanMessage type
    AIMessage,    // Re-exporting AIMessage type (with tool_calls fix)
    ToolMessage,  // Re-exporting ToolMessage type
    MessagesPlaceholder, // Re-exporting MessagesPlaceholder type
    ChatPromptTemplate, // Re-exporting ChatPromptTemplate type
} from '../langchain/core-prompts-shim';

// Explicitly export types from langchain-agents-shim
export type {
    AgentAction,
    AgentFinish,
    AgentStreamEvent,
    AgentExecutorOptions,
    AgentStreamInput
} from '../langchain/langchain-agents-shim';

// REMOVED: export * from '../langchain/core-prompts-shim';
// This line caused potential conflicts and duplicate default errors.
// All necessary exports are now explicit above.