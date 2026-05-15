// src/lib/ai-tools/embedding.ts
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v11.5 OMEGA (Aura Mega 768-dim Aligned)
 * ENGINE: Google Gemini text-embedding-004
 * JURISDICTION: Global Cloud Infrastructure
 * 
 * UPGRADE LOG:
 * 1. DYNAMIC HANDSHAKE: Moved client initialization inside the logic loop to prevent 
 *    top-level environment variable race conditions in Vercel/Next.js.
 * 2. EXPLICIT ALIGNMENT: Hard-coded for the 768-dimension bridge.
 * 3. FORENSIC LOUDNESS: Detailed terminal logging for debugging 0% saturation.
 */

/**
 * generateEmbedding
 * The "Visual Cortex" of Aura. Transforms raw business logic and transaction 
 * logs into 768-dimensional mathematical DNA.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 1. FORENSIC ENVIRONMENT VALIDATION
  // We explicitly target the 'GOOGLE_API_KEY' found in your Vercel Sovereign Vault.
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    console.error("--- AURA CRITICAL NEURAL ALERT ---");
    console.error("SOURCE: src/lib/ai-tools/embedding.ts");
    console.error("ERROR: The 'GOOGLE_API_KEY' environment variable is missing.");
    console.error("ACTION: Verify the key exists in Vercel Settings and is injected into the production build.");
    throw new Error("Aura Security Alert: GOOGLE_API_KEY missing from environment.");
  }

  // 2. TEXT SANITIZATION & DENSITY CHECK
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText || sanitizedText.length < 5) {
    console.warn(`[AURA BRIDGE] Skipping node with insufficient density: "${sanitizedText.substring(0, 20)}..."`);
    throw new Error("Aura Forensic Error: Cannot generate neural link for empty or low-density content.");
  }

  try {
    // 3. SOVEREIGN CLOUD INITIALIZATION
    // We initialize per-call to ensure the latest environment context is used.
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    /**
     * MODEL SELECTION: text-embedding-004
     * This is the definitive engine for 768-dimension vectors.
     * Note: 'embedding-001' is 768, but '004' is the high-precision forensic standard.
     */
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // 4. THE NEURAL HANDSHAKE
    const result = await model.embedContent({
      content: { parts: [{ text: sanitizedText }], role: 'user' },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    const vector = result.embedding.values;

    // 5. DIMENSION AUDIT (THE 768-DIM GUARD)
    // If Google changes the model or returns the wrong size, we stop the bridge immediately.
    if (!vector || vector.length !== 768) {
        const errorMsg = `Dimension Failure: Engine returned size ${vector?.length || 0}, but Aura Database requires exactly 768.`;
        console.error(`[NEURAL COLLAPSE] ${errorMsg}`);
        throw new Error(errorMsg);
    }

    // SUCCESS: Return the vector to the Bridge for database saturation.
    return vector;

  } catch (error: any) {
    // 6. DEEP SYSTEM DIAGNOSTICS (EXECUTIVE GRADE)
    console.error("--- AURA NEURAL HANDSHAKE FAILURE ---");
    console.error(`JURISDICTION: Google AI Studio / text-embedding-004`);
    console.error(`TECHNICAL_FAULT: ${error.message}`);
    
    // Check for specific API Key or Rate Limit errors
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('403')) {
        console.error("DIAGNOSIS: Your GOOGLE_API_KEY is invalid, restricted, or expired.");
    }
    
    if (error.message.includes('429')) {
        console.error("DIAGNOSIS: Rate Limit reached. The business universe is under high load.");
    }

    throw new Error(`Aura Neural Link Interrupted: ${error.message}`);
  }
}

/**
 * STATUS: Neural Visual Cortex Online (v11.5).
 * ENGINE: Cloud-Native Google text-embedding-004.
 * OUTPUT: 768-dim Aligned.
 * 
 * FINAL AUDIT: This file is now "Loud." If it fails, your terminal/logs will 
 * tell you exactly why, ending the 0% saturation mystery.
 */