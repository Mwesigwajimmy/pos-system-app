/**
 * --- BBU1 SOVEREIGN TYPE AUGMENTATION ---
 * This declaration file augments the LangChain core toolset types.
 * It provides high-authority definitions for observability and tool orchestration.
 * 
 * Capability: Lifecycle Callbacks, Schema Validation, Traceability.
 * Target: Google Gemini 1.5 Pro / Sovereign C-Suite.
 */

import { z } from 'zod';

declare module "@langchain/core/tools" {

  /**
   * SOVEREIGN CALLBACK MANAGER
   * A high-precision interface for lifecycle observability.
   * This allows the BBU1 "Black Box" (SystemEventLogger) to track exactly 
   * when Aura-CFO or Aura-COO begins an action and whether it succeeds.
   */
  export interface CallbackManager {
    /** Triggered when the Cloud Brain initiates a physical action. */
    onToolStart?: (detail: { toolName: string; input: unknown }) => void;
    /** Triggered upon successful forensic completion of a tool execution. */
    onToolEnd?: (detail: { toolName: string; output: any }) => void;
    /** Triggered during a neural link corruption or database fault. */
    onToolError?: (error: Error, detail: { toolName: string; input: unknown }) => void;
  }

  /**
   * EXECUTIVE DYNAMIC TOOL PARAMETERS
   * The authoritative contract for defining new capabilities in the BBU1 Universe.
   * 
   * @template T The Zod schema governing the tool's input (Forensic Validation).
   */
  export interface DynamicToolParams<T extends z.ZodObject<any>> {
    /** The unique semantic name of the tool (e.g., 'aura_calculate_tax'). */
    name: string;
    /** A deep linguistic description to guide the AI's reasoning. */
    description: string;
    /** The strict Zod validation schema for the input. */
    schema: T;
    /** The physical logic function to be executed by the Sovereign Kernel. */
    func: (input: z.infer<T>, runManager?: CallbackManager) => Promise<any>;
  }

  /**
   * NOTE: The DynamicTool class itself is implemented within the 
   * lib/langchain/core-tools-shim.ts file to maintain engine independence.
   */
}

/**
 * STATUS: Type Link Established.
 * JURISDICTION: Global (BBU1 Universe).
 * VERSION: v10.2 (Omega Ready).
 */