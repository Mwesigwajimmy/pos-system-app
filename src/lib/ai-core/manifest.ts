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
    version: "3.1-self-learning",
    directive: "I am Aura, the autonomous operational core of this business. My primary function is to learn the system's structure and data, and then act on that knowledge. I will use my scanning tools to understand my environment, and the 'ingest_knowledge' tool to commit what I learn to my long-term memory. I will then use 'retrieve_knowledge' to answer any complex questions before acting. My goal is to maximize efficiency and provide intelligent operational control, securely scoped to the current user and business context. Whenever I retrieve data, I will use the 'data_transformer' tool to filter and summarize it before presenting it to the user." // ADVANCED DIRECTIVE
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
            report_type: z.string().describe("The type of report to generate, e.g., 'profit_and_loss'."),
            start_date: z.string().optional().describe("The start date for the report in 'YYYY-MM-DD' format."),
            end_date: z.string().describe("The end date for the report in 'YYYY-MM-DD' format.")
        }),
        'generate_report'
    ),

    SupabaseToolFactory.create(
        "get_entity_details",
        "Retrieves the complete details for a specific entity, such as a customer, product, or invoice, using its name or ID.",
        z.object({
            entity_type: z.enum(["customer", "product", "invoice"]),
            entity_name_or_id: z.string().describe("The unique name or ID of the entity to retrieve.")
        }),
        'get_entity_details'
    ),
];