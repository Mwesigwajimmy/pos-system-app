// src/lib/email.ts
'use server';

import { SESClient, SendEmailCommand, SendEmailCommandInput } from "@aws-sdk/client-ses";

// --- Constants (Shared from actions.ts) ---
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const EMAIL_SOURCE = process.env.EMAIL_SOURCE || "Aura <no-reply@bbu1.com>"; // Using your domain for professionalism

// Initialize AWS SES Client
const sesClient = new SESClient({
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID || 'MOCK_KEY',
        secretAccessKey: AWS_SECRET_ACCESS_KEY || 'MOCK_SECRET',
    },
});

interface EmailContent {
    to: string;
    subject: string;
    bodyHtml: string;
}

/**
 * The single, revolutionary function for sending all system emails via AWS SES.
 * All other parts of the application should call this.
 * 
 * @param content The recipient, subject, and HTML body of the email.
 * @returns A promise that resolves if the email is successfully queued.
 * @throws An error if SES is not configured or the API call fails.
 */
export async function sendSystemEmail(content: EmailContent): Promise<void> {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
        throw new Error("AWS SES is not configured in environment variables. Cannot send email.");
    }
    
    const sendEmailCommand: SendEmailCommandInput = {
        Source: EMAIL_SOURCE,
        Destination: { ToAddresses: [content.to] },
        Message: {
            Subject: { Data: content.subject },
            Body: { Html: { Data: content.bodyHtml } },
        },
    };

    try {
        await sesClient.send(new SendEmailCommand(sendEmailCommand));
    } catch (error) {
        console.error("AWS SES failed to send email:", error);
        throw new Error("Failed to send email via AWS SES. Check SES quota and configuration.");
    }
}