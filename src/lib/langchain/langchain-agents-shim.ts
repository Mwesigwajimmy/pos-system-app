// src/lib/langchain/langchain-agents-shim.ts
// A "revolutionary" AgentExecutor that orchestrates a true, streaming ReAct loop.
// It supports parallel tool calls, stateful history, and rich, observable events.

// FIX: Changed the import path for ChatOllama to use the aliased path
import { ChatOllama, OllamaMessage, ToolCall } from '@langchain/community/chat_models/ollama';
import { DynamicTool } from './core-tools-shim';
import { ChatPromptTemplate, BaseMessage, AIMessage, ToolMessage } from './core-prompts-shim'; // FIX: Imported necessary message types

export interface AgentAction {
  tool: string;
  toolInput: any;
  log: string; // A log of the agent's thought process
}

export interface AgentFinish {
  output: string;
}

// FIX: This type definition was too generic (event: string), which broke the generator yield* loop.
// A streaming event must be a DISCRIMINATED UNION for TypeScript to ensure correctness.
export type AgentStreamEvent =
  | { event: 'on_chat_model_stream'; data: { chunk: { content: string } } }
  | { event: 'on_agent_finish'; data: AgentFinish }
  | { event: 'on_agent_action'; data: AgentAction }
  | { event: 'on_tool_end'; data: { output: string } };

// We keep AgentStep here as the *internal* yield type to preserve original intent,
// but we cast the final stream result to AgentStreamEvent where it is generated.
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

// Interface for AgentExecutor Input to allow it to be passed through cleanly
export interface AgentStreamInput {
  input: string;
  chat_history?: BaseMessage[];
}


/**
 * The core engine that drives the agent's think-act loop.
 */
export class AgentExecutor {
  private agent: AgentExecutorOptions['agent'];
  private tools: DynamicTool<any>[];
  private toolMap: Map<string, DynamicTool<any>>;
  private verbose: boolean;
  private maxSteps: number;

  // This is the ONLY constructor for AgentExecutor
  constructor(opts: AgentExecutorOptions) {
    this.agent = opts.agent;
    this.tools = opts.tools;
    this.toolMap = new Map(this.tools.map(tool => [tool.name, tool]));
    this.verbose = !!opts.verbose;
    this.maxSteps = opts.maxSteps ?? 6; // Safety brake for the agent loop
  }

  private log(message: string, ...args: any[]) {
    if (this.verbose) {
      console.log(`[AgentExecutor] ${message}`, ...args);
    }
  }

