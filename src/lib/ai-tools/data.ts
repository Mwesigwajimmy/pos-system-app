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

// The Supabase Tool Factory is now production-ready and EXPORTED.
export class SupabaseToolFactory {
    static create<T extends z.ZodObject<any>>(name: string, description: string, schema: T, rpcName: string) {
        class SupabaseTool extends Tool<T> {
            // FIX: Declare the required properties from the base class Tool<T>
            public name: string;
            public description: string;
            public schema: T;
            
            constructor() { 
                super(); 
                this.name = name; 
                this.description = description; 
                this.schema = schema; 
            }
            protected async _execute(input: z.infer<T>, runManager: RunManager) {
                const businessId = runManager.config.configurable?.businessId;
                if (!businessId) throw new Error("Critical security failure: Business ID is missing.");
                const supabase = createClient(cookies());
                const rpcParams: any = { p_business_id: businessId };
                // A type-safe way to iterate over the schema keys
                Object.keys(input).forEach(key => { rpcParams[`p_${key}`] = (input as any)[key]; });
                const { data, error } = await supabase.rpc(rpcName, rpcParams);
                if (error) throw new Error(`Database error in tool '${name}': ${error.message}`);
                return JSON.stringify(data);
            }
        }
        return new SupabaseTool();
    }
}

// ----------------- FIX FOR PROCESSPAYMENTTOOL TYPE ERROR -----------------
const ProcessPaymentSchema = z.object({ 
    invoice_id: z.string().describe("The UUID of the invoice to process."), 
    payment_method: z.string().describe("The method used for payment (e.g., 'cash', 'card', 'bank_transfer').") 
});

// The critical ProcessPaymentTool is now EXPORTED.
// FIX: Use typeof ProcessPaymentSchema to correctly constrain Tool<T>
export class ProcessPaymentTool extends Tool<typeof ProcessPaymentSchema> {
    name = "process_invoice_payment";
    description = "Processes a payment for a specific invoice. This is an irreversible action.";
    // FIX: Set the class field to the defined schema object
    schema = ProcessPaymentSchema; 

    protected async _execute(input: z.infer<typeof ProcessPaymentSchema>, runManager: RunManager) {
        const businessId = runManager.config.configurable?.businessId;
        if (!businessId) throw new Error("Critical security failure: Business ID is missing.");
        const supabase = createClient(cookies());
        const { data, error } = await supabase.rpc('process_payment', { p_business_id: businessId, p_invoice_id: input.invoice_id, p_payment_method: input.payment_method });
        if (error) throw new Error(`Payment processing failed: ${error.message}`);
        return JSON.stringify(data);
    }
}

// The revolutionary FileExporterTool is now EXPORTED.
const FileExporterSchema = z.object({ 
    file_format: z.enum(["pdf", "excel"]).describe("The desired output format."), 
    file_name: z.string().describe("The base name for the file."), 
    title: z.string().describe("The title to appear on the file (e.g., 'Q3 Sales Report')."), 
    data: z.array(z.record(z.string(), z.any())).describe("The JSON array of data records to be exported.")
});
export class FileExporterTool extends Tool<typeof FileExporterSchema> {
    name = "export_data_as_file";
    description = "Takes a JSON array and converts it into a PDF or Excel file for download. The LLM MUST only output a final message with the Download ToolCall.";
    schema = FileExporterSchema;

