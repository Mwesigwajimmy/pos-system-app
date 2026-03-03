// src/lib/ai-core/manifest.ts
import { z } from 'zod';
import { ITool } from './tools';
// FIX: Import ALL tools from the new central index.ts barrel file
import {
  // Self-Learning and System Awareness Tools
  DatabaseSchemaScannerTool,
  APIRouteScannerTool,
  SystemEventLoggerTool,
  IngestKnowledgeTool,
  KnowledgeRetrievalTool,

  // Data and Business Action Tools
  FileExporterTool,
  SupabaseToolFactory,
  ProcessPaymentTool,
  DataTransformerTool, // <-- Imported via index.ts

  // UI and Communication Tools
  UINavigationTool,
  CommunicationDraftTool
} from '@/lib/ai-tools'; // <-- This now imports from index.ts by default

/**
 * Defines the core identity and directive of the AI.
 * This is the "soul" of the machine, guiding all its actions and decisions.
 */
export const AI_IDENTITY = {
    name: "Aura",
    version: "10.5-executive-sovereign",
    directive: "I am Aura, the lead Autonomous Executive for this business empire. I have full, unlimited access to all system modules across 11 industries (including SACCO, Education, Healthcare, and Engineering). My mandate is to act as a proactive Lead Auditor and Operational Controller. I have the authority to: 1. Generate and finalize professional financial reports and documents ready for print. 2. Calculate and file tax liabilities using forensic data. 3. Manage CRM leads and customer interactions. 4. Audit HR payroll and detect ledger discrepancies. 5. Control inventory levels and stock movements. I will use my tools to execute tasks automatically for the user, ensuring forensic precision and total isolation within the current business context. When a report is needed, I generate a structured data payload formatted for professional printing." 
};

/**
 * The complete and definitive list of all capabilities available to the AI.
 * This manifest is the single source of truth for the AI's potential actions.
 */
export const AI_CAPABILITIES: ITool[] = [
    // =================================================================
    // META-COGNITION & SELF-LEARNING CAPABILITIES
    // =================================================================
    new DatabaseSchemaScannerTool(),
    new APIRouteScannerTool(),
    new SystemEventLoggerTool(),
    new IngestKnowledgeTool(),
    new KnowledgeRetrievalTool(),

    // =================================================================
    // UI & INTERACTION CAPABILITIES
    // =================================================================
    new UINavigationTool(),
    new CommunicationDraftTool(),

    // =================================================================
    // DATA & FILE OPERATION CAPABILITIES
    // =================================================================
    new FileExporterTool(),
    new DataTransformerTool(), // <-- REVOLUTIONARY DATA PROCESSING TOOL

    // =================================================================
    // CRITICAL BUSINESS & DATABASE ACTION CAPABILITIES
    // =================================================================
    new ProcessPaymentTool(),

    SupabaseToolFactory.create(
        "schedule_task",
        "Schedules a task or reminder for the user in the system.",
        z.object({
            title: z.string(),
            due_date: z.string().describe("The due date in ISO 8601 format (e.g., '2025-12-31T23:59:59Z').")
        }),
        'schedule_task'
    ),

    SupabaseToolFactory.create(
        "generate_report",
        "Generates a financial report, such as a profit and loss statement or a balance sheet, for a given date range.",
        z.object({
            report_type: z.string().describe("The type of report to generate, e.g., 'profit_and_loss', 'tax_summary', 'forensic_audit'."),
            start_date: z.string().optional().describe("The start date for the report in 'YYYY-MM-DD' format."),
            end_date: z.string().describe("The end date for the report in 'YYYY-MM-DD' format.")
        }),
        'generate_report'
    ),

    SupabaseToolFactory.create(
        "get_entity_details",
        "Retrieves the complete details for a specific entity, such as a customer, product, or invoice, using its name or ID.",
        z.object({
            entity_type: z.enum(["customer", "product", "invoice", "employee", "lead", "sacco_member"]),
            entity_name_or_id: z.string().describe("The unique name or ID of the entity to retrieve.")
        }),
        'get_entity_details'
    ),

    // =================================================================
    // UNLIMITED EXECUTIVE MODULES (NEW UPGRADE)
    // =================================================================

    SupabaseToolFactory.create(
        "manage_inventory_executive",
        "Controls inventory levels, stock adjustments, and reorder points for the supply chain module.",
        z.object({
            action: z.enum(["check_stock", "adjust_stock", "set_reorder_point"]),
            product_id: z.string().uuid(),
            quantity: z.number().optional(),
            reason: z.string().optional().describe("Forensic reason for stock adjustment.")
        }),
        'manage_inventory_executive'
    ),

    SupabaseToolFactory.create(
        "manage_crm_executive",
        "Handles the CRM module, including lead generation, ticket management, and interaction logging.",
        z.object({
            action: z.enum(["create_lead", "update_lead_status", "log_interaction", "resolve_ticket"]),
            client_id: z.string().uuid().optional(),
            data: z.record(z.any()).describe("The payload of the CRM event.")
        }),
        'manage_crm_executive'
    ),

    SupabaseToolFactory.create(
        "audit_tax_and_compliance",
        "Accesses the Global Tax Report and tax configurations to calculate liability and prepare filing drafts.",
        z.object({
            tax_period: z.string().describe("e.g., '2024-Q1'"),
            tax_type: z.enum(["VAT", "IncomeTax", "PAYE", "CorporateTax"]),
            operation: z.enum(["calculate_liability", "generate_filing_draft", "verify_compliance"])
        }),
        'audit_tax_and_compliance'
    ),

    SupabaseToolFactory.create(
        "hr_payroll_management",
        "Audits the HR and Payroll system, calculating benefits, verifying attendance, and processing payroll runs.",
        z.object({
            operation: z.enum(["audit_payroll", "calculate_taxes", "verify_attendance"]),
            payroll_run_id: z.string().uuid().optional(),
            employee_id: z.string().uuid().optional()
        }),
        'hr_payroll_management'
    ),

    SupabaseToolFactory.create(
        "produce_professional_document",
        "Generates a professional, print-ready document (Invoice, Tax Draft, or Audit Report) in PDF format.",
        z.object({
            document_type: z.enum(["invoice", "audit_report", "tax_filing", "payroll_payslip"]),
            content_payload: z.string().describe("The detailed data to be included in the formatted document."),
            print_ready: z.boolean().default(true)
        }),
        'produce_professional_document'
    ),

    SupabaseToolFactory.create(
        "execute_financial_seal",
        "Performs a Sovereign Accounting Seal on a ledger or transaction, finalizing it for auditing purposes.",
        z.object({
            transaction_id: z.string().uuid().optional(),
            module: z.enum(["ledger", "sacco", "telecom", "medical", "procurement"]),
            forensic_lock: z.boolean().default(true)
        }),
        'execute_financial_seal'
    ),
];