/**
 * --- BBU1 SOVEREIGN NEURAL INTERFACE HUB ---
 * The single authoritative public API for the BBU1 AI Ecosystem.
 * This file orchestrates the bridge between the Executive Kernel (Reasoning)
 * and the physical Module Tools (Action).
 * 
 * UPGRADED: Cloud-Native v10.8 (Omega Sovereign Edition).
 * ENGINE: Official Google Generative AI (Cloud-Sovereign).
 * JURISDICTION: Global Multi-Tenant ERP Architecture.
 */

// =================================================================
// 1. EXECUTIVE DATA & FORENSIC TOOLS (from data.ts)
// =================================================================
// These tools allow agents (CFO, COO) to operate on the physical database.
// Mapping physical logic to the Semantic names used in Manifests.
export {
    SupabaseToolFactory,
    ProcessPaymentTool,
    FileExporterTool,
    IngestKnowledgeTool,
    KnowledgeRetrievalTool,
    DataTransformerTool,
    SovereignSearchTool as MarketIntelligenceTool,
    ForensicAuditTool,
    AutonomousEditorTool
} from './data';

// =================================================================
// 2. SYSTEM INTELLIGENCE & INFRASTRUCTURE (from system.ts)
// =================================================================
// Tools for self-awareness, forensic logging, and schema omniscience.
export {
    SystemEventLoggerTool,
    DatabaseSchemaScannerTool,
    APIRouteScannerTool
} from './system';

// =================================================================
// 3. UI, INTERACTION & SAFETY (from ui.ts)
// =================================================================
// Tools that allow Aura to operate the Dashboard and enforce safety protocols.
export {
    UINavigationTool,
    CommunicationDraftTool,
    UserConfirmationTool, // Forensic 'Safety Brake' for high-risk actions
    // ✅ AUTHORITATIVE FIX: Physically sourced from ui.ts to resolve constructor failure.
    BoardroomPresentationTool 
} from './ui';

// =================================================================
// 4. EXECUTIVE RUNTIME & NEURAL VALUES
// =================================================================
// Physical class constructors required for system execution.
// CRITICAL: Exported as values to prevent "not a constructor" build errors.
export {
    ChatOllama
} from '../langchain/chat-ollama-shim';

export {
    AgentExecutor,    // The 'Motherboard' of the ReAct agent loop
    createReactAgent, // The factory for the Executive Council assembly
} from '../langchain/langchain-agents-shim'; 

export {
    // AUTHORITATIVE PROMPT VALUES
    BaseMessage, 
    SystemMessage, 
    HumanMessage, 
    AIMessage,    
    ToolMessage,  
    MessagesPlaceholder, 
    ChatPromptTemplate,
    PromptTool        // The Sovereign Abstract Base for all BBU1 tools
} from '../langchain/core-prompts-shim';

export {
    DynamicTool       // The Observable Wrapper for dynamic functions
} from '../langchain/core-tools-shim';

// =================================================================
// 5. EXECUTIVE TYPE DEFINITIONS (PRODUCTION SHIELD)
// =================================================================
// Explicitly exported as 'type' to satisfy Next.js isolatedModules.
// This prevents 'Module not found' and 'Constructor' errors in Vercel.
// =================================================================

// Model & Message Handshake Structures
export type {
    ChatOllamaOptions, 
    OllamaMessage,
    ToolCall
} from '../langchain/chat-ollama-shim';

// Orchestration & Configuration Metadata
export type {
    IPromptTool as ChatTool,
    RunnableConfig,
    RunManager
} from '../langchain/core-prompts-shim';

export type {
    DynamicToolParams
} from '../langchain/core-tools-shim';

// Agent Execution & Streaming Event Packets
export type {
    AgentAction,
    AgentFinish,
    AgentStreamEvent,
    AgentExecutorOptions,
    AgentStreamInput
} from '../langchain/langchain-agents-shim';

/**
 * --- INFRASTRUCTURE VERIFICATION ---
 * STATUS: Sovereign Capability Hub Synchronized.
 * VERSION: v10.8 (Sovereign Edition).
 * SECURITY: RLS Isolated / 15-Year Audit Ready.
 * LOGIC: All class constructors (ChatPromptTemplate, etc.) are physically exposed.
 */