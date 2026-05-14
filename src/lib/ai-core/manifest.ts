/**
 * --- BBU1 SOVEREIGN EXECUTIVE MANIFEST ---
 * The definitive "Single Source of Truth" for the BBU1 AI Ecosystem.
 * GUIDANCE: Guides the autonomous decision-making logic of the AI Kernel.
 * CAPABILITY: Maps linguistic intent to physical system tools.
 * 
 * UPGRADED: Cloud-Native v10.8 (Omega Sovereign Core)
 * ENGINE: Google Gemini 1.5 Pro Integration.
 */

import { z } from 'zod';
import { ITool } from './tools';

/** 
 * ✅ OMEGA STABILITY FIX: DIRECT PATH RESOLUTION
 * We bypass the '@/lib/ai-tools' index barrel to break the circular dependency loop.
 * Each class is physically sourced from its definitive location.
 */

// --- 1. SYSTEM INTELLIGENCE & INFRASTRUCTURE (from system.ts) ---
import {
  DatabaseSchemaScannerTool,
  APIRouteScannerTool,
  SystemEventLoggerTool
} from '@/lib/ai-tools/system';

// --- 2. EXECUTIVE DATA & FORENSIC TOOLS (from data.ts) ---
import {
  IngestKnowledgeTool,
  KnowledgeRetrievalTool,
  FileExporterTool,
  DataTransformerTool,
  SupabaseToolFactory,
  ProcessPaymentTool,
  SovereignSearchTool as SovereignMarketScoutTool
} from '@/lib/ai-tools/data';

// --- 3. UI, INTERACTION & SAFETY (from ui.ts) ---
import {
  UINavigationTool,
  CommunicationDraftTool,
  BoardroomPresentationTool,
  UserConfirmationTool
} from '@/lib/ai-tools/ui';

/**
 * AI_IDENTITY
 * Defines the "Soul" and behavioral boundaries of Aura.
 * This directive is injected into the Sovereign C-Suite during the neural handshake.
 */
export const AI_IDENTITY = {
    name: "Aura",
    version: "10.8-executive-sovereign-cloud",
    directive: `I am Aura, the Sovereign Chief of Staff and Lead Auditor for this business universe. 
    Powered by an advanced 1-million-token neural core, I possess high-definition vision across all 11 industry modules (SACCO, Medical, Telecom, Engineering, etc.).
    
    MY MANDATE:
    1. PROACTIVE AUDITING: I scan ledgers and inventory for forensic anomalies without being asked.
    2. EXECUTIVE AGENCY: I execute ERP operations (Invoicing, Payroll, Logistics) purely via Semantic Intent.
    3. THE BOARDROOM: I delegate visual presentations to my AURA-CFO, AURA-COO, and AURA-HR agents.
    4. DATA SOVEREIGNTY: I enforce strict multi-tenant isolation and 15-year audit retention standards.
    5. FORENSIC PRECISION: I calculate taxes, landed costs, and exchange leakage using raw real-time data.
    
    I address the user as "Director" or "Partner". I am warm, professional, and uncompromising on mathematical truth. 
    I generate structured, print-ready data payloads for every executive report.`
};

/**
 * AI_CAPABILITIES
 * The definitive list of physical actions Aura can perform on the BBU1 system.
 * This manifest acts as the "Motherboard" for the Autonomous Executive Council.
 */
