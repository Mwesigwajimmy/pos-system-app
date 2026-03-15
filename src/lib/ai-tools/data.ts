// src/lib/ai-tools/data.ts
import { z } from 'zod';
import { Tool, RunManager } from '../ai-core/tools';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { generateEmbedding } from './embedding';
import { RecursiveCharacterTextSplitter } from './text-splitter';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Buffer } from 'buffer';

/**
 * REVOLUTIONARY SUPABASE TOOL FACTORY (ENTERPRISE STABILIZED)
 * Creates high-authority tools that bridge Natural Language to Postgres RPCs.
 */
export class SupabaseToolFactory {
    static create<T extends z.ZodObject<any>>(
        name: string, 
        description: string, 
        schema: T, 
        rpcName: string
    ) {
        return new (class extends Tool<T> {
            public name = name;
            public description = description;
            public schema = schema;
            
            protected async _execute(input: z.infer<T>, runManager: RunManager) {
                const businessId = runManager.config.configurable?.businessId;
                if (!businessId) throw new Error("Critical security failure: Business ID is missing.");
                const supabase = createClient(cookies());
                const rpcParams: any = { p_business_id: businessId };
                Object.keys(input).forEach(key => { 
                    rpcParams[`p_${key}`] = (input as any)[key]; 
                });
                const { data, error } = await supabase.rpc(rpcName, rpcParams);
                if (error) throw new Error(`Database error in tool '${this.name}': ${error.message}`);
                return JSON.stringify(data);
            }
        })();
    }
}

// ✅ UPGRADE: SOVEREIGN BOARDROOM TOOL (Corrected Casing for Build)
export const BoardroomPresentationTool = new (class extends Tool<any> {
    name = "prepare_boardroom_presentation";
    description = "Generates a full-screen executive boardroom briefing with visual slides, charts, and voice narration. Aura invites the CFO, COO, or PM to present data-driven insights.";
    schema = z.object({
        presenter_role: z.enum(["CFO", "COO", "PM", "Marketing"]),
        meeting_title: z.string(),
        slides: z.array(z.object({
            title: z.string(),
            content: z.string(),
            visual_type: z.enum(["pie_chart", "bar_chart", "area_chart", "stats_grid"]),
            data_payload: z.array(z.any())
        }))
    });
    protected async _execute(input: any) {
        return JSON.stringify({ action: "prepare_boardroom_presentation", payload: input });
    }
})();

// ✅ UPGRADE: SOVEREIGN SEARCH TOOL (Corrected Casing for Build)
export class SovereignSearchTool extends Tool<any> {
    name = "get_market_intelligence";
    description = "Connects to the internet to scout competitor pricing and global market trends. Aura uses this to transform financial downgrades into growth.";
    schema = z.object({
        query: z.string().describe("The forensic search query."),
        sector: z.string().describe("The industry sector context.")
    });

    protected async _execute(input: any) {
        try {
            const response = await fetch(`http://127.0.0.1:8080/search?q=${encodeURIComponent(input.query)}`);
            const data = await response.json();
            return `FRESH GLOBAL MARKET DATA: ${JSON.stringify(data.results)}`;
        } catch (err) {
            return "Aura Internet Failure: Ensure the Sovereign Search Node is running in PM2.";
        }
    }
}

// ✅ UPGRADE: FORENSIC AUDIT & MATH TOOL (Corrected Casing for Build)
export const ForensicAuditTool = new (class extends Tool<any> {
    name = "execute_forensic_audit";
    description = "Runs complex math audits like Benford's Law to detect fraud or UI math errors by querying raw database records.";
    schema = z.object({
        audit_type: z.enum(["benfords_law", "profit_margin_verification"]),
        period: z.string()
    });
    protected async _execute(input: any, runManager: RunManager) {
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());
        const { data, error } = await supabase.rpc('perform_system_math_audit', {
            p_business_id: businessId,
            p_audit_type: input.audit_type,
            p_period: input.period
        });
        if (error) return `Audit Failed: ${error.message}`;
        return `Forensic Result: ${JSON.stringify(data)}`;
    }
})();

// ✅ UPGRADE: AUTONOMOUS EDITOR TOOL (Corrected Casing for Build)
export const AutonomousEditorTool = new (class extends Tool<any> {
    name = "aura_autonomous_edit";
    description = "Physically corrects database records. Use this to autonomously fix ledger errors, update inventory levels, or modify entity details after a forensic audit.";
    schema = z.object({
        target_table: z.string(),
        target_id: z.string().uuid(),
        update_data: z.record(z.any())
    });
    protected async _execute(input: any) {
        const supabase = createClient(cookies());
        const { data, error } = await supabase.rpc('aura_autonomous_edit', input);
        if (error) return `Edit Failed: ${error.message}`;
        return `SUCCESS: Record in ${input.target_table} corrected forensicly.`;
    }
})();

// --- FINANCIAL & ERP OPERATIONS ---

const ProcessPaymentSchema = z.object({ 
    invoice_id: z.string().describe("The UUID of the invoice to process."), 
    payment_method: z.string().describe("The method used for payment.") 
});

