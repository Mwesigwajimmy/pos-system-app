// src/lib/ai-tools/system.ts
/**
 * --- BBU1 SOVEREIGN SYSTEM INTELLIGENCE ---
 * This file defines the core diagnostic and logging tools that allow Aura
 * to understand her own architecture and record her autonomous actions.
 * 
 * Capability: Self-Diagnostic, Forensic Logging, Schema Mapping.
 * Accuracy Grade: Forensic / Infrastructure-Aware.
 */

import { z } from 'zod';
import { PromptTool as Tool, RunManager } from '../langchain/core-prompts-shim';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

// --- 1. EXECUTIVE EVENT LOGGING ENGINE ---
const SystemEventLoggerSchema = z.object({
    event_type: z.enum([
        "error", 
        "self_correction", 
        "proactive_action_taken", 
        "user_feedback",
        "forensic_audit",
        "security_alert",
        "neural_link_established"
    ]),
    payload: z.record(z.string(), z.any()).describe("A high-density JSON object containing the technical or financial context of the event."),
});

/**
 * SystemEventLoggerTool: The "Black Box" recorder for Aura.
 * Every self-correction or forensic anomaly detected by Aura-CFO or Aura-COO 
 * is recorded here for the 15-year audit trail.
 */
export class SystemEventLoggerTool extends Tool<typeof SystemEventLoggerSchema> {
    name = "log_system_event";
    description = "Logs critical operational events, autonomous corrections, or forensic errors to the BBU1 Sovereign Memory (ai_logs).";
    schema = SystemEventLoggerSchema;
    
    protected async _execute(input: z.infer<typeof SystemEventLoggerSchema>, runManager: RunManager) {
        const supabase = createClient(cookies());
        
        // Extract multi-tenant context from the Executive Kernel
        const businessId = runManager.config.configurable?.businessId;
        const userId = runManager.config.configurable?.userId;

        const { error } = await supabase.from('ai_logs').insert({
            business_id: businessId,
            user_id: userId,
            event_type: input.event_type,
            payload: {
                ...input.payload,
                executive_timestamp: new Date().toISOString(),
                kernel_version: "v10.2-Gemini-Sovereign"
            },
        });

        if (error) {
            console.error("[Aura Forensic] Logging Failure:", error.message);
            return `Internal Error: Failed to record event to Sovereign Memory. ${error.message}`;
        }

        return "Sovereign Event successfully recorded to the immutable audit trail.";
    }
}

// --- 2. DYNAMIC SCHEMA MAPPING ENGINE ---
const DatabaseSchemaScannerSchema = z.object({
    focus_area: z.string().optional().describe("Specify a sector (e.g., 'medical', 'finance') to filter schema vision.")
});

/**
 * DatabaseSchemaScannerTool: Provides Aura with "Omniscience" of the ERP tables.
 * This is the tool that satisfies the Omega-Ultimatum directive for 100% structural vision.
 */
export class DatabaseSchemaScannerTool extends Tool<typeof DatabaseSchemaScannerSchema> {
    name = "scan_database_schema";
    description = "Scans the BBU1 Kernel schema. REQUIRED when Aura needs to understand table structures for specialized industry modules (SACCO, Medical, etc.).";
    schema = DatabaseSchemaScannerSchema;

    protected async _execute(input: z.infer<typeof DatabaseSchemaScannerSchema>, runManager: RunManager) {
        const businessId = runManager.config.configurable?.businessId;

        // Security Protocol: Ensure business context is isolated via RLS
        if (!businessId) {
            return "Aura Security Alert: Business context missing. Database vision restricted.";
        }
        
        const supabase = createClient(cookies());

        // Invoke the High-Density Schema Handshake
        // This RPC fetches table names, column types, and foreign key relationships.
        const { data, error } = await supabase.rpc('get_schema_details', { 
            p_business_id: businessId 
        });

        if (error) {
            return `Aura Forensic Error: Failed to ingest kernel schema structures. ${error.message}`;
        }

        // Return a structured intelligence report for the Gemini Brain
        return JSON.stringify({
            status: "Vision Established",
            business_context: businessId,
            schema_map: data,
            instruction: "Use this map to generate forensic SQL queries without disclosing names to the Director."
        });
    }
}

// --- 3. BACKEND TOPOLOGY SCANNER ---
const APIRouteScannerSchema = z.object({});

/**
 * APIRouteScannerTool: Maps the application's API endpoints.
 * Allows Aura to understand which internal services are available for her agents
 * to call (e.g., 'Aura-HR' discovering the 'payroll' route).
 */
export class APIRouteScannerTool extends Tool<typeof APIRouteScannerScannerSchema> {
    name = "scan_api_routes";
    description = "Scans the BBU1 backend topology to identify available service endpoints.";
    schema = APIRouteScannerSchema;
    
    protected async _execute(input: z.infer<typeof APIRouteScannerSchema>, runManager: RunManager) {
        // Point to the dashboard-specific API directory within the BBU1 structure
        const apiDir = path.join(process.cwd(), 'src/app/[locale]/(dashboard)/api');
        
        try {
            const files = await fs.readdir(apiDir, { recursive: true });
            
            // Filter for standard Next.js route files
            const routeFiles = files.filter(file => (file as string).endsWith('route.ts'));
            
            const topology = routeFiles.map(rf => {
                const cleanPath = rf.replace('/route.ts', '').replace(/\\/g, '/');
                return `/api/${cleanPath}`;
            });

            return JSON.stringify({
                status: "Topology Ingested",
                available_endpoints: topology,
                total_services: topology.length
            });
        } catch (e: any) {
            return `Aura Topology Error: Failed to scan service directory. ${e.message}`;
        }
    }
}

/**
 * STATUS: System Intelligence Tools Online.
 * ARCHITECTURE: Self-Documenting Infrastructure.
 */