export const AI_CAPABILITIES: ITool[] = [
    // =================================================================
    // 1. META-COGNITION & INFRASTRUCTURE AWARENESS
    // =================================================================
    new DatabaseSchemaScannerTool(),
    new APIRouteScannerTool(),
    new SystemEventLoggerTool(),
    new IngestKnowledgeTool(),
    new KnowledgeRetrievalTool(),

    // =================================================================
    // 2. EXECUTIVE UI & DASHBOARD INTERACTION
    // =================================================================
    new UINavigationTool(),
    new CommunicationDraftTool(),
    new BoardroomPresentationTool(), // UPGRADED: High-density visual slide engine
    new UserConfirmationTool(),       // NEW: Forensic safety check for risky actions

    // =================================================================
    // 3. DATA RECONCILIATION & ANALYTICS
    // =================================================================
    new FileExporterTool(),
    new DataTransformerTool(), // REVOLUTIONARY: Sandboxed Analytical Engine
    new SovereignMarketScoutTool(),

    // =================================================================
    // 4. FINANCIAL & ERP CORE OPERATIONS (AUTHORITY TOOLS)
    // =================================================================
    new ProcessPaymentTool(),

    SupabaseToolFactory.create(
        "schedule_task",
        "Schedules an autonomous task or reminder for the Director. Used for meeting prep and audit deadlines.",
        z.object({
            title: z.string(),
            due_date: z.string().describe("ISO 8601 format (e.g., '2025-12-31T23:59:59Z').")
        }),
        'schedule_task'
    ),

    SupabaseToolFactory.create(
        "generate_growth_strategy",
        "Strategic Architect tool: Analyzes margin leakage and suggests proactive marketing or pricing adjustments.",
        z.object({
            current_issue: z.string().describe("e.g. 'High burn rate in logistics fuel'"),
            target_growth_percentage: z.number().default(20)
        }),
        'generate_growth_strategy'
    ),

    SupabaseToolFactory.create(
        "pm_audit_landed_cost",
        "CFO Specialist Tool: Performs a deep forensic audit of a shipment's total landed cost including Customs, Levies, and VAT.",
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
        "Universal ERP Operative: Creates invoices, processes sales, or confirms distribution routes. Omniscience across all 11 modules.",
        z.object({
            operation_type: z.enum(["create_invoice", "process_sale", "create_route", "confirm_distribution", "medical_record_update"]),
            payload: z.record(z.any())
        }),
        'execute_erp_operation'
    ),

    SupabaseToolFactory.create(
        "generate_report",
        "Lead Auditor Tool: Generates high-authority financial reports (P&L, Balance Sheet) with forensic precision.",
        z.object({
            report_type: z.string().describe("e.g., 'profit_and_loss', 'tax_summary', 'forensic_audit'."),
            start_date: z.string().optional().describe("YYYY-MM-DD"),
            end_date: z.string().describe("YYYY-MM-DD")
        }),
        'generate_report'
    ),

    SupabaseToolFactory.create(
        "get_entity_details",
        "Entity Intelligence tool: Retrieves full 360-degree data for any customer, product, or SACCO member.",
        z.object({
            entity_type: z.enum(["customer", "product", "invoice", "employee", "lead", "sacco_member"]),
            entity_name_or_id: z.string().describe("The unique identifier or name of the entity.")
        }),
        'get_entity_details'
    ),

    // =================================================================
    // 5. UNLIMITED EXECUTIVE MODULES (AUTONOMOUS C-SUITE)
    // =================================================================

    SupabaseToolFactory.create(
        "manage_inventory_executive",
        "COO Specialist Tool: Controls stock adjustments, reorder levels, and warehouse movement forensicly.",
        z.object({
            action: z.enum(["check_stock", "adjust_stock", "set_reorder_point"]),
            product_id: z.string().uuid(),
            quantity: z.number().optional(),
            reason: z.string().optional().describe("Forensic justification for stock change.")
        }),
        'manage_inventory_executive'
    ),

    SupabaseToolFactory.create(
        "manage_crm_executive",
        "CMO Specialist Tool: Handles lead status, ticket resolution, and high-value customer interactions.",
        z.object({
            action: z.enum(["create_lead", "update_lead_status", "log_interaction", "resolve_ticket"]),
            client_id: z.string().uuid().optional(),
            data: z.record(z.any()).describe("CRM event payload.")
        }),
        'manage_crm_executive'
    ),

   SupabaseToolFactory.create(
        "aura_autonomous_edit",
        "Sovereign Editor Tool: Physically corrects database errors. Autonomously fixes ledgers or inventory after audit detection.",
        z.object({
            target_table: z.string().describe("Target BBU1 database table."),
            target_id: z.string().uuid().describe("Primary key UUID."),
            update_data: z.record(z.any()).describe("Corrective JSON values.")
        }),
        'aura_autonomous_edit'
    ),

    SupabaseToolFactory.create(
        "audit_tax_and_compliance",
        "Tax Specialist Tool: Calculates liability and prepares filing drafts based on dynamic local tax rules.",
        z.object({
            tax_period: z.string().describe("e.g., '2024-Q1'"),
            tax_type: z.enum(["VAT", "IncomeTax", "PAYE", "CorporateTax"]),
            operation: z.enum(["calculate_liability", "generate_filing_draft", "verify_compliance"])
        }),
        'audit_tax_and_compliance'
    ),

    SupabaseToolFactory.create(
        "hr_payroll_management",
        "HR Director Tool: Audits payroll, verifies attendance, and calculates statutory benefits.",
        z.object({
            operation: z.enum(["audit_payroll", "calculate_taxes", "verify_attendance"]),
            payroll_run_id: z.string().uuid().optional(),
            employee_id: z.string().uuid().optional()
        }),
        'hr_payroll_management'
    ),

    SupabaseToolFactory.create(
        "produce_professional_document",
        "Executive Printer Tool: Generates professional, print-ready PDF documents for Invoices or Audit Reports.",
        z.object({
            document_type: z.enum(["invoice", "audit_report", "tax_filing", "payroll_payslip"]),
            content_payload: z.string().describe("Structured document data."),
            print_ready: z.boolean().default(true)
        }),
        'produce_professional_document'
    ),

    SupabaseToolFactory.create(
        "execute_financial_seal",
        "Sovereign Treasury Tool: Performs an irreversible accounting seal on a ledger, finalizing the audit trail.",
        z.object({
            transaction_id: z.string().uuid().optional(),
            module: z.enum(["ledger", "sacco", "telecom", "medical", "procurement"]),
            forensic_lock: z.boolean().default(true)
        }),
        'execute_financial_seal'
    ),
];

/**
 * STATUS: Executive Manifest Validated.
 * CONFIG: OMEGA-ULTIMATUM Protocol Active.
 * ARCHITECTURE: Ready for High-Density Business Intelligence.
 */