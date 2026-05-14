// src/lib/ai-core/kernel.ts
/**
 * --- BBU1 SOVEREIGN AI KERNEL (OMEGA-ULTIMATUM EDITION) ---
 * The central nervous system of the BBU1 Ecosystem.
 * This motherboard orchestrates the flow between linguistic reasoning (Gemini Cloud)
 * and physical enterprise action (Sovereign ERP Tools).
 * 
 * Capability: Autonomous Multi-Agent ReAct Loop, Forensic Auditing, Visual Stage Setup.
 * UPGRADED: Cloud-Sovereign Engine v10.8.
 * ENGINE: Google Gemini 1.5 Pro Integration.
 * JURISDICTION: Global Multi-Tenant Architecture.
 */

import { ITool } from './tools';
import { AI_IDENTITY } from './manifest';

/**
 * ✅ OMEGA ARCHITECTURAL FIX: DIRECT PATH RESOLUTION
 * We bypass the '@/lib/ai-tools' index hub entirely for core classes.
 * This is the ONLY way to prevent the "TypeError: w._P is not a constructor" error
 * during the Next.js production build / static optimization phase.
 */
import { ChatOllama } from '@/lib/langchain/chat-ollama-shim';
import { 
    ChatPromptTemplate, 
    MessagesPlaceholder, 
    BaseMessage 
} from '@/lib/langchain/core-prompts-shim';
import { 
    AgentExecutor, 
    createReactAgent 
} from '@/lib/langchain/langchain-agents-shim';

// Types are imported separately for strict build isolation
import type { 
    AgentStreamEvent, 
    AgentStreamInput 
} from '@/lib/langchain/langchain-agents-shim';

/**
 * AIKernel: The Sovereign Motherboard.
 * Manages the high-density lifecycle of a Director's inquiry.
 * Translates Natural Language intent into validated, multi-step system execution.
 */
export class AIKernel {
  private llm: ChatOllama;
  private tools: Map<string, ITool>;
  private prompt: ChatPromptTemplate;
  public verbose: boolean;
  private agentExecutor: AgentExecutor;

  /**
   * KERNEL INITIALIZATION
   * Establishes the high-bandwidth link between reasoning and action.
   */
  constructor(llm: ChatOllama, tools: ITool[], verbose = false) {
    this.llm = llm;
    this.tools = new Map(tools.map(tool => [tool.name, tool]));
    this.verbose = verbose;
    this.prompt = this.createPrompt();

    const toolsArray = Array.from(this.tools.values());

    /**
     * REACT AGENT ASSEMBLY
     * Configures the autonomous 'Think-Act' loop using the local shim factory.
     */
    const agentConfig = createReactAgent({
        llm: this.llm,
        tools: toolsArray as any, 
        prompt: this.prompt as any, 
    });

    /**
     * EXECUTIVE EXECUTOR
     * The physical motherboard that manages the ReAct iterations and event streams.
     */
    this.agentExecutor = new AgentExecutor({
        agent: agentConfig, 
        tools: toolsArray as any, 
        verbose: this.verbose,
        maxSteps: 8 // Forensic safety brake for complex multi-module audits
    });
  }

  /**
   * Internal Diagnostic Protocol
   */
  private log(message: string, ...args: any[]) { 
    if (this.verbose) console.log(`[Aura-Kernel-v10.8] ${message}`, ...args); 
  }

