// src/lib/ai-tools/index.ts
// The definitive single, authoritative public API for the AI's capabilities.
// This file acts as the bridge between the Core Brain (Kernel) and the physical Tools.

// --- Concrete Tools Exports from data.ts ---
// ✅ UPGRADED: Added the Boardroom, Forensic Audit, and Autonomous Editor
export {
    SupabaseToolFactory,
    ProcessPaymentTool,
    FileExporterTool,
    IngestKnowledgeTool,
    KnowledgeRetrievalTool,
    DataTransformerTool,
    // ✅ FORCE SYNC: Mapping the physical logic to the names expected by the Manifest
    SovereignSearchTool as MarketIntelligenceTool,
    BoardroomPresentationTool,
    ForensicAuditTool,
    AutonomousEditorTool
} from './data';

// --- System Awareness Tools ---
export {
    SystemEventLoggerTool,
    DatabaseSchemaScannerTool,
    APIRouteScannerTool
} from './system';

// --- UI and Interaction Tools ---
export {
    UINavigationTool,
    CommunicationDraftTool
} from './ui';

// --- Concrete Class and Runtime Exports ---
// ✅ CONSTRUCTOR FIX: These shims prevent the 'w.Wy is not a constructor' build error.
export {
    ChatOllama
} from '../langchain/chat-ollama-shim';

export {
    AgentExecutor, // Export the AgentExecutor class as a named export
    createReactAgent, // Export the agent factory function
} from '../langchain/langchain-agents-shim'; 

// Export explicitly the concrete class for PromptTool from core-prompts-shim
export {
    PromptTool // The Base Tool Abstract Class is a concrete value/class export
} from '../langchain/core-prompts-shim';

// --- Type/Interface Exports (CRITICAL FIX for isolatedModules/Next.js) ---
export type {
    ChatOllamaOptions, 
    OllamaMessage,
    ToolCall
} from '../langchain/chat-ollama-shim';

// Explicitly export types from core-prompts-shim
export type {
    IPromptTool as ChatTool,
    RunnableConfig,
    RunManager,
    BaseMessage, 
    SystemMessage, 
    HumanMessage, 
    AIMessage,    
    ToolMessage,  
    MessagesPlaceholder, 
    ChatPromptTemplate, 
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
// All necessary exports are now explicit above to maintain Sovereign integrity.