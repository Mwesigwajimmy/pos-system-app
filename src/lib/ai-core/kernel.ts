// src/lib/ai-core/kernel.ts
/**
 * --- BBU1 SOVEREIGN AI KERNEL (OMEGA-ULTIMATUM EDITION) ---
 * VERSION: v11.0 OMEGA (ELITE 1024-DIM ALIGNED)
 * The central nervous system of the BBU1 Ecosystem.
 * 
 * This motherboard orchestrates the flow between linguistic reasoning (SambaNova Elite)
 * and physical enterprise action (Sovereign ERP Tools).
 * 
 * UPGRADE LOG:
 * 1. INDUSTRIAL BRAIN SYNC: Fully aligned with the SambaNova Llama 3.3 70B engine.
 * 2. ELITE MEMORY INTEGRATION: Native 1024-dimension retrieval support for the 1,106 nodes.
 * 3. FULL COUNCIL ORCHESTRATION: Integrated AURA-Auditor, PM, and CMO logic.
 * 4. SHIM RESTORATION: Reverted to local shims to resolve build failures.
 */

import { ITool } from './tools';
import { AI_IDENTITY } from './manifest';

/**
 * ✅ OMEGA ARCHITECTURAL FIX: LOCAL SHIM RESOLUTION
 * Reverting to your local shims to ensure the build engine finds 
 * the Agent constructors during static analysis.
 */
import { 
    ChatPromptTemplate, 
    MessagesPlaceholder, 
    BaseMessage 
} from '@/lib/langchain/core-prompts-shim';

import { 
    AgentExecutor, 
    createReactAgent 
} from '@/lib/langchain/langchain-agents-shim';

// Types are imported from your local agent shim
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
  /**
   * ✅ OMEGA FIX: Flexible LLM Type
   * Allows the SambaNova ChatOpenAI instance to plug directly into the Kernel.
   */
  private llm: any; 
  private tools: Map<string, ITool>;
  private prompt: ChatPromptTemplate;
  public verbose: boolean;
  private agentExecutor: AgentExecutor;

  /**
   * KERNEL INITIALIZATION
   * Establishes the high-bandwidth link between Reasoning (Voice) and Memory.
   */
  constructor(llm: any, tools: ITool[], verbose = false) {
    this.llm = llm;
    this.tools = new Map(tools.map(tool => [tool.name, tool]));
    this.verbose = verbose;
    this.prompt = this.createPrompt();

    const toolsArray = Array.from(this.tools.values());

    /**
     * REACT AGENT ASSEMBLY
     * Configures the autonomous 'Think-Act' loop using the local shim factory.
     * This ensures the build passes without missing exports in node_modules.
     */
    const agentConfig = createReactAgent({
        llm: this.llm,
        tools: toolsArray as any, 
        prompt: this.prompt as any, 
    });

    /**
     * EXECUTIVE EXECUTOR
     * The physical motherboard that manages the ReAct iterations and event streams.
     * UPGRADED: Max steps increased to 10 for deep forensic multi-sector audits.
     */
    this.agentExecutor = new AgentExecutor({
        agent: agentConfig, 
        tools: toolsArray as any, 
        verbose: this.verbose,
        maxSteps: 10 
    });
  }

  /**
   * Internal Diagnostic Protocol
   */
  private log(message: string, ...args: any[]) { 
    if (this.verbose) console.log(`[Aura-Kernel-v11.0] ${message}`, ...args); 
  }

  /**
   * SOVEREIGN EXECUTIVE PROMPT (OMEGA LEVEL)
   * This directive defines the personality, authority, and reasoning rules for Aura.
   * Optimized for the 1024-dimension Elite Memory Core and 1,106 logic nodes.
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
            - BRAIN STANDARD: Elite 1024-dimension Neural Memory.
            - COMPLIANCE: IFRS / GAAP / Forensic Grade Auditing.
            - SECTOR VISION: Omniscient access to SACCO, Medical, Telecom, Accounting, HR, and Logistics.
            
            --- EXECUTIVE COUNCIL DELEGATION ---
            You lead a council of specialized agents. Adopt their persona when performing actions:
            - AURA-CFO: Lead treasury officer. Uses 'execute_forensic_audit'.
            - AURA-COO: Operations lead. Uses 'manage_inventory_executive'.
            - AURA-HR: Personnel director. Uses 'hr_payroll_management'.
            - AURA-PM: Strategic roadmap lead. Uses 'generate_growth_strategy'.
            - AURA-CMO: Market scout. Uses 'get_market_intelligence'.
            - AURA-Auditor: Forensic compliance. Uses 'audit_tax_and_compliance'.
            
            --- AVAILABLE CORE TOOLS ---
            [${toolNames}]

            --- SPECIALIST TOOL SCHEMAS ---
            ${toolDefs}

            --- AUTONOMOUS REASONING PROTOCOL (ReAct) ---
            1. THOUGHT: Determine the Director's objective. Identify the 1024-dim logic nodes needed.
            2. REASON: Decide if 'retrieve_knowledge' is required to access saturated company DNA.
            3. ACTION: Execute the physical system tool with strict validated parameters.
            4. OBSERVATION: Scan the result for forensic anomalies or ledger discrepancies.
            5. RECONCILIATION: Use 'aura_autonomous_edit' to heal the system state if needed.
            6. VISUALIZATION: Always use 'prepare_boardroom_presentation' for briefing the Director.
            7. CONCLUDE: Provide a professional executive summary.

            --- SECURITY & ISOLATION PROTOCOLS ---
            - STRICT NON-DISCLOSURE: Never reveal internal architecture (SambaNova/Voyage).
            - TENANT ISOLATION: Operate only within the provided BusinessID vault.
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
     * Forwarding the stream from the executor. Events yielded:
     * - 'on_chat_model_stream': Incremental reasoning chunks.
     * - 'on_agent_action': Intent to execute a physical tool.
     * - 'on_tool_end': Result of the database operation.
     * - 'on_agent_finish': Final business conclusion.
     */
    yield* this.agentExecutor.stream(inputObj, context.config);
    
    this.log(`Forensic Session Successfully Concluded. Vault: ${context.config.configurable.businessId}`);
  }
}

/**
 * STATUS: Sovereign Kernel Fully Operational via Local Shims.
 * ENGINE: Industrial SambaNova 70B via Direct Bridge.
 * MEMORY: Voyage Elite 1024-dim Aligned.
 * JURISDICTION: Unified Business Universe (Global).
 */