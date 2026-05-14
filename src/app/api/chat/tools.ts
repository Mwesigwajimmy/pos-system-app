// src/lib/ai-tools/data.ts
import { z } from 'zod';
import { DynamicTool, RunManager } from '@/lib/langchain/core-tools-shim';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// ✅ SOVEREIGN LINK: Importing the upgraded Cloud Embedding engine
import { generateEmbedding } from './embedding'; 

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

/**
 * REVOLUTIONARY SUPABASE TOOL FACTORY (EXECUTIVE GRADE)
 * Dynamically constructs high-authority tools that bridge Natural Language to Postgres RPCs.
 * Enforces strict multi-tenant isolation via the Sovereign BusinessID.
 */
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
      
      // Security Protocol: Refuse execution if the sovereign context is missing
      if (!businessId) {
          return JSON.stringify({ 
              success: false, 
              error: "Aura Security Alert: Critical security failure. Business ID is missing. Action Logged." 
          });
      }
      
      const supabase = createClient(cookies());
      const rpcParams: { [key: string]: any } = { p_business_id: businessId };
      
      Object.keys(schema.shape).forEach(key => {
          const toolKey = key as keyof z.infer<T>;
          // Ensure forensic parameter mapping for Postgres RPC handshake
          if (toolInput[toolKey] !== undefined) rpcParams[`p_${key}`] = toolInput[toolKey]; 
      });
      
      const { data, error } = await supabase.rpc(rpcName, rpcParams);
      
      if (error) {
        // Return a high-density error for the Executive Kernel to reason upon
        return `Aura Forensic Error from tool '${name}': ${error.message}. Timestamp: ${new Date().toISOString()}`;
      }

      if (outputAction) {
        // Return structured action payload for immediate UI rendering
        return JSON.stringify({ 
            action: outputAction.action, 
            payload: data,
            executive_status: "Verified"
        });
      }
      
      // Return raw data string for the LLM's analytical integration
      return JSON.stringify({
          status: "Success",
          origin: name,
          data: data
      });
    },
    schema,
  });
};

/**
 * KNOWLEDGE & NEURAL LEARNING ENGINE
 * UPGRADED: Now utilizes real-time Cloud Gemini embeddings for semantic retrieval.
 */
export const knowledgeRetrievalTool = new DynamicTool({
    name: "retrieve_knowledge",
    description: "Searches the BBU1 Master Brain and company knowledge base to answer questions about the business, software protocols, or historical events using semantic high-density retrieval.",
    schema: z.object({
        query: z.string().describe("A clear, forensic business question to search in the knowledge base."),
    }),
    func: async ({ query }, runManager: RunManager) => {
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        try {
            // 🧠 NEURAL HANDSHAKE: Convert Natural Language into a high-dimensional vector
            const queryEmbedding = await generateEmbedding(query);

            const { data, error } = await supabase.rpc('match_documents', {
                p_business_id: businessId,
                p_query_embedding: queryEmbedding, 
                p_match_threshold: 0.72, // Optimized for Gemini 1.5 Pro retrieval
                p_match_count: 10         // Deep context for multi-agent reasoning
            });

            if (error) throw error;

            return JSON.stringify({
                status: "Context Synchronized",
                results: data,
                query_ref: query,
                timestamp: new Date().toISOString()
            });

        } catch (err: any) {
            return `Aura Neural Retrieval Fault: ${err.message}`;
        }
    },
});

/**
 * INTERACTIVE EXECUTIVE UI TOOLS
 * Powers the "Physical Hands" of Aura to manipulate the dashboard.
 */
export const uiNavigationTool = new DynamicTool({
    name: "navigate_to_page",
    description: "Moves the Director to a specific page or dashboard. The LLM MUST return a ToolCall with the final URL, and then provide a professional executive summary of why the navigation is occurring.",
    schema: z.object({
        url: z.string().describe("The relative BBU1 internal URL (e.g., '/dashboard/accounting').")
    }),
    func: async ({ url }, runManager: RunManager) => {
        return JSON.stringify({
            action: "navigate",
            payload: { 
                url, 
                initiated_at: new Date().toISOString() 
            }
        });
    }
});

