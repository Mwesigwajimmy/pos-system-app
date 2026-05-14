import { z } from 'zod';

/**
 * SOVEREIGN RUNNABLE CONFIGURATION
 * A configuration object passed to Autonomous Agents (CFO, COO, HR) and the AI Kernel.
 * Optimized for multi-tenant isolation and cross-border business logic.
 */
export interface RunnableConfig {
  configurable?: { 
    businessId?: string;
    userId?: string;
    industry?: string;
    [key: string]: any; 
  };
  [key: string]: any;
}

/**
 * EXECUTIVE RUN MANAGER
 * Manages high-precision callbacks and forensic configuration for tool execution.
 * Essential for Aura's "Boardroom Presentation" narration and chart generation.
 */
export interface RunManager {
  callbacks?: any; 
  config: RunnableConfig;
}

/**
 * EXECUTIVE TOOL PARAMETERS
 * Parameters required to create a Dynamic Executive Tool.
 * @template T The Zod schema for the agent's input validation.
 */
export interface DynamicToolParams<T extends z.ZodObject<any>> {
  name: string;
  description: string;
  schema: T;
  func: (input: z.infer<T>, runManager: RunManager) => Promise<any>;
}

/**
 * THE SOVEREIGN DYNAMIC TOOL
 * A production-grade, forensic-validated, observable dynamic tool for the BBU1 C-Suite.
 * This class allows the Cloud Gemini Brain to operate the physical ERP functions
 * (Ledgers, Medical Records, Inventory) via Semantic Handshakes.
 * 
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
   * SOVEREIGN INVOCATION GATEWAY
   * Invokes the tool, validating input against the C-Suite schema and handling errors forensicly.
   * Now optimized for the 1-million-token context window of Gemini 1.5 Pro.
   * 
   * @param input - The intelligence input to the tool (object or stringified JSON).
   * @param config - Sovereign configuration for multi-tenant isolation.
   * @returns A promise resolving to the tool's result or a structured forensic error.
   */
  async invoke(input: unknown, config: RunnableConfig = {}): Promise<string> {
    let result: any;
    let success = false;
    
    try {
      // 1. NEURAL HANDSHAKE: Notify observability hooks that an agent is acting
      if (config?.callbacks?.onToolStart) {
        config.callbacks.onToolStart({ toolName: this.name, input });
      }

      // 2. INPUT SANITIZATION: Handle both JSON strings and raw objects from the Cloud Brain
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      
      // 3. SCHEMA VALIDATION: Enforce strict data types for financial and medical integrity
      const validatedInput = this.schema.parse(parsedInput);

      // 4. EXECUTION: Run the actual business logic inside the BBU1 Kernel
      result = await this.func(validatedInput, { config, callbacks: config.callbacks });

      success = true;
      
      // 5. COMPLETION Handshake
      if (config?.callbacks?.onToolEnd) {
        config.callbacks.onToolEnd({ toolName: this.name, output: result });
      }

      // Return high-density JSON or raw string for the Executive Council to process
      return typeof result === 'string'
        ? result
        : JSON.stringify({ success: true, result, tool: this.name });

    } catch (error: any) {
      // 6. FORENSIC ERROR HANDLING: If an agent fails, provide self-healing context to Aura
      if (config?.callbacks?.onToolError) {
        config.callbacks.onToolError(error, { toolName: this.name, input });
      }
      
      const errorMessage = error.message || 'An unexpected neural link corruption occurred.';
      
      console.error(`[AURA FORENSIC] Tool Failure in ${this.name}:`, errorMessage);

      // We return a structured error so Gemini can understand WHY it failed and try again
      return JSON.stringify({ 
        success: false, 
        error: errorMessage, 
        failed_agent_tool: this.name,
        timestamp: new Date().toISOString()
      });
    }
  }
}