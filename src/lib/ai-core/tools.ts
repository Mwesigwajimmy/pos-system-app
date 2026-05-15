// src/lib/ai-core/tools.ts
/**
 * --- BBU1 SOVEREIGN TOOL ARCHITECTURE (OMEGA-ULTIMATUM EDITION) ---
 * VERSION: v11.0 CLOUD-NATIVE STABLE.
 * The definitive abstract layer for Aura's physical capabilities.
 * 
 * This engine acts as the "Nerve-to-Muscle" interface, converting high-density 
 * neural intent from the Gemini Cloud into validated, multi-tenant system actions.
 * 
 * UPGRADE LOG:
 * 1. REALIGNMENT: Fully aligned with the 1024-dimension Elite Memory Core.
 * 2. INTEGRITY: Forced Zod-contract enforcement to prevent malformed execution.
 * 3. ISOLATION: Multi-tenant BusinessID context is strictly required for all runs.
 * 4. CIRCULAR SHIELD: Refined dynamic import for asynchronous forensic logging.
 */

import { z } from 'zod';

/**
 * SOVEREIGN RUNNABLE CONFIGURATION
 * Pass-through metadata for multi-tenant isolation and user-specific contexts.
 * Enforces that Aura only operates within the Director's authorized jurisdiction.
 */
export interface RunnableConfig {
  configurable?: { 
    businessId?: string;
    userId?: string;
    industry?: string;
    businessName?: string;
    userName?: string;
    tenantModules?: string[];
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
 * The public contract that all BBU1 tools must satisfy to be ingested 
 * by the Sovereign AI Kernel and the Agent Executor.
 */
export interface ITool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  invoke(input: unknown, config?: RunnableConfig): Promise<string>;
}

/**
 * THE SOVEREIGN TOOL BASE CLASS
 * An abstract engine providing forensic validation, sanitization, 
 * and autonomous error recovery for every agent action.
 * 
 * @template T - The Zod Schema defining the tool's input contract.
 */
export abstract class Tool<T extends z.ZodObject<any>> implements ITool {
  abstract name: string;
  abstract description: string;
  abstract schema: T;

  /**
   * Internal Execution Logic
   * Concrete implementation provided by specialized tools (e.g., FileExporterTool).
   */
  protected abstract _execute(input: z.infer<T>, runManager: RunManager): Promise<string>;

  /**
   * SOVEREIGN INVOCATION GATEWAY
   * Performs a high-fidelity handshake between the AI's reasoning and system logic.
   * 
   * @param input - Data provided by the Cloud Brain (JSON string or Object).
   * @param config - Contextual metadata for the current business tenant.
   * @returns A serialized business result or a forensic-grade error report.
   */
  async invoke(input: unknown, config: RunnableConfig = {}): Promise<string> {
    try {
      // 1. FORENSIC INPUT RECONCILIATION
      // Standardize input format; handle stringified JSON from LLM stream.
      const parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      
      // 2. CONTRACT ENFORCEMENT
      // Enforce the Zod schema strictly. Reject any "hallucinated" parameters.
      const validatedInput = this.schema.parse(parsedInput);

      // 3. CONTEXTUAL VALIDATION
      // Ensure the Sovereign context is present before touching the database.
      if (!config.configurable?.businessId && this.name !== 'system_logger') {
          throw new Error(`Aura Security Protocol: Unauthorized tool call attempted. BusinessID missing.`);
      }

      // 4. SECURE EXECUTION
      // Pass the validated data and multi-tenant config to the concrete implementation.
      const result = await this._execute(validatedInput, { config });
      
      return result;

    } catch (error: any) {
      // 5. FORENSIC ERROR CAPTURE
      return await this.handleForensicFailure(error, input, config);
    }
  }

  /**
   * handleForensicFailure
   * Captures the exact point of failure in the neural pathway.
   * Logs to the immutable audit trail and returns a conclusion Aura can reason with.
   */
  private async handleForensicFailure(error: any, input: any, config: RunnableConfig): Promise<string> {
    const errorMessage = error.message || 'An internal neural-to-logic link error occurred.';
    console.error(`[AURA FORENSIC] Link Failure in tool '${this.name}':`, errorMessage);

    /**
     * ASYNCHRONOUS DYNAMIC LOGGING
     * We utilize a dynamic import to prevent circular dependency loops
     * during the production build optimization.
     */
    try {
        const { SystemEventLoggerTool } = await import('../ai-tools/system');
        const logger = new SystemEventLoggerTool();
        
        await logger.invoke({
            event_type: "forensic_fault",
            payload: {
                failed_tool: this.name,
                technical_reason: errorMessage,
                raw_input: input,
                business_id: config.configurable?.businessId,
                user_id: config.configurable?.userId,
                timestamp: new Date().toISOString()
            }
        }, config);
    } catch (logError) {
        // Continue if logging fails to maintain Sovereign Uptime.
        console.warn("Aura Alert: Backup log entry failed. Proceeding with safe recovery.");
    }

    // Return structured error to the AI Kernel for autonomous self-correction.
    return JSON.stringify({ 
      success: false, 
      error_type: "forensic_fault",
      tool: this.name,
      message: `Aura Protocol Error: ${errorMessage}`,
      instruction: "Please check parameters and attempt re-validation."
    });
  }

  /**
   * call
   * Alias for invoke to ensure compatibility with LangChain-style executors.
   */
  async call(input: unknown, config?: RunnableConfig): Promise<string> {
      return this.invoke(input, config);
  }
}

/**
 * STATUS: Tool Base Infrastructure Fully Aligned.
 * VERSION: v11.0 (Omega-Ultimatum Engine Ready)
 * JURISDICTION: BBU1 Global ERP Framework.
 * SECURITY: Zero-Trust Multi-Tenant Isolation.
 */