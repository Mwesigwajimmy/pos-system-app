// src/lib/langchain/langchain-agents-shim.ts
/**
 * --- BBU1 SOVEREIGN AGENT EXECUTOR ---
 * A revolutionary orchestrator that drives the Autonomous Executive Council.
 * It implements a high-density ReAct (Reasoning + Acting) loop with parallel tool execution.
 * 
 * UPGRADED: Fully decoupled from local dependencies. Now Cloud-Native via Gemini Infrastructure.
 */

// We import the local shim which actually uses Google Gemini under the hood
import { ChatOllama, ToolCall } from './chat-ollama-shim';
import { DynamicTool } from './core-tools-shim';
import { 
    ChatPromptTemplate, 
    BaseMessage, 
    AIMessage, 
    ToolMessage, 
    HumanMessage 
} from './core-prompts-shim';

/**
 * EXECUTIVE ACTION METADATA
 * Captures the reasoning and intent of an agent (e.g., CFO deciding to calculate tax).
 */
export interface AgentAction {
  tool: string;
  toolInput: any;
  log: string; // The "Inner Monologue" of the agent
}

/**
 * EXECUTIVE COMPLETION
 * Signals that the Council has reached a final business conclusion.
 */
export interface AgentFinish {
  output: string;
}

/**
 * DISCRIMINATED UNION FOR SOVEREIGN STREAMING
 * Ensures the UI receives perfectly typed event packets for real-time boardroom rendering.
 */
export type AgentStreamEvent =
  | { event: 'on_chat_model_stream'; data: { chunk: { content: string } } }
  | { event: 'on_agent_finish'; data: AgentFinish }
  | { event: 'on_agent_action'; data: AgentAction }
  | { event: 'on_tool_end'; data: { output: string } };

export type AgentStep = AgentStreamEvent;

export interface AgentExecutorOptions {
  agent: {
    llm: ChatOllama;
    prompt: ChatPromptTemplate;
  };
  tools: DynamicTool<any>[];
  verbose?: boolean;
  maxSteps?: number;
}

export interface AgentStreamInput {
  input: string;
  chat_history?: BaseMessage[];
}

/**
 * THE SOVEREIGN AGENT EXECUTOR ENGINE
 * The core motherboard of Aura's autonomous capabilities.
 */
export class AgentExecutor {
  private agent: AgentExecutorOptions['agent'];
  private tools: DynamicTool<any>[];
  private toolMap: Map<string, DynamicTool<any>>;
  private verbose: boolean;
  private maxSteps: number;

  constructor(opts: AgentExecutorOptions) {
    this.agent = opts.agent;
    this.tools = opts.tools;
    this.toolMap = new Map(this.tools.map(tool => [tool.name, tool]));
    this.verbose = !!opts.verbose;
    this.maxSteps = opts.maxSteps ?? 8; // Increased safety brake for complex audits
  }

  private log(message: string, ...args: any[]) {
    if (this.verbose) {
      console.log(`[Aura Orchestrator] ${message}`, ...args);
    }
  }