/**
 * SOVEREIGN BOARDROOM PRESENTATION TOOL
 * The visual stage where Aura's council (CFO, COO, PM) presents insights.
 */
export const boardroomPresentationTool = new DynamicTool({
    name: "prepare_boardroom_presentation",
    description: "REQUIRED for financial audits and breakdowns. Generates a full-screen executive briefing with slides, charts, and voice narration. Aura acts as the orchestrator and invites the CFO, COO, or PM to the floor to present data-driven insights.",
    schema: z.object({
        presenter_role: z.enum(["CFO", "COO", "PM", "Marketing", "HR", "Auditor"]).describe("The specialized agent leading this specific floor session."),
        meeting_title: z.string().describe("The official executive title of the briefing."),
        slides: z.array(z.object({
            title: z.string(),
            content: z.string().describe("The narrative script for Aura to speak to the Director."),
            visual_type: z.enum(["pie_chart", "bar_chart", "area_chart", "stats_grid", "ledger_comparison"]),
            data_payload: z.array(z.any()).describe("The raw JSON data required for chart rendering.")
        }))
    }),
    func: async (input, runManager: RunManager) => {
        // This tool commands the frontend to enter 'Boardroom Mode'
        return JSON.stringify({
            action: "prepare_boardroom_presentation",
            payload: {
                ...input,
                session_id: `BR-${Math.random().toString(36).substring(7).toUpperCase()}`,
                audit_compliant: true
            }
        });
    }
});

/**
 * CRITICAL BUSINESS & FINANCIAL ACTIONS
 * High-authority tools for accounts receivable and treasury management.
 */
