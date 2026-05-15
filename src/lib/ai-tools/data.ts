/**
 * --- BBU1 SOVEREIGN DATA & FORENSIC GATEWAY ---
 * VERSION: v13.0 Sovereign Edition (OMEGA-ULTIMATUM ALIGNMENT)
 * 
 * UPGRADED: 
 * 1. NEURAL ALIGNMENT: Fully synchronized for 768-dimension Google text-embedding-004.
 * 2. SHADOW WELD FIX: Resolved relative path risks for the Forensic Text Splitter.
 * 3. RETRIEVAL CALIBRATION: Optimized p_match_threshold for Gemini semantic density.
 * 4. FORENSIC INTEGRITY: 100% of original logic, comments, and shadow-welds preserved.
 */

import { z } from 'zod';
import { PromptTool as Tool, RunManager } from '../langchain/core-prompts-shim';
import { generateEmbedding } from './embedding';

/**
 * REVOLUTIONARY SUPABASE TOOL FACTORY (ENTERPRISE STABILIZED)
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
                if (typeof window !== 'undefined') return "Browser Blocked";

                // ✅ SHADOW WELD: Hides server-only modules from Webpack
                const { createClient } = eval('require')('@/lib/supabase/server');
                const { cookies } = eval('require')('next/headers');

                const businessId = runManager.config.configurable?.businessId;
                
                if (!businessId) {
                    throw new Error(`Aura Security Alert: Tool '${this.name}' denied. Business Context Missing.`);
                }
                
                const supabase = createClient(cookies());
                
                const rpcParams: any = { p_business_id: businessId };
                Object.keys(input).forEach(key => { 
                    rpcParams[`p_${key}`] = (input as any)[key]; 
                });
                
                const { data, error } = await supabase.rpc(rpcName, rpcParams);
                
                if (error) {
                    console.error(`[Aura Forensic] Database Error in ${rpcName}:`, error.message);
                    throw new Error(`Forensic Database Fault: ${error.message}`);
                }
                
                return JSON.stringify({
                    status: "Success",
                    origin_tool: this.name,
                    data: data,
                    forensic_timestamp: new Date().toISOString()
                });
            }
        })();
    }
}

// --- 1. THE BOARDROOM PRESENTATION ENGINE ---
export const boardroomPresentationTool = new (class extends Tool<any> {
    name = "prepare_boardroom_presentation";
    description = "Generates a full-screen executive boardroom briefing with visual slides, charts, and voice narration. Aura invites the CFO, COO, or PM to present data-driven insights.";
    schema = z.object({
        presenter_role: z.enum(["CFO", "COO", "PM", "Marketing", "HR", "Auditor"]),
        meeting_title: z.string().describe("The official executive title of the briefing."),
        slides: z.array(z.object({
            title: z.string(),
            content: z.string().describe("The narrative script for Aura to narrate to the Director."),
            visual_type: z.enum(["pie_chart", "bar_chart", "area_chart", "stats_grid", "ledger_view"]),
            data_payload: z.array(z.any()).describe("Numerical data required for chart rendering.")
        })),
        executive_summary: z.string().optional().describe("A summary of action items.")
    });
    
    protected async _execute(input: any) {
        return JSON.stringify({ 
            action: "prepare_boardroom_presentation", 
            payload: {
                ...input,
                session_token: `BR-${Math.random().toString(36).substring(7).toUpperCase()}`,
                initiated_at: new Date().toISOString()
            } 
        });
    }
})();

export const BoardroomPresentationTool = boardroomPresentationTool;

// --- 2. SOVEREIGN MARKET INTELLIGENCE ENGINE ---
export class SovereignSearchTool extends Tool<any> {
    name = "get_market_intelligence";
    description = "Connects to the internet to scout competitor pricing and global market trends. Aura uses this to transform financial downgrades into growth.";
    schema = z.object({
        query: z.string().describe("The forensic search query."),
        sector: z.string().describe("The industry sector context (e.g., 'Agriculture', 'Logistics').")
    });

    protected async _execute(input: any) {
        try {
            const response = await fetch(`http://127.0.0.1:8080/search?q=${encodeURIComponent(input.query)}`);
            if (!response.ok) throw new Error("Search Node Unreachable");
            
            const data = await response.json();
            return `FRESH GLOBAL MARKET INTELLIGENCE: ${JSON.stringify(data.results)}`;
        } catch (err) {
            return "Aura Internet Handshake Failure: The Sovereign Search Node is currently offline. Falling back to internal historical data.";
        }
    }
}

// --- 3. THE FORENSIC AUDIT & MATH ENGINE ---
export const ForensicAuditTool = new (class extends Tool<any> {
    name = "execute_forensic_audit";
    description = "Runs complex math audits like Benford's Law to detect fraud or UI math errors by querying raw database records.";
    schema = z.object({
        audit_type: z.enum(["benfords_law", "profit_margin_verification", "tax_consistency_check", "exchange_rate_leakage"]),
        period: z.string().describe("The timeframe (e.g. '2024-Q1').")
    });

    protected async _execute(input: any, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";

        // ✅ SHADOW WELD
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        const { data, error } = await supabase.rpc('perform_system_math_audit', {
            p_business_id: businessId,
            p_audit_type: input.audit_type,
            p_period: input.period
        });

        if (error) return `Forensic Audit Protocol Interrupted: ${error.message}`;
        
        return JSON.stringify({
            status: "Forensic Complete",
            audit_result: data,
            protocol: input.audit_type,
            authorized_at: new Date().toISOString()
        });
    }
})();

// --- 4. THE AUTONOMOUS EXECUTIVE EDITOR ---
export const AutonomousEditorTool = new (class extends Tool<any> {
    name = "aura_autonomous_edit";
    description = "REQUIRED for self-healing operations. Physically corrects database records. Use this to autonomously fix ledger errors, update inventory levels, or modify entity details after a forensic audit.";
    schema = z.object({
        target_table: z.string().describe("The BBU1 kernel table to modify."),
        target_id: z.string().uuid().describe("The primary key UUID."),
        update_data: z.record(z.any()).describe("The corrective JSON data payload.")
    });

    protected async _execute(input: any) {
        if (typeof window !== 'undefined') return "Browser Blocked";

        // ✅ SHADOW WELD
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        const supabase = createClient(cookies());
        
        const { data, error } = await supabase.rpc('aura_autonomous_edit', input);
        
        if (error) return `Executive Directive Failed: ${error.message}`;
        
        return `SOVEREIGN SUCCESS: Record in [${input.target_table}] corrected forensicly. Change logged to immutable audit trail.`;
    }
})();

// --- 5. FINANCIAL & ERP CORE OPERATIONS ---
const ProcessPaymentSchema = z.object({ 
    invoice_id: z.string().uuid().describe("The UUID of the invoice to process."), 
    payment_method: z.string().describe("Method (e.g., 'Bank Wire', 'Mobile Money')."),
    currency_override: z.string().optional().describe("Currency code if override is required.")
});

export class ProcessPaymentTool extends Tool<typeof ProcessPaymentSchema> {
    name = "process_invoice_payment";
    description = "Processes a payment for a specific invoice. Records the transaction in the ledger. This is an irreversible forensic action.";
    schema = ProcessPaymentSchema; 

    protected async _execute(input: z.infer<typeof ProcessPaymentSchema>, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";

        // ✅ SHADOW WELD
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');

        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());
        
        const { data, error } = await supabase.rpc('process_payment', { 
            p_business_id: businessId, 
            p_invoice_id: input.invoice_id, 
            p_payment_method: input.payment_method,
            p_currency: input.currency_override
        });

        if (error) throw new Error(`Treasury Fault: Payment processing failed. ${error.message}`);
        
        return JSON.stringify({
            status: "Payment Confirmed",
            receipt_data: data,
            timestamp: new Date().toISOString()
        });
    }
}

const FileExporterSchema = z.object({ 
    file_format: z.enum(["pdf", "excel", "csv"]).describe("The professional output format."), 
    file_name: z.string().describe("Filename without extension."), 
    title: z.string().describe("Document header title."), 
    data: z.array(z.record(z.string(), z.any())).describe("JSON data array for export.")
});

export class FileExporterTool extends Tool<typeof FileExporterSchema> {
    name = "export_data_as_file";
    description = "Transforms raw JSON data into professional PDF, Excel, or CSV files for board distribution and Director review.";
    schema = FileExporterSchema;

    protected async _execute(input: z.infer<typeof FileExporterSchema>) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        if (!input.data || input.data.length === 0) throw new Error("Aura Export Error: No data payload detected.");
        
        // ✅ SHADOW WELD: Hide heavy Node-libraries from Webpack
        const jsPDF = eval('require')('jspdf');
        const autoTable = eval('require')('jspdf-autotable');
        const XLSX = eval('require')('xlsx');
        const { Buffer } = eval('require')('buffer');

        try {
            if (input.file_format === 'pdf') {
                const doc = new jsPDF();
                doc.setFontSize(20);
                doc.text(input.title, 14, 20);
                doc.setFontSize(10);
                doc.text(`Aura Sovereign Intelligence Report • ${new Date().toLocaleString()}`, 14, 28);
                
                const head = [Object.keys(input.data[0])];
                const body = input.data.map((row: any) => head[0].map(key => String(row[key] ?? '')));
                
                autoTable(doc, { 
                    startY: 35, 
                    head: head, 
                    body: body, 
                    theme: 'striped', 
                    styles: { fontSize: 8 },
                    headStyles: { fillStyle: [37, 99, 235] } 
                });
                
                const content = Buffer.from(doc.output('arraybuffer')).toString('base64');
                return JSON.stringify({ action: "download_file", payload: { fileName: `${input.file_name}.pdf`, mimeType: 'application/pdf', content } });
            } else if (input.file_format === 'csv') {
                const worksheet = XLSX.utils.json_to_sheet(input.data);
                const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
                const content = Buffer.from(csvOutput).toString('base64');
                return JSON.stringify({ action: "download_file", payload: { fileName: `${input.file_name}.csv`, mimeType: 'text/csv', content } });
            } else {
                const worksheet = XLSX.utils.json_to_sheet(input.data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'SovereignData');
                const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
                const content = buffer.toString('base64');
                return JSON.stringify({ action: "download_file", payload: { fileName: `${input.file_name}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content } });
            }
        } catch (e: any) {
            return `Aura System Fault (File Engine): ${e.message}`;
        }
    }
}

// --- 6. NEURAL MEMORY & KNOWLEDGE INFRASTRUCTURE ---
const IngestKnowledgeSchema = z.object({ 
    content: z.string().describe("Text content or policy to ingest."), 
    source: z.string().describe("Source identifier.")
});

export class IngestKnowledgeTool extends Tool<typeof IngestKnowledgeSchema> {
    name = "ingest_knowledge";
    description = "Intelligently segments and embeds business knowledge into the Master Brain using Cloud-Native visual cortex shims.";
    schema = IngestKnowledgeSchema;

    protected async _execute(input: z.infer<typeof IngestKnowledgeSchema>, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";

        // ✅ SHADOW WELD FIX: Explicit path resolution to prevent constructor failures
        const { RecursiveCharacterTextSplitter } = eval('require')('langchain/text_splitter');
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');

        const businessId = runManager.config.configurable?.businessId;
        
        // Calibrated for 768-dimension semantic density (Gemini Standard)
        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
        const chunks = await textSplitter.splitText(input.content);
        
        const supabase = createClient(cookies());
        
        console.log(`[Aura Bridge] Ingesting ${chunks.length} forensic sectors for entity ${businessId}`);

        const documentsToInsert = await Promise.all(chunks.map(async (chunk) => ({
            business_id: businessId,
            content: { raw_text: chunk, ingested_source: input.source }, 
            content_type: 'executive_knowledge',
            embedding: await generateEmbedding(chunk), // Fully aligned 768-dim output
        })));
        
        const { error } = await supabase.from('ai_knowledge').insert(documentsToInsert);
        if (error) throw new Error(`Neural Link Interrupted: ${error.message}`);
        
        return `Successfully linked ${chunks.length} forensic intelligence sectors to the Master Brain.`;
    }
}

const KnowledgeRetrievalSchema = z.object({ 
    query: z.string().describe("The business query or question to find in memory.") 
});

export class KnowledgeRetrievalTool extends Tool<typeof KnowledgeRetrievalSchema> {
    name = "retrieve_knowledge";
    description = "Searches long-term memory for business context, schema protocols, and historical audit baselines.";
    schema = KnowledgeRetrievalSchema;
    
    protected async _execute(input: z.infer<typeof KnowledgeRetrievalSchema>, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";

        // ✅ SHADOW WELD
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');

        const businessId = runManager.config.configurable?.businessId;
        
        // 1. GENERATE THE 768-DIM HANDSHAKE
        const queryEmbedding = await generateEmbedding(input.query);
        const supabase = createClient(cookies());
        
        console.log(`[Aura Bridge] Neural Search: querying memory with ${queryEmbedding.length} dims...`);

        // 2. THE RPC MATCH (Requires SQL update to accept 768-dim input)
        const { data, error } = await supabase.rpc('match_documents', {
            p_business_id: businessId,
            p_query_embedding: queryEmbedding,
            p_match_threshold: 0.65, // Calibrated threshold for Gemini semantic density
            p_match_count: 10
        });
        
        if (error) {
            console.error("[Aura Bridge] Memory Retrieval Fault:", error.message);
            throw new Error(`Memory Access Denied: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
            return "AURA STATUS: I have scanned my memory but found no relevant forensic baselines. Saturation may be required.";
        }
        
        return `SOVEREIGN CONTEXT SYNCHRONIZED: ${JSON.stringify(data)}`;
    }
}

// --- 7. EXECUTIVE ANALYTICAL VIRTUAL MACHINE ---
const DataTransformerSchema = z.object({
    data_json: z.string().describe("JSON array to process."),
    javascript_code: z.string().describe("Pure JS analytical expression (e.g. 'DATA.reduce(...)'). Use DATA as the variable.")
});

export class DataTransformerTool extends Tool<typeof DataTransformerSchema> {
    name = "data_transformer";
    description = "Acts as a Virtual Data Analyst to filter and aggregate large JSON payloads in a sandboxed environment.";
    schema = DataTransformerSchema;

    protected async _execute(input: z.infer<typeof DataTransformerSchema>) {
        if (typeof window !== 'undefined') return "Browser Blocked";

        // ✅ SHADOW WELD: This is the critical fix for the VM2 errors
        const { VM } = eval('require')('vm2'); 
        try {
            const vm = new VM({
                timeout: 5000,
                sandbox: { 
                    DATA: JSON.parse(input.data_json), 
                    JSON, Math, Array, Object, console 
                },
                eval: false, wasm: false, allowAsync: false,
            });
            
            const result = vm.run(`(function(){ return ${input.javascript_code}; })();`);
            
            return JSON.stringify({ 
                success: true, 
                analysis_result: result,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            return JSON.stringify({ success: false, analytical_fault: error.message });
        }
    }
}

/**
 * STATUS: Sovereign Capability Suite Synchronized. SHADOW BUNDLE ACTIVE.
 * ARCHITECTURE: 768-dim Google Neural Bridge Enabled.
 */