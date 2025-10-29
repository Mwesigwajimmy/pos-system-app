import { z } from 'zod';

/**
 * A configuration object passed to Runnable tools and agents.
 */
export interface RunnableConfig {
  configurable?: { [key: string]: any };
  [key: string]: any;
}

/**
 * Manages callbacks and configuration for tool execution.
 */
export interface RunManager {
  callbacks?: any; // For advanced observability; replace with a specific callback manager if needed
  config: RunnableConfig;
}

/**
 * Parameters required to create a DynamicTool.
 * @template T The Zod schema for the tool's input.
 */
export interface DynamicToolParams<T extends z.ZodObject<any>> {
  name: string;
  description: string;
  schema: T;
  func: (input: z.infer<T>, runManager: RunManager) => Promise<any>;
}

/**
 * A production-grade, schema-validated, observable dynamic tool for AI agents.
 * @template T The Zod schema for the tool's input.
 */
export class DynamicTool<T extends z.ZodObject<any>> {
  readonly name: string;
  readonly description: string;
  readonly schema: T;
  private func: (input: z.infer<T>, runManager: RunManager) => Promise<any>;

  constructor(params: DynamicToolParams<T>) {
    this.name = params.name;
    this.description = params.description;
    this.func = params.func;
    this.schema = params.schema;
  }

  /**
   * Invokes the tool, validating input and handling errors robustly.
   * Supports observability via runManager.callbacks.
   * @param input - The input to the tool (object or stringified JSON).
   * @param config - Optional configuration for execution.
   * @returns A promise resolving to the tool's result or a structured error.
   */
  async invoke(input: unknown, config: RunnableConfig = {}): Promise<string> {
    let result: any;
    let success = false;
    try {
      if (config?.callbacks?.onToolStart) {
        config.callbacks.onToolStart({ toolName: this.name, input });
      }

      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      const validatedInput = this.schema.parse(parsedInput);

      result = await this.func(validatedInput, { config, callbacks: config.callbacks });

      success = true;
      if (config?.callbacks?.onToolEnd) {
        config.callbacks.onToolEnd({ toolName: this.name, output: result });
      }

      return typeof result === 'string'
        ? result
        : JSON.stringify({ success: true, result });

    } catch (error: any) {
      if (config?.callbacks?.onToolError) {
        config.callbacks.onToolError(error, { toolName: this.name, input });
      }
      const errorMessage = error.message || 'An unexpected error occurred.';
      return JSON.stringify({ success: false, error: errorMessage });
    }
  }
}