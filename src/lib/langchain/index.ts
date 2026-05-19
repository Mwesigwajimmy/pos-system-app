// src/lib/langchain/index.ts
/**
 * --- BBU1 SOVEREIGN NEURAL ORCHESTRATION HUB ---
 * VERSION: v15.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * This index serves as the primary export gateway for the LangChain abstraction layer.
 * 
 * UPGRADED: 
 * 1. NEURAL CORE: Powered by the SambaNova Meta-Llama-3.3-70B-Instruct Engine.
 * 2. MEMORY ALIGNMENT: Fully synchronized with the 1024-dim Jina Elite Memory Core.
 * 3. SOVEREIGN SHIELD: Provides a forensic-grade abstraction between the BBU1 
 *    Executive Council (CFO, COO, HR, Aura) and the underlying Cloud infrastructure.
 * 4. HANDSHAKE STABILITY: Unified export paths to prevent "Neural Link" desync.
 */

// 1. ENGINE GATEWAY
// Exporting the SambaNova-powered model provider. 
// We maintain the 'ChatOllama' naming convention for internal system compatibility
// and to ensure the AI Kernel Motherboard remains backward compatible.
export * from './chat-ollama-shim';

// 2. AGENT ORCHESTRATION
// Exporting the logic for autonomous multi-agent communication and the ReAct loop.
// v15.3 includes the mandatory variable pass-through for multi-tenant vaults.
export * from './langchain-agents-shim';

/**
 * 3. TYPE DEFINITIONS & INTERFACES (Executive Metadata)
 * Explicitly export types using 'export type' for strict isolatedModules compatibility.
 * This ensures the Next.js compiler treats these as metadata for high-speed, 
 * zero-fault production builds.
 */

// Core Prompting Types
export type {
  RunManager as CorePromptsRunManager,
  RunnableConfig as CorePromptsRunnableConfig,
  IPromptTool,
  ToolCall,
  MessageRole,
} from './core-prompts-shim';

// Core Tooling Types
export type {
  RunManager as CoreToolsRunManager,
  RunnableConfig as CoreToolsRunnableConfig,
  DynamicToolParams,
} from './core-tools-shim';

// Agent & Stream Types
export type {
  AgentStreamEvent,
  AgentStreamInput,
  AgentAction,
  AgentFinish,
} from './langchain-agents-shim';

// Engine-Specific Tooling Types
export type { ChatOllamaTool, ChatOllamaOptions } from './chat-ollama-shim';

/**
 * 4. EXECUTIVE VALUES & LOGIC (The Neural Core)
 * Exporting the physical classes that drive Aura's high-definition intelligence.
 */

// Message & Template Architecture (Aura's Speech)
// These classes allow Aura to communicate with the Director and her Council.
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

// Dynamic Tooling Architecture (Aura's Hands)
// This enables the CFO/COO agents to operate Ledgers, Medical Records, and Inventory
// using the 1024-dimensional semantic search protocols.
export {
  DynamicTool,
} from './core-tools-shim';

// Autonomous Execution Motherboard
export {
  AgentExecutor,
  createReactAgent,
} from './langchain-agents-shim';

/**
 * STATUS: Sovereign Neural Switchboard Fully Aligned & Anchored.
 * ENGINE: SambaNova Llama 3.3 70B (Forensic Logic).
 * MEMORY: Jina Elite (1024-dim Saturated Retrieval).
 * JURISDICTION: BBU1 Global ERP Infrastructure (Multi-Tenant).
 * VERSION: v15.0 OMEGA-ULTIMATUM.
 */