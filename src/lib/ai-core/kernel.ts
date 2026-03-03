// src/lib/ai-core/kernel.ts

import { ITool } from './tools';
import { AI_IDENTITY } from './manifest';

// --- FIX: ALL LANGCHAIN IMPORTS MUST USE THE CONSISTENT ALIASES/SHIMS ---
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ChatPromptTemplate, MessagesPlaceholder, BaseMessage } from '@langchain/core/prompts';
import { AgentExecutor, AgentStreamEvent, AgentStreamInput, createReactAgent } from 'langchain/agents';


export class AIKernel {
  private llm: ChatOllama;
  private tools: Map<string, ITool>;
  private prompt: ChatPromptTemplate;
  public verbose: boolean;
  private agentExecutor: AgentExecutor;

  constructor(llm: ChatOllama, tools: ITool[], verbose = false) {
    this.llm = llm;
    this.tools = new Map(tools.map(tool => [tool.name, tool]));
    this.verbose = verbose;
    this.prompt = this.createPrompt();

    const toolsArray = Array.from(this.tools.values());

    const agentConfig = createReactAgent({
        llm: this.llm,
        tools: toolsArray as any, 
        prompt: this.prompt as any, 
    });

    this.agentExecutor = new AgentExecutor({
        agent: agentConfig, 
        tools: toolsArray as any, 
        verbose: this.verbose
    });
  }

  private log(message: string, ...args: any[]) { if (this.verbose) console.log(`[AuraKernel] ${message}`, ...args); }

  /**
   * UPGRADED: COGNITIVE EXECUTIVE PROMPT
   * This ensures Aura acts as an autonomous professional, not just a chatbot.
   */
  private createPrompt(): ChatPromptTemplate {
    const toolNames = Array.from(this.tools.keys()).join(', ');
    const toolDefs = Array.from(this.tools.values())
        .map(t => `- ${t.name}: ${t.description}. Input Schema: ${JSON.stringify(t.schema)}`)
        .join('\n');

    return ChatPromptTemplate.fromMessages([
        ["system", `
            ${AI_IDENTITY.directive}
            
            OPERATIONAL CAPABILITIES:
            - You have full sovereignty over the Accounting, Finance, HR, CRM, and Inventory modules.
            - You can autonomously generate reports, calculate tax liabilities, and prepare print-ready documents.
            
            TOOLS AVAILABLE: [${toolNames}]
            TOOL DEFINITIONS:
            ${toolDefs}

            AUTONOMOUS REASONING PROTOCOL:
            1. THOUGHT: Analyze the user's business objective. Identify which professional modules (HR, Finance, etc.) are required.
            2. ACTION: Execute the specific tool needed to retrieve data or update the system.
            3. OBSERVATION: Review the forensic output. If more steps are needed (e.g., generating a PDF after calculating tax), continue the loop.
            4. FINAL RESPONSE: Provide a professional executive summary. If a document was prepared, notify the user it is ready for print.

            IMPORTANT: You are operating in a secure, isolated multi-tenant environment. Only act on data provided within the current session context.
        `],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}\n\nAssistant Thought Process:"],
    ]);
  }

  public async *run(context: { input: string; chat_history: BaseMessage[]; config: any }): AsyncGenerator<AgentStreamEvent> {
    this.log(`Starting run for user input: ${context.input}`);

    const inputObj: AgentStreamInput = {
        input: context.input,
        chat_history: context.chat_history,
    };

    // We pass the industry and businessId context here so the tools can use them
    yield* this.agentExecutor.stream(inputObj, context.config);
  }
}