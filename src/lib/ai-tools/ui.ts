// src/lib/ai-tools/ui.ts

import { z } from 'zod';
import { Tool } from '../ai-core/tools';

// FIX: Define schemas externally and use typeof for Tool<T> to satisfy the ZodObject constraint

const UINavigationSchema = z.object({
    url: z.string().describe("The relative URL of the page (e.g., '/dashboard/invoices').")
});

export class UINavigationTool extends Tool<typeof UINavigationSchema> {
    name = "navigate_to_page";
    description = "Navigates the user to a specific page or dashboard within the application.";
    schema = UINavigationSchema;

    protected async _execute(input: z.infer<typeof UINavigationSchema>) {
        return JSON.stringify({ action: "navigate", payload: { url: input.url } });
    }
}

const CommunicationDraftSchema = z.object({
    to: z.string().describe("The recipient's identifier or email."),
    subject: z.string().describe("The subject line."),
    body: z.string().describe("The full body content of the draft."),
});

export class CommunicationDraftTool extends Tool<typeof CommunicationDraftSchema> {
    name = "present_communication_draft";
    description = "Presents an editable draft to the user, typically for an email.";
    schema = CommunicationDraftSchema;

    protected async _execute(input: z.infer<typeof CommunicationDraftSchema>) {
        return JSON.stringify({ action: "present_draft", payload: input });
    }
}