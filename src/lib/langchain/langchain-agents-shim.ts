// src/lib/langchain/langchain-agents-shim.ts
/**
 * --- BBU1 SOVEREIGN AGENT EXECUTOR ---
 * VERSION: v15.3 OMEGA-ULTIMATUM (ALIGNED FOR AURA ELITE 1024)
 * A revolutionary orchestrator that drives the Autonomous Executive Council.
 * It implements a high-density ReAct (Reasoning + Acting) loop with parallel tool execution.
 * 
 * UPGRADED: 
 * 1. IDENTITY PASS-THROUGH: Spreading all inputObj variables to support {businessId} and {userId}.
 * 2. PROMPT ALIGNMENT: Synchronized with the ReactAgent mandatory placeholders and tool injection.
 * 3. TOOL-CALL SANITIZATION: Enhanced regex to strip hallucinations from SambaNova outputs.
 * 4. STREAM INTEGRITY: Standardized chunk extraction for high-velocity inference to kill the retry-loop.
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
  | { event: 'on_tool_end'; data: { output: string; tool?: string } }
  | { event: 'on_error'; data: { error: string } };

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

/**
 * ✅ OMEGA FIX: Flexible Input
 * Allows {businessId}, {userId}, {tools}, {tool_names} and other multi-tenant variables.
 */
export interface AgentStreamInput {
  input: string;
  chat_history?: BaseMessage[];
  [key: string]: any; 
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
      console.log(`[Aura-Orchestrator-v15.3] ${message}`, ...args);
    }
  }

  static async create(opts: { llm: any; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
    return new AgentExecutor({ agent: { llm: opts.llm, prompt: opts.prompt }, tools: opts.tools });
  }

  /**
   * PRIMARY NEURAL STREAM
   * Orchestrates the loop between reasoning (SambaNova) and acting (BBU1 Tools).
   * ✅ OMEGA UPGRADE: Handles dynamic variables passed from Kernel to prevent formatting crashes.
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
      
      /**
       * 1. NEURAL CONTEXT ASSEMBLY
       * ✅ OMEGA FIX: Spreading inputObj ensures {businessId}, {userId}, {tools}, and {tool_names}
       * reach the PromptTemplate. This kills the "Neural Handshake Failed" retry loop.
       */
      const promptValues = {
        ...inputObj,
        agent_scratchpad: this.constructScratchpad(intermediateSteps),
        chat_history: history,
      };

      // Ensure the prompt format is aligned with the 1024-dim context window
      let formattedMessages;
      try {
          formattedMessages = prompt.format(promptValues);
      } catch (formatErr: any) {
          this.log('Prompt Formatting Failure:', formatErr.message);
          yield { event: 'on_error', data: { error: `Context Construction Fault: ${formatErr.message}` } };
          return;
      }
      
      this.log(`Iteration ${step + 1}: Engaging reasoning core.`);

      // 2. REASONING HANDSHAKE (Engine Agnostic)
      let fullResponseContent = '';
      let toolCalls: ToolCall[] = [];

      try {
        /**
         * ✅ OMEGA ENGINE SWITCH
         * Supports both standard class .stream() and local shim .chat()
         */
        const llmStream = llm.stream 
            ? await llm.stream(formattedMessages, runOptions) 
            : llm.chat(formattedMessages, runOptions?.configurable);

        for await (const chunk of llmStream) {
          // Standardizing content extraction from both Shims and SambaNova Official classes
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
        yield { event: 'on_error', data: { error: `Brain Handshake Refused: ${err.message}` } };
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
            /**
             * ✅ OMEGA SANITIZATION
             * Stripping markdown halls and hallucinations from SambaNova's logic stream.
             */
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
            log: `Agent deploying \`${call.function.name}\`. Sector Lock: 1024-dim Aligned.`,
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
              return { id: call.id, output: `Access Denied: Tool '${call.function.name}' missing from vault.`, name: call.function.name };
            }
            
            // Invoking tool with full multi-tenant context using .invoke (compatible with .call alias)
            const output = await tool.invoke(call.function.arguments, runOptions);
            return { id: call.id, output, name: call.function.name };
          } catch (toolErr: any) {
            return { id: call.id, output: `Forensic Execution Fault: ${toolErr.message}`, name: call.function.name };
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

      // Append step results to history for next iteration
      history.push(new AIMessage(fullResponseContent, { tool_calls: toolCalls }));
      history.push(...toolMessages);
      
      // Heartbeat signal to keep connection alive
      yield { event: 'on_chat_model_stream', data: { chunk: { content: '' } } };
    }

    yield { event: 'on_agent_finish', data: { output: 'Aura Executive Alert: Max logic recursion steps reached.' } };
  }

  /**
   * CONSTRUCT SCRATCHPAD
   * Formatting the ReAct history for high-fidelity 1024-dim retrieval.
   */
  private constructScratchpad(steps: { action: AgentAction; observation: string }[]): string {
    if (steps.length === 0) return "";
    return steps.reduce((thoughts, { action, observation }) => {
      return thoughts + `\nThought: I used ${action.tool} with parameters ${JSON.stringify(action.toolInput)}\nObservation: ${observation}\n`;
    }, '\nINTERNAL STRATEGIC LOG:');
  }
}

export function createReactAgent(opts: { llm: any; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
  // Returns a configuration object for the Executor constructor
  return { llm: opts.llm, tools: opts.tools, prompt: opts.prompt };
}

export default AgentExecutor;