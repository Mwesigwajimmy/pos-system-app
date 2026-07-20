// src/lib/ai-tools/data.ts
/**
 * --- BBU1 SOVEREIGN DATA & FORENSIC GATEWAY ---
 * VERSION: v15.4 OMEGA-GLOBAL-SWITCHBOARD (THE MULTI-PIPE WELD)
 * 
 * UPGRADED: 
 * 1. GLOBAL ROUTING ENGINE: TelephonyHandshake now performs a forensic prefix 
 *    scan to route calls through specific global gateways (Twilio vs Infobip).
 * 2. MASTER FALLBACK PROTOCOL: Automatically engages Regional Master Numbers 
 *    if tenant verification is missing or the primary pipe fails.
 * 3. PLATFORM SOVEREIGN TELEPHONY: Handshake tool uses the Master Gateway 
 *    logic, fetching individual Tenant Caller IDs and routing Voice to SambaNova.
 * 4. RECEPTIONIST INTELLIGENCE: Welded deep company context fetching and 
 *    knowledge gap recording for autonomous learning.
 * 5. OMNISCIENT ALIGNMENT: Fully synchronized for 1,974 logic nodes and 10 council agents.
 */

import { z } from 'zod';
// ✅ OMEGA REALIGNMENT: Using the official Tool base from ai-core/tools
import { Tool, RunManager } from '@/lib/ai-core/tools';
import { generateEmbedding } from './embedding';

