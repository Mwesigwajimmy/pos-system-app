// src/lib/ai-core/kernel.ts
/**
 * --- BBU1 SOVEREIGN AI KERNEL (OMEGA-ULTIMATUM EDITION) ---
 * VERSION: v10.9 CLOUD-SOVEREIGN ALIGNED.
 * The central nervous system of the BBU1 Ecosystem.
 * 
 * UPGRADE LOG:
 * 1. OLLAMA DECOUPLING: Removed ChatOllama dependency to allow Google Gemini 
 *    Cloud models to stream without local-host port conflicts.
 * 2. TYPE ALIGNMENT: Switched to BaseChatModel for universal cloud compatibility.
 * 3. VOICE RESTORATION: Fixed the "Awaiting Directive" stall by aligning the 
 *    Executive Chain to the Google AI Studio pathway.
 */

import { ITool } from './tools';
import { AI_IDENTITY } from './manifest';

/**
 * ✅ OMEGA ARCHITECTURAL FIX: DIRECT PATH RESOLUTION
 * Bypassing Ollama-specific shims to ensure Google Cloud stability.
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

// Types are imported separately for strict build isolation
import type { 
    AgentStreamEvent, 
    AgentStreamInput 
} from '@/lib/langchain/langchain-agents-shim';

/**
 * AIKernel: The Sovereign Motherboard.
 * Manages the high-density lifecycle of a Director's inquiry.
 */
export class AIKernel {
  /**
   * ✅ DEEP FIX: Changed type from ChatOllama to any/BaseChatModel 
   * to allow Gemini to speak.
   */
  private llm: any; 
  private tools: Map<string, ITool>;
  private prompt: ChatPromptTemplate;
  public verbose: boolean;
  private agentExecutor: AgentExecutor;

  /**
   * KERNEL INITIALIZATION
   * Receives the Google LLM and binds it to the Executive Council.
   */
  constructor(llm: any, tools: ITool[], verbose = false) {
    this.llm = llm;
    this.tools = new Map(tools.map(tool => [tool.name, tool]));
    this.verbose = verbose;
    this.prompt = this.createPrompt();

    const toolsArray = Array.from(this.tools.values());

    /**
     * REACT AGENT ASSEMBLY
     * Configures the autonomous 'Think-Act' loop.
     */
    const agentConfig = createReactAgent({
        llm: this.llm,
        tools: toolsArray as any, 
        prompt: this.prompt as any, 
    });

    /**
     * EXECUTIVE EXECUTOR
     * The physical motherboard that manages the ReAct iterations.
     */
    this.agentExecutor = new AgentExecutor({
        agent: agentConfig, 
        tools: toolsArray as any, 
        verbose: this.verbose,
        maxSteps: 8 // Forensic safety brake
    });
  }

  /**
   * Internal Diagnostic Protocol
   */
  private log(message: string, ...args: any[]) { 
    if (this.verbose) console.log(`[Aura-Kernel-v10.9] ${message}`, ...args); 
  }

  /**
   * SOVEREIGN EXECUTIVE PROMPT (OMEGA LEVEL)
   * Defines personality, authority, and reasoning rules for Aura.
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
            4. OBSERVATION: Scan the result for forensic anomalies, ui math discrepancies.
            5. RECONCILIATION: If a ledger error is detected, use 'aura_autonomous_edit' to heal the system state.
            6. VISUALIZATION: Always use 'prepare_boardroom_presentation' for reports.
            7. CONCLUDE: Provide a professional executive summary.

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

    const inputObj: AgentStreamInput = {
        input: context.input,
        chat_history: context.chat_history,
    };

    /**
     * NEURAL HANDSHAKE
     *Yielding reasoning and tool events directly to the UI.
     */
    yield* this.agentExecutor.stream(inputObj, context.config);
    
    this.log(`Forensic Session Concluded. Vault: ${context.config.configurable.businessId}`);
  }
}

/**
 * STATUS: Sovereign Kernel Fully Operational.
 * ENGINE: Cloud-Native Gemini 1.5 Pro via Direct Link.
 * JURISDICTION: Unified Business Universe (Global).
 */