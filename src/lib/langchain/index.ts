/**
 * --- BBU1 SOVEREIGN NEURAL ORCHESTRATION HUB ---
 * This index serves as the primary export gateway for the LangChain abstraction layer.
 * UPGRADED: Now powered by the Google Gemini 1.5 Cloud Engine.
 * 
 * This layer provides a "Sovereign Shield" between the BBU1 Executive Council 
 * (CFO, COO, HR, Aura) and the underlying LLM infrastructure.
 */

// 1. ENGINE GATEWAY
// Exporting the Gemini-powered model provider. 
// We maintain the 'ChatOllama' naming convention for internal system compatibility.
export * from './chat-ollama-shim';

// 2. AGENT ORCHESTRATION
// Exporting the logic for autonomous multi-agent communication.
export * from './langchain-agents-shim';

/**
 * 3. TYPE DEFINITIONS & INTERFACES (Executive Metadata)
 * Explicitly export types using 'export type' for strict isolatedModules compatibility.
 * This ensures the Next.js compiler treats these as metadata for high-speed builds.
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
 * Exporting the physical classes that drive Aura's intelligence.
 */

// Message & Template Architecture (Aura's Speech)
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
// This enables the CFO/COO agents to operate Ledgers and Inventory.
export {
  DynamicTool,
} from './core-tools-shim';

/**
 * STATUS: Sovereign Neural Link Established.
 * ENGINE: Google Gemini 1.5 Pro (via GeminiChatModel Shim)
 * COMPATIBILITY: Full backward compatibility with the BBU1 AI Kernel.
 */