    protected async _execute(input: z.infer<typeof FileExporterSchema>) {
        if (!input.data || input.data.length === 0) throw new Error("No data provided to export.");
        if (input.file_format === 'pdf') {
            const doc = new jsPDF();
            doc.text(input.title, 14, 20);
            const head = [Object.keys(input.data[0])];
            const body = input.data.map((row: any) => head[0].map(key => String(row[key] ?? '')));
            // @ts-ignore - autoTable does not have full type definitions
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

// The self-learning IngestKnowledgeTool is now EXPORTED.
const IngestKnowledgeSchema = z.object({ 
    content: z.string().describe("The text content of the document or new information to ingest."), 
    source: z.string().describe("A unique identifier for the source document (e.g., file path or URL).")
});
export class IngestKnowledgeTool extends Tool<typeof IngestKnowledgeSchema> {
    name = "ingest_knowledge";
    description = "Intelligently chunks text, generates vector embeddings, and stores it in the long-term knowledge base.";
    schema = IngestKnowledgeSchema;

    protected async _execute(input: z.infer<typeof IngestKnowledgeSchema>, runManager: RunManager) {
        const businessId = runManager.config.configurable?.businessId;
        if (!businessId) throw new Error("Critical security failure: Business ID is missing.");
        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
        const chunks = textSplitter.splitText(input.content);
        if (chunks.length === 0) return "No content generated after chunking. Nothing to ingest.";
        
        const supabase = createClient(cookies());
        const batchSize = 50;
        let successfulIngests = 0;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const documentsToInsert = await Promise.all(batch.map(async (chunk) => ({
                business_id: businessId,
                content: chunk,
                metadata: { source: input.source },
                embedding: await generateEmbedding(chunk),
            })));
            const { error } = await supabase.from('documents').insert(documentsToInsert);
            if (error) console.error(`Failed to ingest a batch of knowledge: ${error.message}`);
            else successfulIngests += batch.length;
        }
        return `Successfully ingested ${successfulIngests}/${chunks.length} chunks from source: ${input.source}.`;
    }
}

// The powerful KnowledgeRetrievalTool is now EXPORTED.
const KnowledgeRetrievalSchema = z.object({ 
    query: z.string().describe("The semantic search query for the knowledge base.") 
});
export class KnowledgeRetrievalTool extends Tool<typeof KnowledgeRetrievalSchema> {
    name = "retrieve_knowledge";
    description = "Searches long-term memory (knowledge base) to answer questions or get context.";
    schema = KnowledgeRetrievalSchema;
    
    protected async _execute(input: z.infer<typeof KnowledgeRetrievalSchema>, runManager: RunManager) {
        const businessId = runManager.config.configurable?.businessId;
        if (!businessId) throw new Error("Critical security failure: Business ID is missing.");
        const queryEmbedding = await generateEmbedding(input.query);
        const supabase = createClient(cookies());
        const { data, error } = await supabase.rpc('match_documents', {
            p_business_id: businessId,
            p_query_embedding: queryEmbedding,
            p_match_threshold: 0.75,
            p_match_count: 5
        });
        if (error) throw new Error(`Error retrieving knowledge: ${error.message}`);
        if (!data || data.length === 0) return "No relevant information found in my knowledge base for that query.";
        return `Found relevant context: ${JSON.stringify(data.map((d: any) => d.content))}`;
    }
}


// ADVANCED TOOL: AI Data Transformer
// This tool allows the AI to perform complex, in-memory filtering,
// aggregation, and calculation on data it has already retrieved, 
// mimicking a data analyst.
const DataTransformerSchema = z.object({
    data_json: z.string().describe("The stringified JSON array of objects to be processed."),
    javascript_code: z.string().describe("A self-contained JavaScript expression (e.g., 'DATA.filter(d => d.amount > 100).length') to apply to the data. The input data is available as 'DATA' and the output must be the final result of the expression.")
});

export class DataTransformerTool extends Tool<typeof DataTransformerSchema> {
    name = "data_transformer";
    description = "Processes a provided JSON array (e.g., a list of invoices) to filter, calculate metrics (sum, average), or summarize the data. The LLM must provide a clear, executable JavaScript filter/transform function inside a string. The input data is available as the global variable 'DATA'.";
    schema = DataTransformerSchema;

    protected async _execute(input: z.infer<typeof DataTransformerSchema>) {
        // We must use a sandboxed VM (vm2) for security to execute arbitrary code.
        // NOTE: The require() statement assumes vm2 is installed and correctly bundled.
        const { Vm } = require('vm2'); 
        
        try {
            const vm = new Vm({
                timeout: 5000,
                sandbox: { 
                    DATA: JSON.parse(input.data_json), 
                    JSON: JSON,
                    Math: Math,
                    // Only allow core JS functionality
                    Array: Array,
                    Object: Object
                },
                eval: false,
                wasm: false,
                allowAsync: false,
            });

            // The code is executed in the VM
            const wrappedCode = `(function(){ return ${input.javascript_code}; })();`;
            const result = vm.run(wrappedCode);

            // Return the processed result as a string
            return JSON.stringify({ success: true, result });
        } catch (error: any) {
            console.error("Data Transformer VM Error:", error);
            return JSON.stringify({ success: false, error: `Data processing failed: ${error.message}. LLM, ensure your JSON is valid and your JavaScript expression is correct (it should be an expression like 'DATA.map(...)', not a function definition).` });
        }
    }
}