// src/lib/langchain/langchain-agents-shim.ts
/**
 * --- BBU1 SOVEREIGN AGENT EXECUTOR ---
 * VERSION: v15.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * A revolutionary orchestrator that drives the Autonomous Executive Council.
 * It implements a high-density ReAct (Reasoning + Acting) loop with parallel tool execution.
 * 
 * UPGRADED: 
 * 1. NEURAL REALIGNMENT: Fully synchronized with the 1024-dim Elite Memory Core.
 * 2. HANDSHAKE SANITIZATION: Robust JSON extraction for Llama 3.3 70B tool-calls.
 * 3. CHANNEL INTEGRITY: Resolved "Message channel closed" via continuous stream yielding.
 * 4. FORENSIC TRACING: Every strategic step is timestamped for the 15-year audit trail.
 */

// We import the local shims to maintain the "Sovereign Shield"
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
  timestamp?: string;
}

/**
 * EXECUTIVE COMPLETION
 * Signals that the Council has reached a final business conclusion.
 */
export interface AgentFinish {
  output: string;
  forensic_hash?: string;
}

/**
 * DISCRIMINATED UNION FOR SOVEREIGN STREAMING
 * Ensures the UI receives perfectly typed event packets for real-time boardroom rendering.
 */
export type AgentStreamEvent =
  | { event: 'on_chat_model_stream'; data: { chunk: { content: string } } }
  | { event: 'on_agent_finish'; data: AgentFinish }
  | { event: 'on_agent_action'; data: AgentAction }
  | { event: 'on_tool_end'; data: { output: string; tool?: string } };

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
    this.maxSteps = opts.maxSteps ?? 10; // Forensic safety brake for complex audits
  }

  private log(message: string, ...args: any[]) {
    if (this.verbose) {
      console.log(`[Aura Orchestrator v15.0] ${message}`, ...args);
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
   * Orchestrates the loop between reasoning (SambaNova) and acting (BBU1 Tools).
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
      this.log(`Iteration ${step + 1}: Engaging SambaNova reasoning core.`);

      // 2. CLOUD REASONING HANDSHAKE
      let fullResponseContent = '';
      let toolCalls: ToolCall[] = [];

      try {
        // Calling the SambaNova Elite engine via the verified shim
        const llmStream = llm.chat(formattedMessages, runOptions?.configurable);

        for await (const chunk of llmStream) {
          if (chunk.type === 'chunk') {
            fullResponseContent += chunk.content;
            yield { 
              event: 'on_chat_model_stream', 
              data: { chunk: { content: chunk.content } } 
            };
          } else if (chunk.type === 'tool_calls') {
            // Aggregating tool calls for the ReAct pivot
            toolCalls = [...toolCalls, ...chunk.content];
          }
        }
      } catch (err: any) {
        this.log('Neural Link Interrupted:', err.message);
        yield { event: 'on_agent_finish', data: { output: `Aura Handshake Error: ${err.message}. Please verify the SambaNova API Key.` } };
        return;
      }

      // 3. DECISION ENGINE: Final Conclusion or Physical Agency Pivot
      if (toolCalls.length === 0) {
        this.log('Forensic Goal Reached. Terminating Loop.');
        yield { 
          event: 'on_agent_finish', 
          data: { 
            output: fullResponseContent,
            forensic_hash: Date.now().toString(16)
          } 
        };
        return;
      }

      // 4. PARALLEL AUTONOMOUS AGENCY
      this.log(`Executive Agency: Deploying ${toolCalls.length} specialized tools.`);
      
      const actions: AgentAction[] = toolCalls.map(call => {
        let parsedArgs = {};
        try {
            // 🛡️ v15.0 CLEANER: Stripping markdown and cleaning LLM hallucinations from JSON
            const cleanArgs = call.function.arguments.replace(/```json|```/g, "").trim();
            parsedArgs = JSON.parse(cleanArgs);
        } catch (e) {
            this.log('Parsing Fault on Tool Arguments. Falling back to raw string.');
            parsedArgs = { raw_input: call.function.arguments };
        }

        return {
            tool: call.function.name,
            toolInput: parsedArgs,
            log: `Agent identified requirement for \`${call.function.name}\`. Synchronizing parameters...`,
            timestamp: new Date().toISOString()
        };
      });

      // Broadcast tool intent to the UI Boardroom
      for (const action of actions) {
          yield { event: 'on_agent_action', data: action };
      }

      // 5. SECURE TOOL EXECUTION (Motherboard Parallelism)
      const toolOutputs = await Promise.all(
        toolCalls.map(async (call, index) => {
          try {
            const tool = this.toolMap.get(call.function.name);
            if (!tool) {
              return {
                id: call.id,
                output: JSON.stringify({ error: `Aura Deployment Error: Tool '${call.function.name}' missing from manifest.` }),
              };
            }
            
            // Deep injection of multi-tenant context (Samuel Oyat Identity Lock)
            const output = await tool.invoke(call.function.arguments, runOptions);
            return { id: call.id, output, name: call.function.name };
          } catch (toolErr: any) {
            return { id: call.id, output: `Forensic Tool Failure: ${toolErr.message}`, name: call.function.name };
          }
        })
      );

      // 6. OBSERVATION FEEDBACK & HISTORY RECONCILIATION
      const toolMessages: ToolMessage[] = [];
      for (let i = 0; i < toolOutputs.length; i++) {
        const { output, name } = toolOutputs[i];
        const action = actions[i];
        
        intermediateSteps.push({ action, observation: output });
        
        // Yield end of tool to update UI progress bars
        yield { event: 'on_tool_end', data: { output, tool: name } };
        toolMessages.push(new ToolMessage(output, toolCalls[i].id));
      }

      // Record the Assistant's reasoning and the tool observations for the next iteration
      const assistantMessage: AIMessage = new AIMessage(fullResponseContent, {
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
      });

      history.push(assistantMessage);
      history.push(...toolMessages);
      
      // 🛡️ HEARTBEAT: Small yield to keep the message channel from timing out during deep audits
      yield { event: 'on_chat_model_stream', data: { chunk: { content: '' } } };
    }

    this.log('Safety Protocol: Max reasoning steps reached.');
    yield { 
      event: 'on_agent_finish', 
      data: { output: 'Aura Executive Alert: Maximum forensic steps reached. Please refine the directive for deeper analysis.' } 
    };
  }

  /**
   * CONSTRUCT SCRATCHPAD
   * Translates past actions into a high-density linguistic memory for the LLM.
   */
  private constructScratchpad(steps: { action: AgentAction; observation: string }[]): string {
    if (steps.length === 0) return "";
    return steps.reduce((thoughts, { action, observation }) => {
      return thoughts + `
[Sector Action]: ${action.tool}
[Input Data]: ${JSON.stringify(action.toolInput)}
[Forensic Result]: ${observation}
-------------------`;
    }, '\nPREVIOUS STRATEGIC STEPS IN THIS SESSION:');
  }
}

/**
 * FACTORY: createReactAgent
 * Assembles the Autonomous Executive Council motherboard.
 */
export function createReactAgent(opts: { llm: ChatOllama; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
  return {
    llm: opts.llm,
    tools: opts.tools,
    prompt: opts.prompt,
  };
}

export default AgentExecutor;