  /**
   * Creates a structured agent from a compatible LLM, tools, and a prompt.
   * This static method is not directly used by createReactAgent in AIKernel.
   * It's a helper if you wanted to create an AgentExecutor directly.
   */
  static async create(opts: { llm: ChatOllama; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
    return new AgentExecutor({ agent: { llm: opts.llm, prompt: opts.prompt }, tools: opts.tools });
  }

  /**
   * The main streaming method that runs the agent loop.
   * Yields a series of events representing the agent's lifecycle.
   */
  async *stream(
    inputObj: { input: string; chat_history?: BaseMessage[] },
    runOptions?: any
    // FIX: Changed return type to AsyncGenerator<AgentStreamEvent> for full typing safety.
  ): AsyncGenerator<AgentStreamEvent> {
    this.log('Starting agent stream with input:', inputObj);
    const llm = this.agent.llm;
    const prompt = this.agent.prompt;
    const intermediateSteps: { action: AgentAction; observation: string }[] = [];
    const history: BaseMessage[] = inputObj.chat_history || [];

    for (let step = 0; step < this.maxSteps; step++) {
      // 1. Format the prompt with the current state
      const promptValues = {
        input: inputObj.input,
        agent_scratchpad: this.constructScratchpad(intermediateSteps),
        chat_history: history,
      };

      // FIX: Combine user input and scratchpad into formatted messages array
      const formattedMessages = prompt.format(promptValues);

      this.log(`Step ${step + 1}: Calling LLM with ${formattedMessages.length} formatted messages.`);

      // 2. Stream the LLM response
      let fullResponseContent = '';
      let toolCalls: ToolCall[] = [];

      // FIX: Use the messages array as input for the chat method
      const llmStream = llm.chat(formattedMessages as any, runOptions?.configurable);

      for await (const chunk of llmStream) {
        if (chunk.type === 'chunk') {
          fullResponseContent += chunk.content;
          // FIX: The payload correctly conforms to AgentStreamEvent
          yield { event: 'on_chat_model_stream', data: { chunk: { content: chunk.content } } };
        } else if (chunk.type === 'tool_calls') {
          toolCalls = chunk.content;
        }
      }

      // FIX: Use AIMessage class for consistency
      const assistantMessage: AIMessage = new AIMessage(fullResponseContent);
      assistantMessage.tool_calls = toolCalls.length > 0 ? toolCalls : undefined;

      // 3. Decide the next move: finish or use tools
      if (toolCalls.length === 0) {
        this.log('Agent decided to finish. Output:', assistantMessage.content);
        // FIX: The payload correctly conforms to AgentStreamEvent
        yield { event: 'on_agent_finish', data: { output: assistantMessage.content } as AgentFinish };
        return;
      }

      // 4. Execute tools in parallel
      this.log(`Agent decided to use ${toolCalls.length} tool(s):`, toolCalls.map(t => t.function.name));
      const actions: AgentAction[] = toolCalls.map(call => ({
        tool: call.function.name,
        toolInput: JSON.parse(call.function.arguments),
        log: `Invoking tool \`${call.function.name}\` with arguments: ${call.function.arguments}`,
      }));

      for (const action of actions) {
          // FIX: The payload correctly conforms to AgentStreamEvent
          yield { event: 'on_agent_action', data: action };
      }

      const toolOutputs = await Promise.all(
        toolCalls.map(async (call) => {
          const tool = this.toolMap.get(call.function.name);
          if (!tool) {
            return {
              id: call.id,
              output: JSON.stringify({ error: `Tool '${call.function.name}' not found.` }),
            };
          }
          // Pass the full RunManager config including the configurable part
          const output = await tool.invoke(call.function.arguments, { configurable: runOptions?.configurable || {} });
          return { id: call.id, output };
        })
      );

      // 5. Record tool observations and yield events
      const toolMessages: ToolMessage[] = [];
      for (let i = 0; i < toolOutputs.length; i++) {
        const { output } = toolOutputs[i];
        const action = actions[i];
        intermediateSteps.push({ action, observation: output });
        // FIX: The payload correctly conforms to AgentStreamEvent
        yield { event: 'on_tool_end', data: { output } };

        toolMessages.push(new ToolMessage(output, toolCalls[i].id));
      }

      // Update history for the next loop iteration (Crucial for ReAct)
      history.push(assistantMessage);
      history.push(...toolMessages);
    }

    this.log('Agent reached max steps.');
    // FIX: The payload correctly conforms to AgentStreamEvent
    yield { event: 'on_agent_finish', data: { output: 'Agent stopped due to reaching maximum iteration limit.' } as AgentFinish };
  }

  // The Agent's scratchpad is now constructed based on the intermediate steps
  private constructScratchpad(steps: { action: AgentAction; observation: string }[]): string {
    return steps.reduce((thoughts, { action, observation }) => {
      // FIX: Add the scratchpad content that the LLM will see in the next prompt
      return thoughts + `\nTool Used: ${action.tool}\nTool Input: ${JSON.stringify(action.toolInput)}\nObservation: ${observation}\n`;
    }, '');
  }
}

/**
 * A modern factory function for creating the agent. It bundles the LLM, tools,
 * and a pre-defined prompt template that instructs the model on how to use tools.
 * This function is used by AIKernel when it needs to "create" an agent.
 * It returns the core components that AgentExecutor needs.
 */
export function createReactAgent(opts: { llm: ChatOllama; tools: DynamicTool<any>[]; prompt: ChatPromptTemplate }) {
  // Your AgentExecutor constructor already takes these options directly.
  // So, this factory function can simply return an object containing them.
  // The AIKernel will then pass these to the AgentExecutor.
  return {
    llm: opts.llm,
    tools: opts.tools,
    prompt: opts.prompt,
  };
}


export default AgentExecutor;