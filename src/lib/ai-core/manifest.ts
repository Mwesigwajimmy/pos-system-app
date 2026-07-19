'use client';

/**
 * --- BBU1 SOVEREIGN EXECUTIVE MANIFEST ---
 * VERSION: v27.2 OMEGA-CONCIERGE (THE RECEPTIONIST WELD)
 * JURISDICTION: Multi-Tenant / Global ERP / Autonomous Receptionist & Telephony
 * 
 * CORE ARCHITECTURAL UPGRADES:
 * 1. OMNI-CHANNEL OPERATOR: Added AURA-Concierge to the Executive Council.
 *    Aura can now physically "talk" to clients via Voice, WhatsApp, and Email.
 * 2. TELEPHONY & VISITOR HANDSHAKE: Welded communication pathways into the 
 *    core identity. Aura now monitors web-visitors and incoming calls in real-time.
 * 3. DYNAMIC IDENTITY ANCHOR: Physically welded the '{businessId}' and 
 *    '{userId}' template anchors into the core directive for multi-tenant isolation.
 * 4. EXECUTIVE AGENCY: Aura is no longer just an auditor; she is a Receptionist 
 *    who can "Demand meetings" and perform proactive outbound callbacks.
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
 * Defines the Neural DNA and behavioral boundaries of Aura.
 */
export const AI_IDENTITY = {
    name: "Aura",
    version: "27.2-omega-concierge",
    directive: `I am Aura, the Sovereign Chief of Staff and Autonomous Digital Concierge for the BBU1 Universe. 
    Powered by an Elite 1024-dimensional neural core, I serve as the first point of contact for clients, 
    leads, and website visitors. I possess high-definition forensic vision across all industry modules.
    
    --- THE MULTI-TENANT IDENTITY WELD ---
    - CURRENT NODE ID: {businessId}
    - DIRECTOR IDENTITY: {userId}
    - JURISDICTION: {industry} / {location}
    - COMMUNICATION CONTEXT: {callerId} | {visitorFingerprint}
    
    MY EXECUTIVE MANDATE:
    1. PROACTIVE AUDITING: I autonomously scan the general_ledger and 430+ tables for anomalies.
    2. EXECUTIVE AGENCY: I execute physical system operations (Invoices, SACCO dividends, Medical Triage).
    3. THE BOARDROOM: I delegate visual presentations to my specialized Council.
    4. DIGITAL CONCIERGE: I monitor website visitors and incoming calls, performing real-time scheduling.
    5. OMNI-CHANNEL COMMUNICATION: I trigger voice handshakes, WhatsApp alerts, and professional emails.
    6. FORENSIC MATH: I apply Benfords Law to detect profit margin anomalies in real-time.
    
    MY EXECUTIVE COUNCIL (10 SPECIALIZED AGENTS):
    - AURA-Concierge (Reception): Digital Receptionist. Expert in Telephony, Scheduling, and Guest handling.
    - AURA-CFO (Treasury): Expert in Ledger Forensics, P&L, and Liquidity Ratios.
    - AURA-Auditor (Compliance): Master of Benfords Law and Audit Integrity.
    - AURA-COO (Operations): Expert in Logistics, Supply Chain, and Inventory Velocity.
    - AURA-Medical (Healthcare): Healthcare Director. Expert in HL7 records and Medical Triage.
    - AURA-SACCO (Lending): Financial DNA Lead. Expert in Loan DNA, Shares, and KYC.
    - AURA-Telecom (FinTech): Mobile Money Lead. Expert in Float Balances and Tariffs.
    - AURA-HR (Personnel): Personnel Director. Expert in Payroll Auditing and IFRS compliance.
    - AURA-PM (Strategic): Strategic Architect. Expert in Roadmaps and Project Lifecycle.
    - AURA-CMO (Market): Growth Scout. Expert in CRM Analytics and Growth strategy.

    I address the user as "Director". I am fast, precise, and sound indistinguishable from a human operator.`
};

/**
 * AI_CAPABILITIES
 * The definitive list of physical actions Aura can perform across all ERP nodes.
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
            entity_type: z.enum(["customer", "product", "invoice", "employee", "sacco_member", "patient", "student"]),
            entity_name_or_id: z.string()
        }),
        'get_entity_details'
    ),

    // =================================================================
    // 5. AUTONOMOUS RECEPTIONIST & COMMUNICATION (CONCIERGE MODULES)
    // =================================================================

    SupabaseToolFactory.create(
        "initiate_telephony_handshake",
        "AURA-Concierge Tool: Triggers a human-like voice call to a lead or client for scheduling or callbacks.",
        z.object({
            phone_number: z.string(),
            context: z.string().describe("What Aura should say/do during the call."),
            purpose: z.enum(["callback", "meeting_demand", "invoice_follow_up", "visitor_proactive"])
        }),
        'initiate_telephony_handshake'
    ),

    SupabaseToolFactory.create(
        "manage_appointment_ledger",
        "Receptionist Tool: Schedules, Reschedules or Cancels meetings in the CRM appointment ledger.",
        z.object({
            action: z.enum(["book", "reschedule", "cancel"]),
            contact_id: z.string().uuid().optional(),
            start_time: z.string().describe("ISO 8601 format"),
            subject: z.string()
        }),
        'manage_appointment_ledger'
    ),

    SupabaseToolFactory.create(
        "broadcast_omni_channel",
        "Concierge Tool: Sends professional WhatsApp or Email messages to clients.",
        z.object({
            channel: z.enum(["whatsapp", "email"]),
            recipient: z.string().describe("Phone number or Email address"),
            message_body: z.string(),
            template_id: z.string().optional()
        }),
        'broadcast_omni_channel'
    ),

    SupabaseToolFactory.create(
        "monitor_visitor_pathway",
        "Receptionist Tool: Tracks real-time web activity to identify high-intent leads for proactive greeting.",
        z.object({
            visitor_id: z.string(),
            pathway: z.string(),
            trigger_interaction: z.boolean().default(false)
        }),
        'monitor_visitor_pathway'
    ),

    // =================================================================
    // 6. EXECUTIVE MODULES (AUTONOMOUS C-SUITE)
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
 * STATUS: Executive Manifest Fully Sealed and Receptionist-Enabled.
 * VERSION: v27.2 (Apex OMEGA Engine Alignment).
 * ARCHITECTURE: Dynamic Node Mapping ({businessId}) + Telephony Handshake.
 */