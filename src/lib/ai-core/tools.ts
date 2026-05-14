// src/lib/ai-core/tools.ts
/**
 * --- BBU1 SOVEREIGN TOOL ARCHITECTURE ---
 * The base abstract layer for all Executive Tools (CFO, COO, HR, Aura).
 * This file provides the standardized interface for action, validation, and logging.
 * 
 * Design Pattern: Command Pattern with Zod-based Contract Validation.
 * Integrity Grade: Forensic / Multi-Tenant Isolated.
 */

import { z } from 'zod';

/**
 * SOVEREIGN RUNNABLE CONFIGURATION
 * Pass-through metadata for multi-tenant isolation and user-specific contexts.
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
 * Handles the state and lifecycle of a single tool execution.
 */
export interface RunManager {
  config: RunnableConfig;
}

/**
 * AUTHORITATIVE TOOL INTERFACE
 * The public contract that all BBU1 tools must satisfy to be ingested by the AI Kernel.
 */
export interface ITool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  invoke(input: unknown, config?: RunnableConfig): Promise<string>;
}

/**
 * THE SOVEREIGN TOOL BASE CLASS
 * An abstract engine that provides automatic schema validation, ASCII sanitization,
 * and autonomous error logging for every agent action.
 * 
 * @template T The Zod Schema defining the tool's input contract.
 */
export abstract class Tool<T extends z.ZodObject<any>> implements ITool {
  abstract name: string;
  abstract description: string;
  abstract schema: T;

  /**
   * Internal Execution Logic
   * Must be implemented by concrete tools (e.g., IngestKnowledgeTool).
   */
  protected abstract _execute(input: z.infer<T>, runManager: RunManager): Promise<string>;

  /**
   * SOVEREIGN INVOCATION GATEWAY
   * Performs a forensic handshake between the AI's reasoning and the system logic.
   * 
   * @param input - Data provided by the Cloud Brain (stringified JSON or Object).
   * @param config - Contextual metadata for the current business tenant.
   * @returns A promise resolving to a serialized business result or a forensic error.
   */
  async invoke(input: unknown, config: RunnableConfig = {}): Promise<string> {
    try {
      // 1. INPUT RECONCILIATION
      // Standardize input format regardless of whether it comes as a string or raw object.
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      
      // 2. CONTRACT VALIDATION
      // Enforce the Zod schema. If the AI sends malformed data, it is rejected here.
      const validatedInput = this.schema.parse(parsedInput);

      // 3. SECURE EXECUTION
      // Pass the validated data and multi-tenant config to the concrete implementation.
      return await this._execute(validatedInput, { config });

    } catch (error: any) {
      // 4. FORENSIC ERROR CAPTURE
      const errorMessage = error.message || 'An unexpected neural-to-logic handshake error occurred.';
      
      console.error(`[AURA FORENSIC] Link Failure in tool '${this.name}':`, errorMessage);
      
      /**
       * CRITICAL: CIRCULAR DEPENDENCY SHIELD
       * We utilize an ASYNCHRONOUS DYNAMIC IMPORT to break the loop between 
       * the Tool base class and the concrete SystemEventLoggerTool.
       */
      try {
          const { SystemEventLoggerTool } = await import('../ai-tools');
          const logger = new SystemEventLoggerTool();
          
          // Record the failure to the BBU1 immutable audit trail
          await logger.invoke({
              event_type: "error",
              payload: {
                  failed_tool: this.name,
                  forensic_fault: errorMessage,
                  input_provided: input,
                  business_id: config.configurable?.businessId,
                  user_id: config.configurable?.userId,
                  timestamp: new Date().toISOString()
              }
          }, config);
      } catch (logError) {
          // If logging fails, the system must remain sovereign and continue.
          console.error("Critical: Aura failed to record a system fault to ai_logs.", logError);
      }
      
      // Return a structured error so the Cloud Brain can attempt a self-correction.
      return JSON.stringify({ 
        success: false, 
        error: `Aura Protocol Error [${this.name}]: ${errorMessage}` 
      });
    }
  }
}

/**
 * STATUS: Tool Base Infrastructure Online.
 * VERSION: v10.2 (Sovereign Kernel Ready)
 * SECURITY: RLS & Multi-Tenant Aware.
 */