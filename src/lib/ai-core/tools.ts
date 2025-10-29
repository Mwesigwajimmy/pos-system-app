import { z } from 'zod';
// FIX: We rely on the downstream user's responsibility to set up logging in a non-circular way.
// We are temporarily removing the specific named import that is causing a recursive import loop during compilation.
// import { SystemEventLoggerTool } from '../ai-tools'; // REMOVED TO AVOID CIRCULAR DEPENDENCY/TYPE ERRORS

export interface RunnableConfig {
  configurable?: { [key: string]: any };
  [key: string]: any;
}

export interface RunManager {
  config: RunnableConfig;
}

export interface ITool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  invoke(input: unknown, config?: RunnableConfig): Promise<string>;
}

export abstract class Tool<T extends z.ZodObject<any>> implements ITool {
  abstract name: string;
  abstract description: string;
  abstract schema: T;

  protected abstract _execute(input: z.infer<T>, runManager: RunManager): Promise<string>;

  async invoke(input: unknown, config: RunnableConfig = {}): Promise<string> {
    try {
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      const validatedInput = this.schema.parse(parsedInput);
      return await this._execute(validatedInput, { config });
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred during tool execution.';
      
      // FIX: Use a simple function and an *ASYNCHRONOUS IMPORT* (dynamic import) 
      // to break the synchronous type-level circular dependency between Tool and SystemEventLoggerTool
      try {
          const { SystemEventLoggerTool } = await import('../ai-tools');
          const logger = new SystemEventLoggerTool();
          // We must use 'await logger.invoke()' here to ensure logging before returning the final error.
          await logger.invoke({
              event_type: "error",
              payload: {
                  failed_tool: this.name,
                  error_message: errorMessage,
                  input_provided: input,
                  business_id: config.configurable?.businessId, // Add for better logging
                  user_id: config.configurable?.userId,         // Add for better logging
              }
          }, config);
      } catch (logError) {
          console.error("Critical: Failed to log system event from tool catch block.", logError);
      }
      
      return JSON.stringify({ success: false, error: `Tool ${this.name} failed: ${errorMessage}` });
    }
  }
}