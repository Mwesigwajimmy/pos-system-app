import { z } from 'zod';
import { Tool, RunManager } from '../ai-core/tools';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

// FIX: Define schema externally for Tool<T> compatibility and correct schema definition
const SystemEventLoggerSchema = z.object({
    event_type: z.enum(["error", "self_correction", "proactive_action_taken", "user_feedback"]),
    // FIX: Explicitly add the z.string() key schema to z.record() to fix the "Expected 2-3 arguments" error
    payload: z.record(z.string(), z.any()).describe("JSON object with detailed event information."),
});

export class SystemEventLoggerTool extends Tool<typeof SystemEventLoggerSchema> {
    name = "log_system_event";
    description = "Logs significant events, errors, or self-corrections to operational memory.";
    schema = SystemEventLoggerSchema;
    
    protected async _execute(input: z.infer<typeof SystemEventLoggerSchema>, runManager: RunManager) {
        const supabase = createClient(cookies());
        const { error } = await supabase.from('ai_logs').insert({
            business_id: runManager.config.configurable?.businessId,
            user_id: runManager.config.configurable?.userId,
            event_type: input.event_type,
            payload: input.payload,
        });
        if (error) return `Failed to log event: ${error.message}`;
        return "Event successfully logged.";
    }
}

// FIX: Define schema externally for Tool<T> compatibility
const DatabaseSchemaScannerSchema = z.object({});

export class DatabaseSchemaScannerTool extends Tool<typeof DatabaseSchemaScannerSchema> {
    name = "scan_database_schema";
    description = "Scans the current database schema to understand available data structures.";
    schema = DatabaseSchemaScannerSchema;

    protected async _execute(input: z.infer<typeof DatabaseSchemaScannerSchema>, runManager: RunManager) {
        // --- START: MODIFICATION ---
        // 1. Extract the businessId from the context passed by the AI Kernel.
        const businessId = runManager.config.configurable?.businessId;

        // 2. Add a security check to ensure the context is present.
        if (!businessId) {
            return "Error: Business context is missing. Cannot scan database schema.";
        }
        
        const supabase = createClient(cookies());

        // 3. Pass the businessId as a parameter to your Supabase RPC function.
        const { data, error } = await supabase.rpc('get_schema_details', { 
            p_business_id: businessId 
        });
        // --- END: MODIFICATION ---

        if (error) return `Failed to scan database schema: ${error.message}`;
        const knowledge = `Database schema ingested. Tables found: ${JSON.stringify(data)}`;
        // This result should then be embedded and stored in a vector DB
        return knowledge;
    }
}

// FIX: Define schema externally for Tool<T> compatibility
const APIRouteScannerSchema = z.object({});

export class APIRouteScannerTool extends Tool<typeof APIRouteScannerSchema> {
    name = "scan_api_routes";
    description = "Scans the application's API routes to understand available backend endpoints.";
    schema = APIRouteScannerSchema;
    
    protected async _execute(input: z.infer<typeof APIRouteScannerSchema>, runManager: RunManager) {
        const apiDir = path.join(process.cwd(), 'src/app/[locale]/(dashboard)/api');
        try {
            const files = await fs.readdir(apiDir, { recursive: true });
            const routeFiles = files.filter(file => (file as string).endsWith('route.ts'));
            const knowledge = `API routes ingested. Found endpoints: ${routeFiles.join(', ')}`;
            return knowledge;
        } catch (e: any) {
            return `Failed to scan API routes: ${e.message}`;
        }
    }
}