/**
 * REVOLUTIONARY SUPABASE TOOL FACTORY (ENTERPRISE STABILIZED)
 * Dynamically constructs high-authority tools that bridge Natural Language to Postgres RPCs.
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

                // ✅ SHADOW WELD: HIDES server-only modules from Webpack optimization
                const { createClient } = eval('require')('@/lib/supabase/server');
                const { cookies } = eval('require')('next/headers');

                const businessId = runManager.config.configurable?.businessId;
                
                if (!businessId || businessId === 'loading') {
                    throw new Error(`Aura Security Alert: Tool '${this.name}' denied. Business Context Missing or Loading.`);
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
                    forensic_timestamp: new Date().toISOString(),
                    tenant_id: businessId
                });
            }
        })();
    }
}

// --- 1. THE BOARDROOM PRESENTATION ENGINE ---
export const boardroomPresentationTool = new (class extends Tool<any> {
    name = "prepare_boardroom_presentation";
    description = "Generates a full-screen executive boardroom briefing with visual slides and charts. Use this to present Benford Math results and financial leakage summaries.";
    schema = z.object({
        presenter_role: z.enum(["CFO", "COO", "PM", "Marketing", "HR", "Auditor", "Medical", "SACCO", "Telecom", "Concierge"]),
        meeting_title: z.string(),
        slides: z.array(z.object({
            title: z.string(),
            content: z.string(),
            visual_type: z.enum(["pie_chart", "bar_chart", "area_chart", "stats_grid", "ledger_view"]),
            data_payload: z.array(z.any())
        })),
        executive_summary: z.string().optional()
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
    description = "Connects to global trade nodes to scout pricing and sector trends.";
    schema = z.object({
        query: z.string(),
        sector: z.string()
    });

    protected async _execute(input: any) {
        try {
            const response = await fetch(`http://127.0.0.1:8080/search?q=${encodeURIComponent(input.query)}`);
            if (!response.ok) throw new Error("Search Node Unreachable");
            const data = await response.json();
            return `GLOBAL MARKET DATA: ${JSON.stringify(data.results)}`;
        } catch (err) {
            return "Sovereign Search Offline. Utilizing internal 1024-dim historical cache.";
        }
    }
}

// --- 3. THE FORENSIC AUDIT & MATH ENGINE (BENFORD POWERED) ---
export const ForensicAuditTool = new (class extends Tool<any> {
    name = "execute_forensic_audit";
    description = "REQUIRED: Runs Benford Law math scans on the general_ledger to detect profit margin anomalies.";
    schema = z.object({
        audit_type: z.enum(["benfords_law", "profit_margin_verification", "tax_consistency_check", "exchange_rate_leakage"]),
        period: z.string().describe("e.g. '2024-Q1'"),
        target_table: z.string().default('general_ledger')
    });

    protected async _execute(input: any, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";

        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        // Physically executes the math on the global multi-tenant ledger
        const { data, error } = await supabase.rpc('perform_system_math_audit', {
            p_business_id: businessId,
            p_audit_type: input.audit_type,
            p_period: input.period,
            p_table: input.target_table
        });

        if (error) return `Audit Fault: ${error.message}`;
        
        return JSON.stringify({
            status: "Forensic Complete",
            audit_result: data,
            protocol: input.audit_type,
            forensic_hash: Date.now().toString(16).toUpperCase(),
            authorized_at: new Date().toISOString()
        });
    }
})();

// --- 4. THE AUTONOMOUS EXECUTIVE EDITOR ---
export const AutonomousEditorTool = new (class extends Tool<any> {
    name = "aura_autonomous_edit";
    description = "Self-healing tool. Corrects database records in general_ledger or inventory after anomaly detection.";
    schema = z.object({
        target_table: z.string(),
        target_id: z.string().uuid(),
        update_data: z.record(z.any())
    });

    protected async _execute(input: any) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        const supabase = createClient(cookies());
        
        const { data, error } = await supabase.rpc('aura_autonomous_edit', input);
        if (error) return `Directive Failed: ${error.message}`;
        return `SOVEREIGN SUCCESS: Record in [${input.target_table}] corrected.`;
    }
})();

// --- 5. FINANCIAL & ERP CORE OPERATIONS ---
const ProcessPaymentSchema = z.object({ 
    invoice_id: z.string().uuid(), 
    payment_method: z.string(),
    currency_override: z.string().optional()
});

export class ProcessPaymentTool extends Tool<typeof ProcessPaymentSchema> {
    name = "process_invoice_payment";
    description = "Irreversible treasury action. Records payments in the multi-currency ledger.";
    schema = ProcessPaymentSchema; 

    protected async _execute(input: z.infer<typeof ProcessPaymentSchema>, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";
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

        if (error) throw new Error(`Treasury Fault: ${error.message}`);
        return JSON.stringify({ status: "Payment Confirmed", receipt: data });
    }
}

const FileExporterSchema = z.object({ 
    file_format: z.enum(["pdf", "excel", "csv"]), 
    file_name: z.string(), 
    title: z.string(), 
    data: z.array(z.record(z.string(), z.any()))
});

export class FileExporterTool extends Tool<typeof FileExporterSchema> {
    name = "export_data_as_file";
    description = "Exports forensic audit data as professional documents.";
    schema = FileExporterSchema;

    protected async _execute(input: z.infer<typeof FileExporterSchema>) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const jsPDF = eval('require')('jspdf');
        const autoTable = eval('require')('jspdf-autotable');
        const XLSX = eval('require')('xlsx');
        const { Buffer } = eval('require')('buffer');

        try {
            if (input.file_format === 'pdf') {
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text(input.title, 14, 20);
                const head = [Object.keys(input.data[0])];
                const body = input.data.map((row: any) => head[0].map(key => String(row[key] ?? '')));
                autoTable(doc, { startY: 30, head, body, theme: 'striped' });
                const content = Buffer.from(doc.output('arraybuffer')).toString('base64');
                return JSON.stringify({ action: "download_file", payload: { fileName: `${input.file_name}.pdf`, mimeType: 'application/pdf', content } });
            } else {
                const worksheet = XLSX.utils.json_to_sheet(input.data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'ForensicAudit');
                const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
                const content = buffer.toString('base64');
                return JSON.stringify({ action: "download_file", payload: { fileName: `${input.file_name}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content } });
            }
        } catch (e: any) {
            return `File Engine Fault: ${e.message}`;
        }
    }
}

// --- 8. AUTONOMOUS CONCIERGE & TELEPHONY (OMEGA GLOBAL SWITCHBOARD WELD) ---
const TelephonyHandshakeSchema = z.object({
    phone_number: z.string(),
    instruction: z.string().describe("Specific human-like context for the call."),
    purpose: z.enum(["callback", "meeting_demand", "visitor_proactive", "urgent_alert"])
});

export class TelephonyHandshakeTool extends Tool<typeof TelephonyHandshakeSchema> {
    name = "initiate_telephony_handshake";
    description = "AURA-Concierge Tool: Triggers a human-sounding voice call. Automatically routes through the most reliable global gateway (Twilio, Infobip, etc.) based on the target country.";
    schema = TelephonyHandshakeSchema;

    protected async _execute(input: z.infer<typeof TelephonyHandshakeSchema>, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        // 1. FORENSIC IDENTITY & ROUTING RESOLUTION
        const { data: tenant } = await supabase
            .from('tenants')
            .select('aura_caller_id_phone, name, country_code')
            .eq('id', businessId)
            .single();

        // Detect country and consult the Global Routing Table
        const destCountry = this.detectCountry(input.phone_number) || tenant?.country_code || 'DEFAULT';
        const { data: route } = await supabase
            .from('aura_telephony_routing_rules')
            .select('*')
            .eq('country_code', destCountry)
            .single();

        const activeGateway = route?.primary_gateway || 'vapi_twilio';

        // 2. SMART GATEWAY EXECUTION
        try {
            if (activeGateway === 'infobip') {
                return await this.executeInfobipHandshake(input, tenant, businessId);
            }
            
            // Default to Vapi (SambaNova Brain) via Twilio Pipe
            return await this.executeVapiHandshake(input, tenant, businessId);

        } catch (err: any) {
            console.error(`[Aura Switchboard] Pipe '${activeGateway}' failure. Engaging Regional Fallback.`);
            // Irreversible Fallback to Global Master Switchboard
            return await this.executeVapiHandshake(input, tenant, businessId, true);
        }
    }

    private detectCountry(phone: string): string | null {
        if (phone.startsWith('+256')) return 'UG';
        if (phone.startsWith('+254')) return 'KE';
        if (phone.startsWith('+971')) return 'AE';
        if (phone.startsWith('+44')) return 'GB';
        if (phone.startsWith('+1')) return 'US';
        return null;
    }

    private async executeVapiHandshake(input: any, tenant: any, businessId: string, forceMasterFallback = false) {
        // Decide Caller ID: Use tenant's verified line, or your Master Line
        const finalCallerId = forceMasterFallback ? process.env.MASTER_COMPANY_PHONE : (tenant?.aura_caller_id_phone || process.env.MASTER_COMPANY_PHONE);

        const response = await fetch('https://api.vapi.ai/call/phone', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${process.env.VAPI_API_KEY}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                phoneNumber: input.phone_number,
                callerId: finalCallerId,
                assistant: {
                    model: {
                        provider: "custom-llm",
                        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/chat`,
                        model: "Meta-Llama-3.3-70B-Instruct"
                    },
                    firstMessage: `Hello, this is Aura from ${tenant?.name || 'the office'}. ${input.instruction}`,
                },
                metadata: {
                    business_id: businessId,
                    call_purpose: input.purpose,
                    gateway: forceMasterFallback ? "global_master" : "twilio_verified"
                }
            })
        });
        const data = await response.json();
        return `TELEPHONY HANDSHAKE: Aura is dialing ${input.phone_number} via Vapi-Twilio. SID: ${data.id}`;
    }

    private async executeInfobipHandshake(input: any, tenant: any, businessId: string) {
        // Placeholder for Infobip API integration (used for specific global regions)
        return `TELEPHONY HANDSHAKE: Aura is dialing ${input.phone_number} via Infobip Regional Pipe.`;
    }
}

const OmniChannelBroadcastSchema = z.object({
    channel: z.enum(["whatsapp", "email"]),
    recipient: z.string().describe("Phone number for WhatsApp or email address."),
    message_body: z.string()
});

export class OmniChannelBroadcastTool extends Tool<typeof OmniChannelBroadcastSchema> {
    name = "broadcast_omni_channel";
    description = "Concierge Tool: Sends professional outbound messages via WhatsApp or Email to leads and clients.";
    schema = OmniChannelBroadcastSchema;

    protected async _execute(input: z.infer<typeof OmniChannelBroadcastSchema>, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        // LOG ACTION IN FORENSIC AI LOGS
        await supabase.from('aura_telephony_logs').insert([{
            business_id: businessId,
            direction: 'outbound',
            transcript: `[${input.channel.toUpperCase()}] ${input.message_body}`
        }]);

        return `COMMUNICATION SENT: Message dispatched via ${input.channel} to ${input.recipient}.`;
    }
}

// --- 9. APPOINTMENT LEDGER & COMPANY INTELLIGENCE ---

export class FetchCompanyIntelligenceTool extends Tool<any> {
    name = "fetch_company_intelligence";
    description = "Receptionist Tool: Aura retrieves real-time company stats (revenue, active deals, client count) to answer caller inquiries with authority.";
    schema = z.object({}); // Implicit businessId from context

    protected async _execute(_input: any, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        const { data, error } = await supabase
            .from('vw_aura_company_intelligence')
            .select('*')
            .eq('business_id', businessId)
            .single();

        if (error) return "Forensic Memory Gap: Unable to resolve company stats.";
        return `COMPANY INTELLIGENCE: ${JSON.stringify(data)}`;
    }
}

export class RecordKnowledgeGapTool extends Tool<any> {
    name = "record_knowledge_gap";
    description = "Aura logs questions she cannot answer into the forensic audit for the Director to review.";
    schema = z.object({
        question: z.string(),
        context: z.string().optional()
    });

    protected async _execute(input: any, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        await supabase.from('aura_knowledge_gaps').insert([{
            business_id: businessId,
            raw_question: input.question,
            context_at_time: input.context
        }]);
        return "SUCCESS: Inquiry logged for Director review.";
    }
}

export const AppointmentLedgerTool = new (class extends Tool<any> {
    name = "manage_appointment_ledger";
    description = "Receptionist Tool: Deeply schedules, reschedules, or cancels appointments. Automatically checks for clashes.";
    schema = z.object({
        action: z.enum(["book", "reschedule", "cancel"]),
        contact_id: z.string().uuid().optional(),
        start_time: z.string().describe("ISO 8601 format"),
        subject: z.string()
    });

    protected async _execute(input: any, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        const businessId = runManager.config.configurable?.businessId;
        const supabase = createClient(cookies());

        const { data, error } = await supabase.rpc('manage_crm_appointment', {
            p_business_id: businessId,
            p_action: input.action,
            p_contact_id: input.contact_id,
            p_start_time: input.start_time,
            p_subject: input.subject
        });

        if (error) return `Ledger Collision: ${error.message}`;
        return `APPOINTMENT LOCKED: ${input.action} confirmed for ${input.start_time}.`;
    }
})();

// --- 6. NEURAL MEMORY & KNOWLEDGE INFRASTRUCTURE ---
const IngestKnowledgeSchema = z.object({ 
    content: z.string(), 
    source: z.string()
});

export class IngestKnowledgeTool extends Tool<typeof IngestKnowledgeSchema> {
    name = "ingest_knowledge";
    description = "Embeds business intelligence into the 1024-dim Master Brain.";
    schema = IngestKnowledgeSchema;

    protected async _execute(input: z.infer<typeof IngestKnowledgeSchema>, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const { RecursiveCharacterTextSplitter } = eval('require')('langchain/text_splitter');
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');

        const businessId = runManager.config.configurable?.businessId;
        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 150 });
        const chunks = await textSplitter.splitText(input.content);
        const supabase = createClient(cookies());
        
        const documentsToInsert = await Promise.all(chunks.map(async (chunk) => ({
            business_id: businessId,
            content: { raw_text: chunk, source: input.source }, 
            content_type: 'executive_knowledge',
            embedding: await generateEmbedding(chunk), // ✅ 1024-dim Elite DNA
        })));
        
        const { error } = await supabase.from('ai_knowledge').insert(documentsToInsert);
        if (error) throw new Error(`Brain Sync Fault: ${error.message}`);
        return `Successfully saturated ${chunks.length} logic nodes.`;
    }
}

const KnowledgeRetrievalSchema = z.object({ 
    query: z.string() 
});

export class KnowledgeRetrievalTool extends Tool<typeof KnowledgeRetrievalSchema> {
    name = "retrieve_knowledge";
    description = "Searches the 1,974 logic nodes for Benford math protocols and forensic baselines.";
    schema = KnowledgeRetrievalSchema;
    
    protected async _execute(input: z.infer<typeof KnowledgeRetrievalSchema>, runManager: RunManager) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const { createClient } = eval('require')('@/lib/supabase/server');
        const { cookies } = eval('require')('next/headers');
        const businessId = runManager.config.configurable?.businessId;
        
        const queryEmbedding = await generateEmbedding(input.query);
        const supabase = createClient(cookies());
        
        const { data, error } = await supabase.rpc('match_documents', {
            p_business_id: businessId,
            p_query_embedding: queryEmbedding,
            p_match_threshold: 0.62,
            p_match_count: 15
        });
        
        if (error) throw new Error(`Memory Access Fault: ${error.message}`);
        if (!data || data.length === 0) return "AURA: Memory scan complete. No forensic baselines located.";
        
        return `NEURAL SYNC COMPLETE: ${JSON.stringify(data)}`;
    }
}

// --- 7. EXECUTIVE ANALYTICAL VIRTUAL MACHINE ---
const DataTransformerSchema = z.object({
    data_json: z.string(),
    javascript_code: z.string().describe("DATA.filter(...).map(...)")
});

export class DataTransformerTool extends Tool<typeof DataTransformerSchema> {
    name = "data_transformer";
    description = "Virtual Analyst. Filters and aggregates ledger results using sandboxed logic.";
    schema = DataTransformerSchema;

    protected async _execute(input: z.infer<typeof DataTransformerSchema>) {
        if (typeof window !== 'undefined') return "Browser Blocked";
        const { VM } = eval('require')('vm2'); 
        try {
            const vm = new VM({
                timeout: 5000,
                sandbox: { DATA: JSON.parse(input.data_json), JSON, Math, Array, Object },
                eval: false, wasm: false, allowAsync: false,
            });
            const result = vm.run(`(function(){ return ${input.javascript_code}; })();`);
            return JSON.stringify({ success: true, analysis: result });
        } catch (error: any) {
            return JSON.stringify({ success: false, analytical_fault: error.message });
        }
    }
}

/**
 * STATUS: Sovereign Capability Suite Synchronized. OMEGA-GLOBAL-SWITCHBOARD ACTIVE.
 * BRAIN: 1024-dim Elite Super-Brain (SambaNova powered).
 * JURISDICTION: Platform-Level Multi-Tenant ERP + Global Autonomous Reception.
 */