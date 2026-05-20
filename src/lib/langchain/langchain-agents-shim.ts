/**
 * --- BBU1 SOVEREIGN AGENT EXECUTOR ---
 * VERSION: v15.5 OMEGA-ULTIMATUM (THE CRASH-SHIELD WELD)
 * A revolutionary orchestrator that drives the Autonomous Executive Council.
 * It implements a high-density ReAct (Reasoning + Acting) loop with parallel tool execution.
 * 
 * UPGRADED: 
 * 1. CRASH SHIELD: Fixed the 'toolCalls.map' type-error by enforcing array-guards 
 *    on LLM stream chunks. This kills the 500-error retry loop.
 * 2. IDENTITY PASS-THROUGH: Spreading all inputObj variables to support {businessId} and {userId}.
 * 3. PROMPT ALIGNMENT: Synchronized with the ReactAgent mandatory placeholders.
 * 4. STREAM INTEGRITY: Hardened chunk extraction for Llama 3.3 (SambaNova) consistency.
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
    llm: any; 
    prompt: ChatPromptTemplate;
  };
  tools: DynamicTool<any>[];
  verbose?: boolean;
  maxSteps?: number;
}

/**
 * ✅ OMEGA FIX: Flexible Input
 */
export interface AgentStreamInput {
  input: string;
  chat_history?: BaseMessage[];
  [key: string]: any; 
}

/**
 * THE SOVEREIGN AGENT EXECUTOR ENGINE
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
      console.log(`[Aura-Orchestrator-v15.5] ${message}`, ...args);
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
      
      const promptValues = {
        ...inputObj,
        agent_scratchpad: this.constructScratchpad(intermediateSteps),
        chat_history: history,
      };

      let formattedMessages;
      try {
          // Forensic check for Chat vs String prompts
          formattedMessages = prompt.formatMessages ? await prompt.formatMessages(promptValues) : await prompt.format(promptValues);
      } catch (formatErr: any) {
          this.log('Prompt Formatting Failure:', formatErr.message);
          yield { event: 'on_error', data: { error: `Context Construction Fault: ${formatErr.message}` } };
          return;
      }
      
      this.log(`Iteration ${step + 1}: Engaging reasoning core.`);

      let fullResponseContent = '';
      let toolCalls: any[] = [];

      try {
        const llmStream = llm.stream 
            ? await llm.stream(formattedMessages, runOptions) 
            : llm.chat(formattedMessages, runOptions?.configurable);

        for await (const chunk of llmStream) {
          /**
           * ✅ OMEGA CHUNK RECONCILIATION
           * Handles content extraction from both raw shims and official LangChain classes.
           */
          const content = chunk.content || chunk.text || (chunk.data?.chunk?.content) || "";
          
          /**
           * ✅ THE NEURAL SINK FIX (Line 125 Correction)
           * We strictly enforce that 'toolCalls' only accepts Array data.
           * This prevents the string-to-array mapping crash.
           */
          const rawCalls = chunk.tool_calls || chunk.additional_kwargs?.tool_calls;
          const calls = Array.isArray(rawCalls) ? rawCalls : [];

          if (content && typeof content === 'string') {
            fullResponseContent += content;
            yield { 
              event: 'on_chat_model_stream', 
              data: { chunk: { content } } 
            };
          }
          
          if (calls.length > 0) {
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
            // Strip markdown hallucinations from the arguments string
            const rawArgs = typeof call.function.arguments === 'string' 
                ? call.function.arguments.replace(/```json|```/g, "").trim()
                : JSON.stringify(call.function.arguments);
            parsedArgs = JSON.parse(rawArgs);
        } catch (e) {
            parsedArgs = typeof call.function.arguments === 'object' ? call.function.arguments : { raw_input: call.function.arguments };
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

      // 5. SECURE TOOL EXECUTION
      const toolOutputs = await Promise.all(
        toolCalls.map(async (call, index) => {
          try {
            const tool = this.toolMap.get(call.function.name);
            if (!tool) {
              return { id: call.id, output: `Access Denied: Tool '${call.function.name}' missing.`, name: call.function.name };
            }
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
        
        // Ensure the ID is present for the history weld
        const callId = toolCalls[i].id || `call_${Date.now()}_${i}`;
        toolMessages.push(new ToolMessage(output, callId));
      }

      // Weld results into context for the next reasoning step
      history.push(new AIMessage(fullResponseContent, { tool_calls: toolCalls }));
      history.push(...toolMessages);
      
      yield { event: 'on_chat_model_stream', data: { chunk: { content: '' } } };
    }

    yield { event: 'on_agent_finish', data: { output: 'Aura Executive Alert: Max logic recursion steps reached.' } };
  }

  private constructScratchpad(steps: { action: AgentAction; observation: string }[]): string {
    if (steps.length === 0) return "";
    return steps.reduce((thoughts, { action, observation }) => {
      return thoughts + `\nThought: I used ${action.tool} with parameters ${JSON.stringify(action.toolInput)}\nObservation: ${observation}\n`;
    }, '\nINTERNAL STRATEGIC LOG:');
  }
}

export function createReactAgent(opts: { llm: any; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
  return { llm: opts.llm, tools: opts.tools, prompt: opts.prompt };
}

export default AgentExecutor;