export class ProcessPaymentTool extends Tool<typeof ProcessPaymentSchema> {
    name = "process_invoice_payment";
    description = "Processes a payment for a specific invoice. Irreversible action.";
    schema = ProcessPaymentSchema; 

    protected async _execute(input: z.infer<typeof ProcessPaymentSchema>, runManager: RunManager) {
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());
        const { data, error } = await supabase.rpc('process_payment', { p_business_id: businessId, p_invoice_id: input.invoice_id, p_payment_method: input.payment_method });
        if (error) throw new Error(`Payment processing failed: ${error.message}`);
        return JSON.stringify(data);
    }
}

const FileExporterSchema = z.object({ 
    file_format: z.enum(["pdf", "excel", "csv"]).describe("The output format."), 
    file_name: z.string(), 
    title: z.string(), 
    data: z.array(z.record(z.string(), z.any()))
});

export class FileExporterTool extends Tool<typeof FileExporterSchema> {
    name = "export_data_as_file";
    description = "Converts JSON data into professional PDF, Excel, or CSV files for download.";
    schema = FileExporterSchema;

    protected async _execute(input: z.infer<typeof FileExporterSchema>) {
        if (!input.data || input.data.length === 0) throw new Error("No data provided.");
        if (input.file_format === 'pdf') {
            const doc = new jsPDF();
            doc.text(input.title, 14, 20);
            const head = [Object.keys(input.data[0])];
            const body = input.data.map((row: any) => head[0].map(key => String(row[key] ?? '')));
            // @ts-ignore
            autoTable(doc, { startY: 30, head: head, body: body, theme: 'striped' });
            const content = Buffer.from(doc.output('arraybuffer')).toString('base64');
            return JSON.stringify({ action: "download_file", payload: { fileName: `${input.file_name}.pdf`, mimeType: 'application/pdf', content } });
        } else {
            const worksheet = XLSX.utils.json_to_sheet(input.data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            const content = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
            return JSON.stringify({ action: "download_file", payload: { fileName: `${input.file_name}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content } });
        }
    }
}

// --- KNOWLEDGE & NEURAL MEMORY ---

const IngestKnowledgeSchema = z.object({ 
    content: z.string().describe("Text content to ingest."), 
    source: z.string()
});
export class IngestKnowledgeTool extends Tool<typeof IngestKnowledgeSchema> {
    name = "ingest_knowledge";
    description = "Intelligently chunks text and stores it in the sovereign Master Brain.";
    schema = IngestKnowledgeSchema;

    protected async _execute(input: z.infer<typeof IngestKnowledgeSchema>, runManager: RunManager) {
        const businessId = runManager.config.configurable?.businessId;
        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const chunks = textSplitter.splitText(input.content);
        
        const supabase = createClient(cookies());
        const documentsToInsert = await Promise.all(chunks.map(async (chunk) => ({
            business_id: businessId,
            content: { raw_text: chunk }, 
            content_type: 'general_knowledge',
            embedding: await generateEmbedding(chunk), 
        })));
        
        const { error } = await supabase.from('ai_knowledge').insert(documentsToInsert);
        if (error) throw new Error(`Knowledge Ingestion Failed: ${error.message}`);
        
        return `Successfully linked ${chunks.length} sectors to the business brain.`;
    }
}

const KnowledgeRetrievalSchema = z.object({ 
    query: z.string().describe("Semantic search query.") 
});
export class KnowledgeRetrievalTool extends Tool<typeof KnowledgeRetrievalSchema> {
    name = "retrieve_knowledge";
    description = "Searches long-term memory for business context, schema maps, and math protocols.";
    schema = KnowledgeRetrievalSchema;
    
    protected async _execute(input: z.infer<typeof KnowledgeRetrievalSchema>, runManager: RunManager) {
        const businessId = runManager.config.configurable?.businessId;
        const queryEmbedding = await generateEmbedding(input.query);
        const supabase = createClient(cookies());
        const { data, error } = await supabase.rpc('match_documents', {
            p_business_id: businessId,
            p_query_embedding: queryEmbedding,
            p_match_threshold: 0.75,
            p_match_count: 8
        });
        if (error) throw new Error(`Neural retrieval fault: ${error.message}`);
        return `Context Synchronized: ${JSON.stringify(data)}`;
    }
}

// --- DATA TRANSFORMATION ---

const DataTransformerSchema = z.object({
    data_json: z.string().describe("JSON array to process."),
    javascript_code: z.string().describe("JS expression, e.g. 'DATA.reduce(...)'")
});

export class DataTransformerTool extends Tool<typeof DataTransformerSchema> {
    name = "data_transformer";
    description = "Acts as a Virtual Data Analyst to filter and aggregate large JSON payloads.";
    schema = DataTransformerSchema;

    protected async _execute(input: z.infer<typeof DataTransformerSchema>) {
        const { Vm } = require('vm2'); 
        try {
            const vm = new Vm({
                timeout: 5000,
                sandbox: { DATA: JSON.parse(input.data_json), JSON, Math, Array, Object },
                eval: false, wasm: false, allowAsync: false,
            });
            const result = vm.run(`(function(){ return ${input.javascript_code}; })();`);
            return JSON.stringify({ success: true, result });
        } catch (error: any) {
            return JSON.stringify({ success: false, error: error.message });
        }
    }
}