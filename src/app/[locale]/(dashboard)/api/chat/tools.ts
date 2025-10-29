import { z } from 'zod';
import { DynamicTool, RunManager } from '@/lib/langchain/core-tools-shim';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// --- IMPORTANT NOTE ON NODE.JS DEPENDENCIES IN EDGE RUNTIME ---
// The following imports (jsPDF, autoTable, XLSX) rely on Node.js-specific global objects (like Buffer) 
// and modules that may not be available or function correctly in the Vercel Edge Runtime. 
// If this file is deployed in an Edge Runtime environment (e.g., Vercel /app/api/route.ts), 
// these tools WILL LIKELY FAIL. The recommended solution is to move the file generation logic 
// to a dedicated, Node.js-based serverless function or an external service.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Buffer } from 'buffer'; // Explicitly import Buffer for Edge/Server compatibility

// REVOLUTIONARY SUPABASE TOOL FACTORY
export const createSupabaseTool = <T extends z.ZodObject<any>>(
  name: string, 
  description: string, 
  schema: T, 
  rpcName: string,
  outputAction?: { action: string }
) => {
  return new DynamicTool({
    name, description,
    func: async (toolInput: z.infer<T>, runManager: RunManager) => {
      const businessId = runManager.config.configurable?.businessId;
      if (!businessId) return JSON.stringify({ success: false, error: "Critical security failure. Business ID is missing." });
      
      const supabase = createClient(cookies());
      const rpcParams: { [key: string]: any } = { p_business_id: businessId };
      Object.keys(schema.shape).forEach(key => {
          const toolKey = key as keyof z.infer<T>;
          // Ensure null/undefined values are handled according to your RPC's expectations
          if (toolInput[toolKey] !== undefined) rpcParams[`p_${key}`] = toolInput[toolKey]; 
      });
      
      const { data, error } = await supabase.rpc(rpcName, rpcParams);
      if (error) {
        // Return a clear, stringified error for the LLM to process
        return `Error from tool '${name}': ${error.message}.`;
      }

      if (outputAction) {
        // Return a stringified object with the action for the frontend
        return JSON.stringify({ action: outputAction.action, payload: data });
      }
      // Return raw data as a string for the LLM to incorporate into its response
      return JSON.stringify(data);
    },
    schema,
  });
};

// --- KNOWLEDGE & LEARNING ---
export const knowledgeRetrievalTool = new DynamicTool({
    name: "retrieve_knowledge",
    description: "Searches the company's knowledge base to answer questions about the business, software, or past events.",
    schema: z.object({
        query: z.string().describe("A clear, specific question to search the knowledge base."),
    }),
    func: async ({ query }, runManager: RunManager) => {
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());
        // This is where you would integrate a real vector embedding model.
        // For now, we pass the query directly as a placeholder for the RPC.
        const { data, error } = await supabase.rpc('match_documents', {
            p_business_id: businessId,
            p_query_embedding: query, 
            p_match_threshold: 0.78,
            p_match_count: 5
        });
        if (error) return `Error retrieving knowledge: ${error.message}`;
        return `Found relevant context: ${JSON.stringify(data)}`;
    },
});

// --- INTERACTIVE UI TOOLS ---
export const uiNavigationTool = new DynamicTool({
    name: "navigate_to_page",
    description: "Takes the user to a specific page or dashboard within the application. The LLM MUST return a ToolCall with the final URL, and then ONLY output a final message that is helpful to the user.",
    schema: z.object({
        url: z.string().describe("The relative URL of the page (e.g., '/dashboard/invoices').")
    }),
    func: async ({ url }, runManager: RunManager) => {
        // This tool's purpose is to command the frontend.
        // Return a stringified object with the 'navigate' action.
        return JSON.stringify({
            action: "navigate",
            payload: { url }
        });
    }
});

// --- CRITICAL BUSINESS ACTIONS ---
export const processPaymentTool = new DynamicTool({
    name: "process_invoice_payment",
    description: "Processes a payment for a specific invoice. This is an irreversible action.",
    schema: z.object({
        invoice_id: z.string().describe("The ID of the invoice to be paid."),
        payment_method: z.string().describe("The method of payment (e.g., 'Credit Card', 'Bank Transfer').")
    }),
    func: async({ invoice_id, payment_method }, runManager: RunManager) => {
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());
        const { data, error } = await supabase.rpc('process_payment', { p_business_id: businessId, p_invoice_id: invoice_id, p_payment_method: payment_method });
        if (error) return `Error processing payment: ${error.message}`;
        return JSON.stringify(data);
    }
});

// --- FILE EXPORTING ---
export const universalFileExporterTool = new DynamicTool({
    name: "export_data_as_file",
    description: "Takes a JSON array and converts it into a PDF or Excel file, returning a base64 string for download. The LLM MUST only output a final message with the Download ToolCall.",
    // Correct schema structure confirmed
    schema: z.object({ 
        file_format: z.enum(["pdf", "excel"]), 
        file_name: z.string().describe("The desired name for the file, without the extension."), 
        title: z.string().describe("The title to be used inside the document (e.g., 'Q4 Sales Report')."), 
        data: z.array(z.record(z.string(), z.any())).describe("The structured JSON array of data to be exported.")
    }),
    func: async ({ file_format, file_name, title, data }, runManager: RunManager) => {
        if (!data || data.length === 0) {
            return JSON.stringify({ action: "error", payload: "No data was provided to export." });
        }
        try {
            let base64Content: string;
            let mimeType: string;
            let finalFileName: string;

            if (file_format === 'pdf') {
                const doc = new jsPDF();
                doc.text(title, 14, 20);
                // Extract headers from the first object
                const head = [Object.keys(data[0])]; 
                // Map data to rows based on the headers
                const body = data.map((row: any) => head[0].map(key => row[key] !== null && row[key] !== undefined ? String(row[key]) : ''));
                
                // @ts-ignore - autoTable does not have full type definitions
                autoTable(doc, { startY: 30, head: head, body: body, theme: 'striped' });
                
                // Outputting as base64 string
                base64Content = Buffer.from(doc.output('arraybuffer')).toString('base64');
                mimeType = 'application/pdf';
                finalFileName = `${file_name}.pdf`;
            } else { // Excel (xlsx)
                const worksheet = XLSX.utils.json_to_sheet(data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
                
                // Write workbook to a buffer then convert to base64
                const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
                base64Content = buffer.toString('base64');
                mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                finalFileName = `${file_name}.xlsx`;
            }

            // Return a machine-readable JSON object with the action for the frontend to handle the download.
            return JSON.stringify({ 
                action: "download_file", 
                payload: { 
                    fileName: finalFileName, 
                    mimeType: mimeType, 
                    content: base64Content 
                }
            });
        } catch (e: any) {
            console.error("File Generation Error:", e);
            return `Error during file generation: ${e.message}`;
        }
    },
});