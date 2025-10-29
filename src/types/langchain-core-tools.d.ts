import { z } from 'zod';

declare module "@langchain/core/tools" {

  /**
   * Manager for lifecycle callbacks for observability and traceability of tool execution.
   */
  export interface CallbackManager {
    onToolStart?: (detail: { toolName: string; input: unknown }) => void;
    onToolEnd?: (detail: { toolName: string; output: any }) => void;
    onToolError?: (error: Error, detail: { toolName: string; input: unknown }) => void;
  }

  /**
   * Parameters for creating a DynamicTool.
   * @template T The Zod schema for the tool's input.
   */
  export interface DynamicToolParams<T extends z.ZodObject<any>> {
    name: string;
    description: string;
    schema: T;
    func: (input: z.infer<T>, runManager?: CallbackManager) => Promise<any>;
  }

  // Do NOT redeclare or export the DynamicTool class here.
  // Only keep the interfaces/types for type augmentation.
}