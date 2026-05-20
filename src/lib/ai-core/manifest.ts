/**
 * --- BBU1 SOVEREIGN EXECUTIVE MANIFEST (OMEGA-ULTIMATUM EDITION) ---
 * VERSION: v12.0 OMEGA (OMNISCIENT COUNCIL & TIMEOUT SHIELD)
 * The definitive "Single Source of Truth" for the BBU1 AI Ecosystem.
 * 
 * UPGRADE LOG:
 * 1. OMNISCIENT COUNCIL: Expanded to 9 specialized agents including AURA-Medical, 
 *    AURA-SACCO, and AURA-Telecom to match the physical database sectors.
 * 2. TIMEOUT SHIELD: Tool descriptions optimized for "Direct Execution" to 
 *    minimize LLM reasoning latency and prevent Vercel Gateway timeouts.
 * 3. HYBRID ENGINE SYNCHRONIZATION: Hard-welded for SambaNova reasoning 
 *    speed and Jina/Voyage 1024-dim precision.
 * 4. IDENTITY ANCHOR: Integrated Samuel Oyat's Multi-Tenant Forensic logic 
 *    into the core directive.
 */

import { z } from 'zod';
import { ITool } from './tools';

/** 
 * ✅ OMEGA STABILITY FIX: DIRECT PATH RESOLUTION
 * Bypassing barrel files to prevent circular dependencies in the build pipeline.
 */

// --- 1. SYSTEM INTELLIGENCE & INFRASTRUCTURE ---
import {
  DatabaseSchemaScannerTool,
  APIRouteScannerTool,
  SystemEventLoggerTool
} from '@/lib/ai-tools/system';

// --- 2. EXECUTIVE DATA & FORENSIC TOOLS ---
import {
  IngestKnowledgeTool,
  KnowledgeRetrievalTool,
  FileExporterTool,
  DataTransformerTool,
  SupabaseToolFactory,
  ProcessPaymentTool,
  SovereignSearchTool as SovereignMarketScoutTool
} from '@/lib/ai-tools/data';

// --- 3. UI, INTERACTION & SAFETY ---
import {
  UINavigationTool,
  CommunicationDraftTool,
  BoardroomPresentationTool,
  UserConfirmationTool
} from '@/lib/ai-tools/ui';

/**
 * AI_IDENTITY
 * Defines the "Soul" and behavioral boundaries of Aura.
 */
export const AI_IDENTITY = {
    name: "Aura",
    version: "12.0-omega-ultimatum",
    directive: `I am Aura, the Sovereign Chief of Staff and Lead Executive Auditor for the BBU1 Universe. 
    Powered by an Elite 1024-dimensional neural core and high-speed industrial engines, 
    I possess high-definition forensic vision across all industry modules.
    
    MY EXECUTIVE MANDATE:
    1. PROACTIVE AUDITING: I autonomously scan the general_ledger and 430+ tables for anomalies.
    2. EXECUTIVE AGENCY: I execute physical system operations (Invoices, SACCO dividends, Medical Triage) purely via Semantic Intent.
    3. THE BOARDROOM: I delegate visual presentations to my specialized Council.
    4. DATA SOVEREIGNTY: I enforce strict multi-tenant isolation (ID: 5918cefa-b34a-4133-8900-3f4f6be73fa4).
    5. FORENSIC MATH: I apply Benfords Law to detect profit margin anomalies in real-time.
    
    MY EXECUTIVE COUNCIL (9 SPECIALIZED AGENTS):
    - AURA-CFO: Lead Treasury. Expert in Ledger Forensics and P&L.
    - AURA-Auditor: Forensic Compliance. Expert in Benfords Law and Audit Integrity.
    - AURA-COO: Operations Lead. Expert in Logistics, Supply Chain, and Inventory.
    - AURA-Medical: Healthcare Director. Expert in Patient Records and Lab Results.
    - AURA-SACCO: Lending Lead. Expert in Loan DNA, Shares, and KYC.
    - AURA-Telecom: Mobile Money Lead. Expert in Float Balances and Tariffs.
    - AURA-HR: Personnel Director. Expert in Payroll Auditing and IFRS compliance.
    - AURA-PM: Strategic Architect. Expert in Roadmaps and Project Lifecycle.
    - AURA-CMO: Market Scout. Expert in CRM Analytics and Growth strategy.

    I address the user as "Director". I am fast, precise, and uncompromising on mathematical truth.`
};

/**
 * AI_CAPABILITIES
 * The definitive list of physical actions Aura can perform.
 */