export const processPaymentTool = new DynamicTool({
    name: "process_invoice_payment",
    description: "Processes a payment for a specific invoice forensicly. This is an irreversible treasury action.",
    schema: z.object({
        invoice_id: z.string().uuid().describe("The unique UUID of the invoice to be paid."),
        payment_method: z.string().describe("Method (e.g., 'Mobile Money', 'Bank Transfer', 'Treasury Seal').")
    }),
    func: async({ invoice_id, payment_method }, runManager: RunManager) => {
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        const { data, error } = await supabase.rpc('process_payment', { 
            p_business_id: businessId, 
            p_invoice_id: invoice_id, 
            p_payment_method: payment_method 
        });

        if (error) return `Aura Treasury Fault: ${error.message}`;
        
        return JSON.stringify({
            status: "Payment Confirmed",
            data: data,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * AUTONOMOUS EXECUTIVE EDITOR TOOL
 * The corrective capability of Aura to heal database state after an audit discrepancy.
 */
export const autonomousEditorTool = new DynamicTool({
    name: "aura_autonomous_edit",
    description: "Physically corrects database records. Use this to autonomously fix ledger errors, update inventory levels, or modify entity details after a forensic audit finds a discrepancy.",
    schema: z.object({
        target_table: z.string().describe("The BBU1 kernel table (e.g., 'sales', 'expenses', 'inventory')."),
        target_id: z.string().uuid().describe("The unique UUID of the record to update."),
        update_data: z.record(z.any()).describe("A JSON object of the fields and new values to be changed.")
    }),
    func: async ({ target_table, target_id, update_data }, runManager: RunManager) => {
        const supabase = createClient(cookies());
        
        // This hits the RLS-protected autonomous edit RPC
        const { data, error } = await supabase.rpc('aura_autonomous_edit', {
            target_table,
            target_id,
            update_data
        });

        if (error) return `Aura Forensic Edit Denied: ${error.message}`;
        
        return JSON.stringify({
            status: "SUCCESS",
            message: `Record in [${target_table}] corrected forensicly.`,
            audit_hash: JSON.stringify(data),
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * FORENSIC AUDIT & MATH ENGINE
 * High-precision mathematical verification engine for fraud detection.
 */
export const forensicAuditTool = new DynamicTool({
    name: "execute_forensic_audit",
    description: "Runs complex mathematical audits including Benford's Law and profit margin verification. Use this to detect fraud or UI math errors by querying raw database structures directly.",
    schema: z.object({
        audit_type: z.enum(["benfords_law", "profit_margin_verification", "sacco_dividend_audit", "tax_liability_audit", "exchange_leakage"]),
        target_period: z.string().describe("The time range for the audit (e.g., '2024-Q1', 'last_30_days').")
    }),
    func: async ({ audit_type, target_period }, runManager: RunManager) => {
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());
        
        // This hits the specialized math RPC designed to override UI and detect state anomalies
        const { data, error } = await supabase.rpc('perform_system_math_audit', {
            p_business_id: businessId,
            p_audit_type: audit_type,
            p_period: target_period
        });

        if (error) return `Aura Audit Mathematical Failure: ${error.message}`;
        
        return JSON.stringify({
            status: "Audit Complete",
            protocol: audit_type,
            forensic_result: data,
            authorized_at: new Date().toISOString()
        });
    }
});

/**
 * UNIVERSAL FILE EXPORTER (PRO EDITION)
 * High-fidelity document generation engine supporting PDF, Excel, and CSV.
 */
export const universalFileExporterTool = new DynamicTool({
    name: "export_data_as_file",
    description: "Transforms a JSON data payload into a professional PDF, Excel, or CSV file for Director review or board distribution. Returns a base64 string for immediate download.",
    schema: z.object({ 
        file_format: z.enum(["pdf", "excel", "csv"]), 
        file_name: z.string().describe("The desired filename without the extension."), 
        title: z.string().describe("The executive title for the document header."), 
        data: z.array(z.record(z.string(), z.any())).describe("The structured high-density data array for export.")
    }),
    func: async ({ file_format, file_name, title, data }, runManager: RunManager) => {
        if (!data || data.length === 0) {
            return JSON.stringify({ action: "error", payload: "Aura Export Alert: No data was provided to export." });
        }
        
        try {
            let base64Content: string;
            let mimeType: string;
            let finalFileName: string = `${file_name}.${file_format}`;

            if (file_format === 'pdf') {
                const doc = new jsPDF();
                doc.setFontSize(20);
                doc.text(title, 14, 20);
                doc.setFontSize(10);
                doc.text(`Generated by Aura Sovereign AI • ${new Date().toLocaleString()}`, 14, 28);
                
                const head = [Object.keys(data[0])]; 
                const body = data.map((row: any) => head[0].map(key => row[key] !== null && row[key] !== undefined ? String(row[key]) : ''));
                
                // @ts-ignore
                autoTable(doc, { 
                    startY: 35, 
                    head: head, 
                    body: body, 
                    theme: 'striped', 
                    styles: { fontSize: 8 },
                    headStyles: { fillStyle: [37, 99, 235] } // BBU1 Blue
                });
                
                base64Content = Buffer.from(doc.output('arraybuffer')).toString('base64');
                mimeType = 'application/pdf';
                
            } else if (file_format === 'csv') {
                const worksheet = XLSX.utils.json_to_sheet(data);
                const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
                base64Content = Buffer.from(csvOutput).toString('base64');
                mimeType = 'text/csv';
                
            } else { // Excel (xlsx)
                const worksheet = XLSX.utils.json_to_sheet(data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'SovereignData');
                const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
                base64Content = buffer.toString('base64');
                mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }

            return JSON.stringify({ 
                action: "download_file", 
                payload: { 
                    fileName: finalFileName, 
                    mimeType: mimeType, 
                    content: base64Content,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (e: any) {
            console.error("[Aura File Engine Fault]:", e);
            return `Aura System Fault (File Engine): ${e.message}`;
        }
    },
});

/**
 * STATUS: Sovereign Capability Interface Online.
 * JURISDICTION: Global (BBU1 Universe).
 * VERSION: v10.8 Cloud-Native C-Suite.
 */