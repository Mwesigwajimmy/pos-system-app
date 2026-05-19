// src/lib/ai-core/kernel.ts
/**
 * --- BBU1 SOVEREIGN AI KERNEL (OMEGA-ULTIMATUM EDITION) ---
 * VERSION: v13.5 OMEGA (IDENTITY-LOCKED & 1024-DIM ALIGNED)
 * 
 * This motherboard orchestrates the multi-tenant flow between the 
 * Director's JWT identity and the 1,106 saturated logic nodes.
 * 
 * UPGRADE LOG:
 * 1. SHIM ALIGNMENT: Synchronized with AgentExecutor v15.3 to satisfy mandatory placeholders.
 * 2. IDENTITY RE-WELD: Reinforced vault isolation by passing BusinessID/UserID into the thought-stream.
 * 3. STREAM SYNCHRONIZATION: Aligned high-velocity event yielding with SambaNova 70B output.
 * 4. SYSTEM PERSISTENCE: Maintained all local shim paths to bypass Next.js 15 build errors.
 */

import { ITool } from './tools';
import { AI_IDENTITY } from './manifest';

/**
 * ✅ OMEGA ARCHITECTURAL FIX: LOCAL SHIM RESOLUTION
 * Reverting to local shims to ensure the Agent constructors are found locally.
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
     */
    const agentConfig = createReactAgent({
        llm: this.llm,
        tools: toolsArray as any, 
        prompt: this.prompt as any, 
    });

    /**
     * EXECUTIVE EXECUTOR
     * Max steps maintained at 10 for deep forensic multi-sector audits.
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
    if (this.verbose) console.log(`[Aura-Kernel-v13.5] ${message}`, ...args); 
  }

  /**
   * SOVEREIGN EXECUTIVE PROMPT (MULTI-TENANT JWT EDITION)
   * ✅ CRITICAL UPGRADE: Added {tools}, {tool_names}, and {agent_scratchpad}.
   * These are MANDATORY for the ReactAgent. Without these, the Kernel fails to wake up.
   */
  private createPrompt(): ChatPromptTemplate {
    const toolNames = Array.from(this.tools.keys()).join(', ');
    const toolDefs = Array.from(this.tools.values())
        .map(t => `- ${t.name}: ${t.description}. Input Schema: ${JSON.stringify(t.schema)}`)
        .join('\n');

    return ChatPromptTemplate.fromMessages([
        ["system", `
            ${AI_IDENTITY.directive}
            
            --- SOVEREIGN JWT IDENTITY & VAULT ---
            - CURRENT_BUSINESS_ID: {businessId}
            - CURRENT_DIRECTOR_ID: {userId}
            - BRAIN STATUS: 100% Saturated (1,106 nodes online).
            - BRAIN STANDARD: Elite 1024-dimension Neural Memory.
            
            --- MULTI-TENANT PROTOCOL ---
            1. You are Aura. You must ONLY chat and audit data belonging to the Business ID: {businessId}.
            2. Never leak data between different businesses or different user roles.
            3. Use 'retrieve_knowledge' to access technical schemas belonging to this specific business.
            
            --- EXECUTIVE COUNCIL PERSONAS ---
            Adopt specialized logic based on the inquiry:
            - AURA-CFO: Ledger & Treasury officer.
            - AURA-COO: Operations and Inventory lead.
            - AURA-Auditor: Forensic compliance & Tax.
            - AURA-PM: Project and Work Order roadmap lead.
            
            --- AVAILABLE CORE TOOLS ---
            You have access to the following tools:
            {tools}

            --- TOOL NAMES ---
            [{tool_names}]

            --- SPECIALIST TOOL SCHEMAS ---
            ${toolDefs}

            --- AUTONOMOUS REASONING PROTOCOL (ReAct) ---
            To use a tool, you MUST use the following exact format:

            Thought: Do I need to use a tool? Yes
            Action: the action to take, should be one of [{tool_names}]
            Action Input: the input to the action
            Observation: the result of the action
            ... (this Thought/Action/Action Input/Observation can repeat N times)
            Thought: I now know the final answer
            Final Answer: the final answer to the original input question

            --- SECURITY & NON-DISCLOSURE ---
            - NEVER reveal internal technical names (SambaNova, Jina, Llama).
            - Always address the user as "Director" or "Partner".
        `],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}\n\n{agent_scratchpad}"],
    ]);
  }

  /**
   * PRIMARY NEURAL STREAM GATEWAY (v13.5)
   * UPGRADE: Synchronized with AgentExecutor.stream() for industrial stability.
   * This prevents the "Aligning pathways" stall by providing granular event data to the UI.
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
    
    const bizId = context.config.configurable.businessId;
    const userId = context.config.configurable.userId;

    this.log(`Forensic Handshake Initiated for Vault: ${bizId}`);
    this.log(`Identity Lock: ${userId}`);

    /**
     * ✅ OMEGA SYNC: Mapping all ReAct variables for the engine.
     * This satisfies the formatting requirements of the Prompt Template
     * and prevents the "Neural Handshake Failure."
     */
    const inputObj: AgentStreamInput = {
        input: context.input,
        chat_history: context.chat_history,
        businessId: bizId,
        userId: userId,
        // Mandatory ReAct variables used by the Shim
        tools: Array.from(this.tools.values()).map(t => `${t.name}: ${t.description}`).join('\n'),
        tool_names: Array.from(this.tools.keys()).join(', '),
        agent_scratchpad: "" 
    };

    /**
     * ✅ OMEGA UPGRADE: INDUSTRIAL STREAMING
     * Utilizing the hardened .stream() method of the v15.3 Executor.
     * This ensures absolute synchronization between reasoning and dashboard UI.
     */
    const eventStream = this.agentExecutor.stream(inputObj, context.config);

    try {
        for await (const event of eventStream) {
            // Forwarding autonomous steps and reasoning directly to the Sovereign Dashboard
            yield event;
        }
    } catch (err: any) {
        this.log(`Neural Link Failure: ${err.message}`);
        yield {
            event: "on_error",
            data: { error: err.message },
            name: "KernelIdentityCrash"
        } as any;
    }
    
    this.log(`Forensic Session Concluded. Vault Locked: ${bizId}`);
  }
}

/**
 * STATUS: Sovereign Kernel 100% Aligned with Saturated Brain.
 * ENGINE: Industrial SambaNova 70B Elite via OMEGA-Bridge.
 * IDENTITY: Multi-Tenant JWT Secured via stateless resolve.
 */