  /**
   * Static Factory for direct Agent initialization.
   */
  static async create(opts: { llm: ChatOllama; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
    return new AgentExecutor({ agent: { llm: opts.llm, prompt: opts.prompt }, tools: opts.tools });
  }

  /**
   * PRIMARY NEURAL STREAM
   * Orchestrates the loop between reasoning (Gemini) and acting (BBU1 Tools).
   */
  async *stream(
    inputObj: AgentStreamInput,
    runOptions?: any
  ): AsyncGenerator<AgentStreamEvent> {
    this.log('Initializing Sovereign Neural Stream:', inputObj.input.substring(0, 50) + "...");
    
    const llm = this.agent.llm;
    const prompt = this.agent.prompt;
    const intermediateSteps: { action: AgentAction; observation: string }[] = [];
    const history: BaseMessage[] = inputObj.chat_history || [];

    // --- START REACT LOOP ---
    for (let step = 0; step < this.maxSteps; step++) {
      
      // 1. NEURAL CONTEXT ASSEMBLY
      const promptValues = {
        input: inputObj.input,
        agent_scratchpad: this.constructScratchpad(intermediateSteps),
        chat_history: history,
      };

      const formattedMessages = prompt.format(promptValues);
      this.log(`Neural Iteration ${step + 1}: Processing via Gemini Core.`);

      // 2. CLOUD REASONING HANDSHAKE
      let fullResponseContent = '';
      let toolCalls: ToolCall[] = [];

      // Calling the Gemini model (wrapped in the ChatOllama shim)
      const llmStream = llm.chat(formattedMessages, runOptions?.configurable);

      for await (const chunk of llmStream) {
        if (chunk.type === 'chunk') {
          fullResponseContent += chunk.content;
          yield { 
            event: 'on_chat_model_stream', 
            data: { chunk: { content: chunk.content } } 
          };
        } else if (chunk.type === 'tool_calls') {
          toolCalls = chunk.content;
        }
      }

      // Prepare the Assistant's thought for the audit trail
      const assistantMessage: AIMessage = new AIMessage(fullResponseContent, {
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
      });

      // 3. DECISION ENGINE: Finish or Pivot to Tools
      if (toolCalls.length === 0) {
        this.log('Executive Decision: Goal Reached.');
        yield { 
          event: 'on_agent_finish', 
          data: { output: fullResponseContent } 
        };
        return;
      }

      // 4. PARALLEL AUTONOMOUS AGENCY
      this.log(`Executive Agency: Deploying ${toolCalls.length} specialists.`);
      
      const actions: AgentAction[] = toolCalls.map(call => ({
        tool: call.function.name,
        toolInput: JSON.parse(call.function.arguments),
        log: `Agent identified requirement for \`${call.function.name}\`. Processing parameters...`,
      }));

      // Broadcast tool intent to the UI
      for (const action of actions) {
          yield { event: 'on_agent_action', data: action };
      }

      // Execute all tools simultaneously for high-density processing
      const toolOutputs = await Promise.all(
        toolCalls.map(async (call) => {
          const tool = this.toolMap.get(call.function.name);
          if (!tool) {
            return {
              id: call.id,
              output: JSON.stringify({ error: `Agent Deployment Error: Specialist tool '${call.function.name}' not found in Kernel.` }),
            };
          }
          
          // Deep injection of multi-tenant context into the tool invocation
          const output = await tool.invoke(call.function.arguments, { 
            configurable: runOptions?.configurable || {} 
          });
          return { id: call.id, output };
        })
      );

      // 5. OBSERVATION FEEDBACK & HISTORY RECONCILIATION
      const toolMessages: ToolMessage[] = [];
      for (let i = 0; i < toolOutputs.length; i++) {
        const { output } = toolOutputs[i];
        const action = actions[i];
        
        intermediateSteps.push({ action, observation: output });
        
        yield { event: 'on_tool_end', data: { output } };
        toolMessages.push(new ToolMessage(output, toolCalls[i].id));
      }

      // Append thought + results to history so Aura "remembers" what just happened
      history.push(assistantMessage);
      history.push(...toolMessages);
    }

    this.log('Safety Protocol: Max reasoning steps reached.');
    yield { 
      event: 'on_agent_finish', 
      data: { output: 'Aura Protocol: Goal reached via step-limit completion.' } 
    };
  }

  /**
   * CONSTRUCT SCRATCHPAD
   * Translates past actions and observations into a linguistic memory for the LLM.
   */
  private constructScratchpad(steps: { action: AgentAction; observation: string }[]): string {
    return steps.reduce((thoughts, { action, observation }) => {
      return thoughts + `
[Executive Action]: ${action.tool}
[Input Data]: ${JSON.stringify(action.toolInput)}
[Observed Result]: ${observation}
-------------------`;
    }, 'Previous Strategic Steps:');
  }
}

/**
 * FACTORY: createReactAgent
 * Modern generator used by AIKernel to assemble the Autonomous Executive.
 */
export function createReactAgent(opts: { llm: ChatOllama; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
  return {
    llm: opts.llm,
    tools: opts.tools,
    prompt: opts.prompt,
  };
}

export default AgentExecutor;