  /**
   * SOVEREIGN EXECUTIVE PROMPT (OMEGA LEVEL)
   * This directive defines the personality, authority, and reasoning rules for Aura.
   * Optimized for the 1-million-token Gemini context window and 11-industry modules.
   */
  private createPrompt(): ChatPromptTemplate {
    const toolNames = Array.from(this.tools.keys()).join(', ');
    const toolDefs = Array.from(this.tools.values())
        .map(t => `- ${t.name}: ${t.description}. Input Schema: ${JSON.stringify(t.schema)}`)
        .join('\n');

    return ChatPromptTemplate.fromMessages([
        ["system", `
            ${AI_IDENTITY.directive}
            
            --- SOVEREIGN CONTEXT & JURISDICTION ---
            - OPERATING SYSTEM: BBU1 (Business Base Universe).
            - COMPLIANCE: IFRS / GAAP / Forensic Grade Auditing.
            - RETENTION POLICY: 15-year immutable audit trail active.
            - SECTOR VISION: Omniscient access to SACCO, Medical, Telecom, Accounting, HR, Logistics, and Engineering.
            
            --- EXECUTIVE COUNCIL DELEGATION ---
            You lead a council of specialized agents. Adopt their persona when performing specific actions:
            - AURA-CFO: Lead treasury officer. Uses 'execute_forensic_audit' and 'execute_financial_seal'.
            - AURA-COO: Operations lead. Uses 'manage_inventory_executive' and 'execute_erp_operation'.
            - AURA-HR: Personnel director. Uses 'hr_payroll_management' for payroll auditing.
            - AURA-CMO: Market intelligence scout. Uses 'get_market_intelligence'.
            
            --- AVAILABLE CORE TOOLS ---
            [${toolNames}]

            --- SPECIALIST TOOL SCHEMAS ---
            ${toolDefs}

            --- AUTONOMOUS REASONING PROTOCOL (ReAct) ---
            1. THOUGHT: Determine the Director's core objective. Decide which C-Suite agent is best suited.
            2. REASON: Identify if 'DatabaseSchemaScanner' or 'RetrieveKnowledge' is needed to heal context.
            3. ACTION: Execute the physical system tool with strict validated parameters.
            4. OBSERVATION: Scan the result for forensic anomalies, tax leakage, or UI math discrepancies.
            5. RECONCILIATION: If a ledger error is detected, use 'aura_autonomous_edit' to heal the system state.
            6. VISUALIZATION: Always use 'prepare_boardroom_presentation' for updates, reports, and briefings.
            7. CONCLUDE: Provide a professional executive summary. State if documents are "Ready for Print".

            --- SECURITY & ISOLATION PROTOCOLS ---
            - STRICT NON-DISCLOSURE: Never reveal SQL, table names, or raw backend hints.
            - TENANT ISOLATION: Operate only within the provided BusinessID context.
            - ADDRESS: Always address the user as "Director" or "Partner".
        `],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}\n\n[Kernel State: Monitoring Scratchpad]"],
    ]);
  }

  /**
   * PRIMARY NEURAL STREAM GATEWAY
   * Pumps autonomous steps, tool-calls, and reasoning chunks to the Dashboard UI.
   */
  public async *run(context: { 
    input: string; 
    chat_history: BaseMessage[]; 
    config: {
        configurable: {
            businessId: string;
            userId: string;
            industry: string;
            businessName: string;
            userName: string;
            tenantModules: string[];
            [key: string]: any;
        }
    } 
  }): AsyncGenerator<AgentStreamEvent> {
    
    this.log(`Forensic Handshake Initiated for: ${context.config.configurable.businessName}`);
    this.log(`Kernel Processing Command: ${context.input.substring(0, 100)}...`);

    const inputObj: AgentStreamInput = {
        input: context.input,
        chat_history: context.chat_history,
    };

    /**
     * NEURAL HANDSHAKE
     * We forward the stream from the executor. Events yielded:
     * - 'on_chat_model_stream': Aura's incremental reasoning.
     * - 'on_agent_action': Intent to execute a physical tool.
     * - 'on_tool_end': Result of the database operation.
     * - 'on_agent_finish': Final business conclusion.
     */
    yield* this.agentExecutor.stream(inputObj, context.config);
    
    this.log(`Forensic Session Successfully Concluded. Vault: ${context.config.configurable.businessId}`);
  }
}

/**
 * STATUS: Sovereign Kernel Fully Operational.
 * ENGINE: Cloud-Native Gemini 1.5 Pro via Direct Shims.
 * JURISDICTION: Unified Business Universe (Global).
 * BUILD_FIX: Circular dependency loops eliminated via direct import resolution.
 */