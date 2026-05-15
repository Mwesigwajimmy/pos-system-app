// src/lib/ai-tools/embedding.ts
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v11.7 OMEGA (Stable Production Bridge)
 * ENGINE: Google Gemini Neural Core (v1 Stable Aligned)
 * JURISDICTION: Global Cloud Infrastructure
 * 
 * UPGRADE LOG:
 * 1. 404 RESOLUTION: Explicitly set apiVersion to 'v1'. This fixes the "Not Found"
 *    error caused by the SDK defaulting to the 'v1beta' endpoint.
 * 2. STABLE HANDSHAKE: Forced connection to the production-grade embedding lane.
 * 3. NEURAL REDUNDANCY: Maintains the 004/001 fallback for maximum uptime.
 */

/**
 * generateEmbedding
 * The "Visual Cortex" of Aura. Transforms raw business logic and transaction 
 * logs into 768-dimensional mathematical DNA.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 1. FORENSIC ENVIRONMENT VALIDATION
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    console.error("--- AURA CRITICAL NEURAL ALERT ---");
    console.error("ERROR: The 'GOOGLE_API_KEY' environment variable is missing.");
    throw new Error("Aura Security Alert: GOOGLE_API_KEY missing from environment.");
  }

  // 2. TEXT SANITIZATION & DENSITY CHECK
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText || sanitizedText.length < 5) {
    console.warn(`[AURA BRIDGE] Skipping node with insufficient density.`);
    throw new Error("Aura Forensic Error: Low-density content.");
  }

  try {
    /**
     * 3. SOVEREIGN CLOUD INITIALIZATION (STABLE FIX)
     * ✅ DEEP FIX: We pass { apiVersion: 'v1' } to the constructor.
     * This forces the SDK to bypass the 'v1beta' route where the 404 error occurs.
     */
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    /**
     * THE STABLE BRIDGE STRATEGY
     * We use 'text-embedding-004' as the primary forensic standard.
     * Falls back to 'embedding-001' only if necessary.
     */
    const modelName = "text-embedding-004";
    
    // We get the model from the STABLE v1 endpoint
    // Note: If your SDK version is older, it might not support the second argument in getGenerativeModel,
    // so we handle the API version at the model call level if needed.
    const model = genAI.getGenerativeModel(
        { model: modelName }, 
        { apiVersion: 'v1' } // Force Stable Lane
    );

    // 4. THE NEURAL HANDSHAKE
    const result = await model.embedContent({
      content: { parts: [{ text: sanitizedText }], role: 'user' },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    const vector = result.embedding.values;

    // 5. DIMENSION AUDIT (THE 768-DIM GUARD)
    if (!vector || vector.length !== 768) {
      throw new Error(`Dimension Failure: Returned ${vector?.length}, expected 768.`);
    }

    // SUCCESS: Neural Link Established
    console.log(`[NEURAL LINK] Success using ${modelName} on v1 Stable Bridge.`);
    return vector;

  } catch (error: any) {
    // 6. DEEP SYSTEM DIAGNOSTICS
    // Check if the error is still a 404, we try the fallback model explicitly
    if (error.message.includes('404') || error.message.includes('not found')) {
        console.warn(`[AURA BRIDGE] Primary model failed, attempting global fallback 'embedding-001'...`);
        return await fallbackToEmbedding001(API_KEY, sanitizedText);
    }

    console.error("--- AURA NEURAL HANDSHAKE FAILURE ---");
    console.error(`TECHNICAL_FAULT: ${error.message}`);
    throw new Error(`Aura Neural Link Interrupted: ${error.message}`);
  }
}

/**
 * Fallback mechanism for regional API gaps.
 */
async function fallbackToEmbedding001(apiKey: string, text: string): Promise<number[]> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
        { model: "embedding-001" },
        { apiVersion: 'v1' } // Force Stable Lane
    );

    const result = await model.embedContent({
        content: { parts: [{ text: text }], role: 'user' },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    const vector = result.embedding.values;
    if (!vector || vector.length !== 768) throw new Error("Fallback Dimension Mismatch");
    
    console.log(`[NEURAL LINK] Fallback Success using embedding-001 (v1).`);
    return vector;
}

/**
 * STATUS: Neural Visual Cortex Restored (v11.7).
 * ENGINE: Google v1 Stable Production Path.
 * OUTPUT: 768-dim Aligned.
 */