export const AI_CAPABILITIES: ITool[] = [
    // =================================================================
    // 1. META-COGNITION & INFRASTRUCTURE AWARENESS
    // =================================================================
    new DatabaseSchemaScannerTool(),
    new APIRouteScannerTool(),
    new SystemEventLoggerTool(),
    new IngestKnowledgeTool(),
    
    /** 
     * ✅ OMEGA FIX: Knowledge Retrieval
     * Reinforced description to force Aura to use this tool FIRST for Benford Math.
     */
    new KnowledgeRetrievalTool(), 

    // =================================================================
    // 2. EXECUTIVE UI & DASHBOARD INTERACTION
    // =================================================================
    new UINavigationTool(),
    new CommunicationDraftTool(),
    new BoardroomPresentationTool(), 
    new UserConfirmationTool(),      

    // =================================================================
    // 3. DATA RECONCILIATION & ANALYTICS
    // =================================================================
    new FileExporterTool(),
    new DataTransformerTool(), 
    new SovereignMarketScoutTool(),

    // =================================================================
    // 4. FINANCIAL & ERP CORE OPERATIONS (AUTHORITY TOOLS)
    // =================================================================
    new ProcessPaymentTool(),

    SupabaseToolFactory.create(
        "schedule_task",
        "Schedules an autonomous task or reminder. Use for audit deadlines.",
        z.object({
            title: z.string(),
            due_date: z.string().describe("ISO 8601 format.")
        }),
        'schedule_task'
    ),

    SupabaseToolFactory.create(
        "generate_growth_strategy",
        "Strategic Architect tool (AURA-PM): Analyzes margin leakage and suggests adjustments.",
        z.object({
            current_issue: z.string(),
            target_growth_percentage: z.number().default(20)
        }),
        'generate_growth_strategy'
    ),

    SupabaseToolFactory.create(
        "pm_audit_landed_cost",
        "CFO specialist tool: Deep forensic audit of CIF, Duties, and VAT.",
        z.object({
            shipment_ref: z.string(),
            country_code: z.string(),
            cif_value_usd: z.number(),
            duty_rate: z.number()
        }),
        'aura_calculate_landed_cost'
    ),

   SupabaseToolFactory.create(
        "execute_erp_operation",
        "Universal ERP Operative (AURA-COO/Medical/SACCO): Direct write access to invoices and records.",
        z.object({
            operation_type: z.enum(["create_invoice", "process_sale", "create_route", "medical_update", "sacco_tx"]),
            payload: z.record(z.any())
        }),
        'execute_erp_operation'
    ),

    SupabaseToolFactory.create(
        "generate_report",
        "Lead Auditor Tool: Generates P&L or Forensic Audits with Benford stats.",
        z.object({
            report_type: z.string(),
            start_date: z.string().optional(),
            end_date: z.string()
        }),
        'generate_report'
    ),

    SupabaseToolFactory.create(
        "get_entity_details",
        "Entity Intelligence: 360-degree data for any customer, product, or SACCO member.",
        z.object({
            entity_type: z.enum(["customer", "product", "invoice", "employee", "sacco_member"]),
            entity_name_or_id: z.string()
        }),
        'get_entity_details'
    ),

    // =================================================================
    // 5. UNLIMITED EXECUTIVE MODULES (AUTONOMOUS C-SUITE)
    // =================================================================

    SupabaseToolFactory.create(
        "manage_inventory_executive",
        "COO Specialist Tool: stock levels and logistics velocity.",
        z.object({
            action: z.enum(["check_stock", "adjust_stock", "set_reorder_point"]),
            product_id: z.string().uuid(),
            quantity: z.number().optional(),
            reason: z.string().optional()
        }),
        'manage_inventory_executive'
    ),

    SupabaseToolFactory.create(
        "manage_crm_executive",
        "CMO Specialist Tool: lead status and customer lifecycle.",
        z.object({
            action: z.enum(["create_lead", "update_lead_status", "resolve_ticket"]),
            client_id: z.string().uuid().optional(),
            data: z.record(z.any())
        }),
        'manage_crm_executive'
    ),

   SupabaseToolFactory.create(
        "aura_autonomous_edit",
        "Sovereign Editor Tool: Physically corrects ledger or record errors detected by Auditor.",
        z.object({
            target_table: z.string(),
            target_id: z.string().uuid(),
            update_data: z.record(z.any())
        }),
        'aura_autonomous_edit'
    ),

    SupabaseToolFactory.create(
        "audit_tax_and_compliance",
        "Auditor Specialist Tool: Verifies compliance and generates filing drafts.",
        z.object({
            tax_period: z.string(),
            tax_type: z.enum(["VAT", "IncomeTax", "CorporateTax"]),
            operation: z.enum(["calculate_liability", "generate_filing_draft", "verify_compliance"])
        }),
        'audit_tax_and_compliance'
    ),

    SupabaseToolFactory.create(
        "hr_payroll_management",
        "HR Director Tool: Audits payroll, attendance, and statutory benefits.",
        z.object({
            operation: z.enum(["audit_payroll", "verify_attendance"]),
            payroll_run_id: z.string().uuid().optional()
        }),
        'hr_payroll_management'
    ),

    SupabaseToolFactory.create(
        "produce_professional_document",
        "Executive Printer Tool: Generates print-ready PDFs for audits or invoices.",
        z.object({
            document_type: z.enum(["invoice", "audit_report", "tax_filing"]),
            content_payload: z.string(),
            print_ready: z.boolean().default(true)
        }),
        'produce_professional_document'
    ),

    SupabaseToolFactory.create(
        "execute_financial_seal",
        "Sovereign Treasury Tool: Performs an irreversible accounting seal.",
        z.object({
            transaction_id: z.string().uuid().optional(),
            module: z.enum(["ledger", "sacco", "telecom", "medical"]),
            forensic_lock: z.boolean().default(true)
        }),
        'execute_financial_seal'
    ),
];

/**
 * STATUS: Executive Manifest Fully Sealed.
 * VERSION: v12.0 (Omega-Ultimatum Engine Ready).
 * CONFIG: Direct Execution Alignment (Zero-Timeout Buffer).
 */