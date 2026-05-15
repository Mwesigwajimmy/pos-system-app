// src/lib/langchain/index.ts
/**
 * --- BBU1 SOVEREIGN NEURAL ORCHESTRATION HUB ---
 * VERSION: v14.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * This index serves as the primary export gateway for the LangChain abstraction layer.
 * 
 * UPGRADED: 
 * 1. NEURAL CORE: Powered by the Google Gemini 1.5 Cloud Engine.
 * 2. MEMORY ALIGNMENT: Fully synchronized with the 1024-dim Voyage Elite Memory.
 * 3. SOVEREIGN SHIELD: Provides a forensic-grade abstraction between the BBU1 
 *    Executive Council (CFO, COO, HR, Aura) and the underlying LLM infrastructure.
 */

// 1. ENGINE GATEWAY
// Exporting the Gemini-powered model provider. 
// We maintain the 'ChatOllama' naming convention for internal system compatibility
// and to ensure the AI Kernel Motherboard remains backward compatible.
export * from './chat-ollama-shim';

// 2. AGENT ORCHESTRATION
// Exporting the logic for autonomous multi-agent communication and the ReAct loop.
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
} from './core-prompts-shim';

// Core Tooling Types
export type {
  RunManager as CoreToolsRunManager,
  RunnableConfig as CoreToolsRunnableConfig,
  DynamicToolParams,
} from './core-tools-shim';

// Engine-Specific Tooling Types
export type { ChatOllamaTool } from './chat-ollama-shim';

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

/**
 * STATUS: Sovereign Neural Switchboard Fully Aligned.
 * ENGINE: Google Gemini 1.5 Pro (Forensic Logic).
 * MEMORY: Voyage-2 Elite (1024-dim Retrieval).
 * JURISDICTION: BBU1 Global ERP Infrastructure.
 */