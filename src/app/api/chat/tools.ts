// src/lib/ai-tools/data.ts
import { z } from 'zod';
import { DynamicTool, RunManager } from '@/lib/langchain/core-tools-shim';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// ✅ SOVEREIGN LINK: Importing the upgraded 1024-dim Elite engine
import { generateEmbedding } from './embedding'; 

// --- NODE.JS DEPENDENCIES (Forensic Grade) ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Buffer } from 'buffer'; 

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
      if (!businessId || businessId === 'loading') {
          return JSON.stringify({ 
              success: false, 
              error: "Aura Security Alert: Critical context failure. Business ID is missing." 
          });
      }
      
      // Create client with forwarded cookies for RLS verification
      const supabase = createClient(cookies());
      const rpcParams: { [key: string]: any } = { p_business_id: businessId };
      
      Object.keys(schema.shape).forEach(key => {
          const toolKey = key as keyof z.infer<T>;
          // Ensure forensic parameter mapping for Postgres RPC handshake
          if (toolInput[toolKey] !== undefined) rpcParams[`p_${key}`] = toolInput[toolKey]; 
      });
      
      const { data, error } = await supabase.rpc(rpcName, rpcParams);
      
      if (error) {
        return `Aura Forensic Error from tool '${name}': ${error.message}.`;
      }

      if (outputAction) {
        return JSON.stringify({ 
            action: outputAction.action, 
            payload: data,
            executive_status: "Verified"
        });
      }
      
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
 * UPGRADED: Fully aligned with the 1024-dimension Voyage Elite Brain.
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
            // 🧠 NEURAL HANDSHAKE: Convert Natural Language into the 1024-dim Elite vector
            const queryEmbedding = await generateEmbedding(query);

            // 🛡️ REALIGNMENT GUARD: Prevent crash if dimensions mismatch
            if (!queryEmbedding || queryEmbedding.length !== 1024) {
                throw new Error(`Neural Signal Mismatch: Expected 1024-dim, received ${queryEmbedding?.length || 0}.`);
            }

            const { data, error } = await supabase.rpc('match_documents', {
                p_business_id: businessId,
                p_query_embedding: queryEmbedding, 
                p_match_threshold: 0.62, // Optimized for Voyage Elite retrieval
                p_match_count: 10         // Deep context for multi-agent reasoning
            });

            if (error) throw error;

            return JSON.stringify({
                status: "Context Synchronized",
                results: data || [],
                query_ref: query,
                timestamp: new Date().toISOString()
            });

        } catch (err: any) {
            console.error("[Aura Retrieval Fault]:", err.message);
            return `Aura Neural Retrieval Fault: ${err.message}. Director, please ensure the 'match_documents' SQL function is updated to vector(1024).`;
        }
    },
});

/**
 * INTERACTIVE EXECUTIVE UI TOOLS
 */
export const uiNavigationTool = new DynamicTool({
    name: "navigate_to_page",
    description: "Moves the Director to a specific page or dashboard. The LLM MUST return a ToolCall with the final URL.",
    schema: z.object({
        url: z.string().describe("The relative BBU1 internal URL (e.g., '/dashboard/accounting').")
    }),
    func: async ({ url }) => {
        return JSON.stringify({
            action: "navigate",
            payload: { url, initiated_at: new Date().toISOString() }
        });
    }
});

/**
 * SOVEREIGN BOARDROOM PRESENTATION TOOL
 */
export const boardroomPresentationTool = new DynamicTool({
    name: "prepare_boardroom_presentation",
    description: "REQUIRED for financial audits. Generates a full-screen executive briefing with slides, charts, and voice narration.",
    schema: z.object({
        presenter_role: z.enum(["CFO", "COO", "PM", "Marketing", "HR", "Auditor"]),
        meeting_title: z.string(),
        slides: z.array(z.object({
            title: z.string(),
            content: z.string(),
            visual_type: z.enum(["pie_chart", "bar_chart", "area_chart", "stats_grid", "ledger_comparison"]),
            data_payload: z.array(z.any())
        }))
    }),
    func: async (input) => {
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
 */
export const processPaymentTool = new DynamicTool({
    name: "process_invoice_payment",
    description: "Processes a payment for a specific invoice forensicly. This is an irreversible treasury action.",
    schema: z.object({
        invoice_id: z.string().uuid(),
        payment_method: z.string()
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
 */
export const autonomousEditorTool = new DynamicTool({
    name: "aura_autonomous_edit",
    description: "Physically corrects database records. Autonomously fixes ledgers or inventory after audit detection.",
    schema: z.object({
        target_table: z.string(),
        target_id: z.string().uuid(),
        update_data: z.record(z.any())
    }),
    func: async ({ target_table, target_id, update_data }) => {
        const supabase = createClient(cookies());
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
 */
export const forensicAuditTool = new DynamicTool({
    name: "execute_forensic_audit",
    description: "Runs complex mathematical audits including Benford's Law and profit margin verification.",
    schema: z.object({
        audit_type: z.enum(["benfords_law", "profit_margin_verification", "sacco_dividend_audit", "tax_liability_audit", "exchange_leakage"]),
        target_period: z.string()
    }),
    func: async ({ audit_type, target_period }, runManager: RunManager) => {
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());
        
        const { data, error } = await supabase.rpc('perform_system_math_audit', {
            p_business_id: businessId,
            p_audit_type: audit_type,
            p_period: target_period
        });

        if (error) return `Aura Audit Failure: ${error.message}`;
        
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
 */
export const universalFileExporterTool = new DynamicTool({
    name: "export_data_as_file",
    description: "Transforms a JSON data payload into a professional PDF, Excel, or CSV file.",
    schema: z.object({ 
        file_format: z.enum(["pdf", "excel", "csv"]), 
        file_name: z.string(), 
        title: z.string(), 
        data: z.array(z.record(z.string(), z.any()))
    }),
    func: async ({ file_format, file_name, title, data }) => {
        if (!data || data.length === 0) {
            return JSON.stringify({ action: "error", payload: "Aura Export Alert: No data provided." });
        }
        
        try {
            let base64Content: string;
            let mimeType: string;

            if (file_format === 'pdf') {
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text(title, 14, 20);
                
                const head = [Object.keys(data[0])]; 
                const body = data.map((row: any) => head[0].map(key => String(row[key] ?? '')));
                
                autoTable(doc, { 
                    startY: 30, head, body, theme: 'striped', styles: { fontSize: 8 }
                });
                
                base64Content = Buffer.from(doc.output('arraybuffer')).toString('base64');
                mimeType = 'application/pdf';
                
            } else if (file_format === 'csv') {
                const worksheet = XLSX.utils.json_to_sheet(data);
                const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
                base64Content = Buffer.from(csvOutput).toString('base64');
                mimeType = 'text/csv';
                
            } else { // Excel
                const worksheet = XLSX.utils.json_to_sheet(data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'SovereignData');
                const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
                base64Content = buffer.toString('base64');
                mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }

            return JSON.stringify({ 
                action: "download_file", 
                payload: { fileName: `${file_name}.${file_format}`, mimeType, content: base64Content }
            });
        } catch (e: any) {
            return `Aura System Fault (File Engine): ${e.message}`;
        }
    },
});

/**
 * STATUS: Sovereign Capability Interface Re-Aligned to 1024-dim Brain.
 * VERSION: v10.9 Omega Standard.
 */