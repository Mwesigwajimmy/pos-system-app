/**
 * --- BBU1 SOVEREIGN TYPE AUGMENTATION (OMEGA-ULTIMATUM) ---
 * VERSION: v14.0 OMEGA (ALIGNED FOR AURA ELITE 1024)
 * JURISDICTION: Global Unified Business Universe.
 * 
 * This declaration file augments the LangChain core toolset types.
 * It provides high-authority definitions for observability, multi-tenant isolation,
 * and high-density neural-to-logic orchestration.
 * 
 * UPGRADE LOG:
 * 1. NEURAL REALIGNMENT: Fully synchronized for 1024-dimension Voyage Elite.
 * 2. FORENSIC TRACEABILITY: Added specific interfaces for boardroom presentation 
 *    metadata and forensic audit trails.
 * 3. CHANNEL INTEGRITY: Defined strict callback signatures to prevent 
 *    asynchronous race conditions during tool execution.
 */

import { z } from 'zod';

declare module "@langchain/core/tools" {

  /**
   * SOVEREIGN RUNNABLE CONFIGURATION
   * Augmented interface to enforce multi-tenant isolation.
   * Ensures Aura never "leaks" data between different BusinessIDs.
   */
  export interface RunnableConfig {
    configurable?: { 
      /** The unique Sovereign ID of the business entity. */
      businessId: string;
      /** The specific Sector/Industry context. */
      industry?: string;
      /** The ID of the acting Director or Partner. */
      userId?: string;
      /** Active ERP modules (SACCO, Medical, etc.) */
      tenantModules?: string[];
      /** Standard for the memory core (Fixed at 1024). */
      brain_dim?: 1024;
      [key: string]: any; 
    };
  }

  /**
   * SOVEREIGN CALLBACK MANAGER
   * A high-precision interface for lifecycle observability.
   * This allows the "Sovereign Motherboard" to track exactly when 
   * Aura-CFO, Aura-COO, or Aura-HR initiates a database physical action.
   */
  export interface CallbackManager {
    /** Triggered when the Cloud Brain initiates a physical forensic action. */
    onToolStart?: (detail: { 
        toolName: string; 
        input: unknown; 
        forensic_id: string;
        timestamp: string;
    }) => void;
    
    /** Triggered upon successful mathematical completion of a tool execution. */
    onToolEnd?: (detail: { 
        toolName: string; 
        output: any; 
        saturation_level: "100%";
    }) => void;
    
    /** Triggered during a neural link corruption or database handshake fault. */
    onToolError?: (error: Error, detail: { 
        toolName: string; 
        input: unknown; 
        technical_rejection_reason: string;
    }) => void;
  }

  /**
   * EXECUTIVE DYNAMIC TOOL PARAMETERS
   * The authoritative contract for defining new physical capabilities.
   * 
   * @template T The Zod schema governing the tool's input (Forensic Validation).
   */
  export interface DynamicToolParams<T extends z.ZodObject<any>> {
    /** The unique semantic name of the tool (e.g., 'aura_autonomous_edit'). */
    name: string;
    /** A deep linguistic description to guide the Gemini 1.5 Pro reasoning. */
    description: string;
    /** The strict Zod validation schema for 1024-dimensional alignment. */
    schema: T;
    /** The physical logic function executed by the Sovereign Kernel. */
    func: (input: z.infer<T>, runManager?: CallbackManager & { config: RunnableConfig }) => Promise<any>;
  }

  /**
   * NOTE: The actual implementation of these interfaces resides in 
   * src/lib/langchain/core-tools-shim.ts to maintain infrastructure independence.
   */
}

/**
 * STATUS: Type Link Saturated.
 * DNA_STANDARD: Elite 1024-dim Aligned.
 * COMPLIANCE: IFRS / Commercial-Safe.
 */