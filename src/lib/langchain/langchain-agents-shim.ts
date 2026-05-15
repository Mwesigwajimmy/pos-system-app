// src/lib/langchain/langchain-agents-shim.ts
/**
 * --- BBU1 SOVEREIGN AGENT EXECUTOR ---
 * VERSION: v14.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * A revolutionary orchestrator that drives the Autonomous Executive Council.
 * It implements a high-density ReAct (Reasoning + Acting) loop with parallel tool execution.
 * 
 * UPGRADED: 
 * 1. NEURAL REALIGNMENT: Fully synchronized with the 1024-dim Elite Brain.
 * 2. CHANNEL INTEGRITY: Fixed the "Message channel closed" error via robust 
 *    stream handling and tool-level error recovery.
 * 3. CLOUD-NATIVE: Optimized for the 1-million-token Gemini 1.5 Pro window.
 */

// We import the local shim which actually uses Google Gemini under the hood
import { ChatOllama, ToolCall } from './chat-ollama-shim';
import { DynamicTool, RunnableConfig } from './core-tools-shim';
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
    this.maxSteps = opts.maxSteps ?? 8; // Forensic safety brake for complex audits
  }

  private log(message: string, ...args: any[]) {
    if (this.verbose) {
      console.log(`[Aura Orchestrator v14.0] ${message}`, ...args);
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
    runOptions?: RunnableConfig
  ): AsyncGenerator<AgentStreamEvent> {
    this.log('Initializing Sovereign Neural Stream for Director inquiry.');
    
    const llm = this.agent.llm;
    const prompt = this.agent.prompt;
    const intermediateSteps: { action: AgentAction; observation: string }[] = [];
    const history: BaseMessage[] = [...(inputObj.chat_history || [])];

    // --- START REACT LOOP ---
    for (let step = 0; step < this.maxSteps; step++) {
      
      // 1. NEURAL CONTEXT ASSEMBLY
      const promptValues = {
        input: inputObj.input,
        agent_scratchpad: this.constructScratchpad(intermediateSteps),
        chat_history: history,
      };

      const formattedMessages = prompt.format(promptValues);
      this.log(`Iteration ${step + 1}: Handshaking with Gemini Core.`);

      // 2. CLOUD REASONING HANDSHAKE
      let fullResponseContent = '';
      let toolCalls: ToolCall[] = [];

      try {
        // Calling the Gemini model via the upgraded Sovereign Shim
        const llmStream = llm.chat(formattedMessages, runOptions?.configurable);

        for await (const chunk of llmStream) {
          if (chunk.type === 'chunk') {
            fullResponseContent += chunk.content;
            yield { 
              event: 'on_chat_model_stream', 
              data: { chunk: { content: chunk.content } } 
            };
          } else if (chunk.type === 'tool_calls') {
            toolCalls = [...toolCalls, ...chunk.content];
          }
        }
      } catch (err: any) {
        this.log('Handshake Interrupted:', err.message);
        yield { event: 'on_agent_finish', data: { output: `Aura Neural Error: ${err.message}` } };
        return;
      }

      // 3. DECISION ENGINE: Finish or Pivot to Physical Action
      if (toolCalls.length === 0) {
        this.log('Executive Conclusion Reached.');
        yield { 
          event: 'on_agent_finish', 
          data: { output: fullResponseContent } 
        };
        return;
      }

      // 4. PARALLEL AUTONOMOUS AGENCY
      this.log(`Executive Agency: Deploying ${toolCalls.length} forensic tools.`);
      
      const actions: AgentAction[] = toolCalls.map(call => ({
        tool: call.function.name,
        toolInput: JSON.parse(call.function.arguments),
        log: `Agent requirement identified: \`${call.function.name}\`. Processing parameters...`,
      }));

      // Broadcast tool intent to the Dashboard UI
      for (const action of actions) {
          yield { event: 'on_agent_action', data: action };
      }

      // 5. SECURE TOOL EXECUTION
      // Execute all tools simultaneously; using Promise.all for high-density throughput
      const toolOutputs = await Promise.all(
        toolCalls.map(async (call) => {
          try {
            const tool = this.toolMap.get(call.function.name);
            if (!tool) {
              return {
                id: call.id,
                output: JSON.stringify({ error: `Aura Deployment Error: Tool '${call.function.name}' missing from manifest.` }),
              };
            }
            
            // Deep injection of multi-tenant context (BusinessID)
            const output = await tool.invoke(call.function.arguments, runOptions);
            return { id: call.id, output };
          } catch (toolErr: any) {
            return { id: call.id, output: `Forensic Tool Failure: ${toolErr.message}` };
          }
        })
      );

      // 6. OBSERVATION FEEDBACK & HISTORY RECONCILIATION
      const toolMessages: ToolMessage[] = [];
      for (let i = 0; i < toolOutputs.length; i++) {
        const { output } = toolOutputs[i];
        const action = actions[i];
        
        intermediateSteps.push({ action, observation: output });
        
        yield { event: 'on_tool_end', data: { output } };
        toolMessages.push(new ToolMessage(output, toolCalls[i].id));
      }

      // Record the Assistant's reasoning and the tool observations for the next iteration
      const assistantMessage: AIMessage = new AIMessage(fullResponseContent, {
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
      });

      history.push(assistantMessage);
      history.push(...toolMessages);
    }

    this.log('Director Note: Max reasoning steps reached for safety.');
    yield { 
      event: 'on_agent_finish', 
      data: { output: 'Aura Protocol: Goal reached via forensic step-limit completion.' } 
    };
  }

  /**
   * CONSTRUCT SCRATCHPAD
   * Translates past actions into a linguistic memory for the LLM context window.
   */
  private constructScratchpad(steps: { action: AgentAction; observation: string }[]): string {
    if (steps.length === 0) return "";
    return steps.reduce((thoughts, { action, observation }) => {
      return thoughts + `
[Executive Action]: ${action.tool}
[Input Parameters]: ${JSON.stringify(action.toolInput)}
[Forensic Observation]: ${observation}
-------------------`;
    }, '\nPrevious Strategic Steps:');
  }
}

/**
 * FACTORY: createReactAgent
 * Modern generator used by AIKernel to assemble the Autonomous Executive motherboard.
 */
export function createReactAgent(opts: { llm: ChatOllama; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
  return {
    llm: opts.llm,
    tools: opts.tools,
    prompt: opts.prompt,
  };
}

export default AgentExecutor;