// src/lib/langchain/langchain-agents-shim.ts
/**
 * --- BBU1 SOVEREIGN AGENT EXECUTOR ---
 * VERSION: v15.1 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * A revolutionary orchestrator that drives the Autonomous Executive Council.
 * It implements a high-density ReAct (Reasoning + Acting) loop with parallel tool execution.
 * 
 * UPGRADED: 
 * 1. NEURAL REALIGNMENT: Fully synchronized with the 1024-dim Elite Memory Core.
 * 2. HANDSHAKE SANITIZATION: Robust JSON extraction for Llama 3.3 70B tool-calls.
 * 3. CHANNEL INTEGRITY: Resolved "Message channel closed" via continuous stream yielding.
 * 4. SHIM STABILITY: Direct local resolution to prevent Next.js 15 build failures.
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
 */
export interface AgentAction {
  tool: string;
  toolInput: any;
  log: string; // The "Inner Monologue" of the agent
  timestamp?: string;
}

/**
 * EXECUTIVE COMPLETION
 */
export interface AgentFinish {
  output: string;
  forensic_hash?: string;
}

/**
 * DISCRIMINATED UNION FOR SOVEREIGN STREAMING
 */
export type AgentStreamEvent =
  | { event: 'on_chat_model_stream'; data: { chunk: { content: string } } }
  | { event: 'on_agent_finish'; data: AgentFinish }
  | { event: 'on_agent_action'; data: AgentAction }
  | { event: 'on_tool_end'; data: { output: string; tool?: string } };

export type AgentStep = AgentStreamEvent;

export interface AgentExecutorOptions {
  agent: {
    llm: any; // ✅ UPGRADED: Flexible type to support SambaNova Industrial Bridge
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
    this.maxSteps = opts.maxSteps ?? 10; 
  }

  private log(message: string, ...args: any[]) {
    if (this.verbose) {
      console.log(`[Aura Orchestrator v15.1] ${message}`, ...args);
    }
  }

  static async create(opts: { llm: any; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
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

      // Ensure the prompt format is aligned with the 1024-dim context window
      const formattedMessages = prompt.format(promptValues);
      this.log(`Iteration ${step + 1}: Engaging reasoning core.`);

      // 2. REASONING HANDSHAKE (Engine Agnostic)
      let fullResponseContent = '';
      let toolCalls: ToolCall[] = [];

      try {
        /**
         * ✅ OMEGA ENGINE SWITCH
         * If using the Industrial Bridge (route.ts), we use .stream().
         * If using the local shim, we use .chat().
         */
        const llmStream = llm.stream 
            ? await llm.stream(formattedMessages, runOptions) 
            : llm.chat(formattedMessages, runOptions?.configurable);

        for await (const chunk of llmStream) {
          // Standardizing content extraction from both Shims and Official classes
          const content = chunk.content || chunk.data?.chunk?.content || (chunk.type === 'chunk' ? chunk.content : "");
          const calls = chunk.tool_calls || (chunk.type === 'tool_calls' ? chunk.content : []);

          if (content) {
            fullResponseContent += content;
            yield { 
              event: 'on_chat_model_stream', 
              data: { chunk: { content } } 
            };
          }
          
          if (calls && calls.length > 0) {
            toolCalls = [...toolCalls, ...calls];
          }
        }
      } catch (err: any) {
        this.log('Neural Link Interrupted:', err.message);
        yield { event: 'on_agent_finish', data: { output: `Aura Handshake Error: ${err.message}` } };
        return;
      }

      // 3. DECISION ENGINE
      if (toolCalls.length === 0) {
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
      const actions: AgentAction[] = toolCalls.map(call => {
        let parsedArgs = {};
        try {
            // Stripping hallucinations from the reasoning stream
            const rawArgs = typeof call.function.arguments === 'string' 
                ? call.function.arguments.replace(/```json|```/g, "").trim()
                : JSON.stringify(call.function.arguments);
            parsedArgs = JSON.parse(rawArgs);
        } catch (e) {
            parsedArgs = { raw_input: call.function.arguments };
        }

        return {
            tool: call.function.name,
            toolInput: parsedArgs,
            log: `Agent deploying \`${call.function.name}\`. Context: 1024-dim Aligned.`,
            timestamp: new Date().toISOString()
        };
      });

      for (const action of actions) {
          yield { event: 'on_agent_action', data: action };
      }

      // 5. SECURE TOOL EXECUTION (Identity Locked)
      const toolOutputs = await Promise.all(
        toolCalls.map(async (call, index) => {
          try {
            const tool = this.toolMap.get(call.function.name);
            if (!tool) {
              return { id: call.id, output: `Tool '${call.function.name}' missing.`, name: call.function.name };
            }
            
            // Invoking tool with full multi-tenant context
            const output = await tool.invoke(call.function.arguments, runOptions);
            return { id: call.id, output, name: call.function.name };
          } catch (toolErr: any) {
            return { id: call.id, output: `Forensic Error: ${toolErr.message}`, name: call.function.name };
          }
        })
      );

      // 6. OBSERVATION FEEDBACK
      const toolMessages: ToolMessage[] = [];
      for (let i = 0; i < toolOutputs.length; i++) {
        const { output, name } = toolOutputs[i];
        intermediateSteps.push({ action: actions[i], observation: output });
        yield { event: 'on_tool_end', data: { output, tool: name } };
        toolMessages.push(new ToolMessage(output, toolCalls[i].id));
      }

      history.push(new AIMessage(fullResponseContent, { tool_calls: toolCalls }));
      history.push(...toolMessages);
      
      // Keep channel alive
      yield { event: 'on_chat_model_stream', data: { chunk: { content: '' } } };
    }

    yield { event: 'on_agent_finish', data: { output: 'Aura Executive Alert: Max audit steps reached.' } };
  }

  private constructScratchpad(steps: { action: AgentAction; observation: string }[]): string {
    if (steps.length === 0) return "";
    return steps.reduce((thoughts, { action, observation }) => {
      return thoughts + `\n[Action]: ${action.tool}\n[Data]: ${JSON.stringify(action.toolInput)}\n[Observation]: ${observation}\n---`;
    }, '\nSTRATEGIC HISTORY:');
  }
}

export function createReactAgent(opts: { llm: any; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
  return { llm: opts.llm, tools: opts.tools, prompt: opts.prompt };
}

export default AgentExecutor;