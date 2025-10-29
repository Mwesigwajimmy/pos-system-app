import { ITool } from './tools';
import { AI_IDENTITY } from './manifest';

// --- FIX: ALL LANGCHAIN IMPORTS MUST USE THE CONSISTENT ALIASES/SHIMS ---
// CORRECTED IMPORT: This now uses the webpack alias to prevent duplicate identifiers.
import { ChatOllama } from '@langchain/community/chat_models/ollama';
// CORRECTED IMPORT: Switched to aliased paths for consistency.
import { ChatPromptTemplate, MessagesPlaceholder, BaseMessage } from '@langchain/core/prompts';
// Now `createReactAgent` is exported from your shim!
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

    // Convert Map of tools back to an array for createReactAgent
    const toolsArray = Array.from(this.tools.values());

    // Create the "agent configuration" using your shim's createReactAgent
    const agentConfig = createReactAgent({
        llm: this.llm,
        tools: toolsArray as any, // Cast to any if ITool doesn't perfectly match LangChain's Tool type
        prompt: this.prompt as any, // FIX: Cast to any to resolve the duplicate 'ChatPromptTemplate' type conflict.
    });

    this.agentExecutor = new AgentExecutor({
        agent: agentConfig, // Pass the agent configuration here
        tools: toolsArray as any, // Tools are also needed by the executor for execution
        verbose: this.verbose
    });
  }

  private log(message: string, ...args: any[]) { if (this.verbose) console.log(`[AuraKernel] ${message}`, ...args); }

  private createPrompt(): ChatPromptTemplate {
    const toolNames = Array.from(this.tools.keys()).join(', ');
    const toolDefs = Array.from(this.tools.values()).map(t => JSON.stringify({ name: t.name, description: t.description, schema: t.schema })).join('\n');
    return ChatPromptTemplate.fromMessages([
        ["system", `${AI_IDENTITY.directive}\nMy available tools are: [${toolNames}].\nTool Definitions:\n${toolDefs}\nI will autonomously plan and execute tasks.`],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
    ]);
  }

  public async *run(context: { input: string; chat_history: BaseMessage[]; config: any }): AsyncGenerator<AgentStreamEvent> {
    this.log(`Starting run for user input: ${context.input}`);

    const inputObj: AgentStreamInput = {
        input: context.input,
        chat_history: context.chat_history,
    };

    yield* this.agentExecutor.stream(inputObj, context.config);
  }
}