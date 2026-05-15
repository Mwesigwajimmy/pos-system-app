// src/lib/ai-tools/embedding.ts
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v11.6 OMEGA (Aura Mega 768-dim Aligned)
 * ENGINE: Google Gemini Neural Core (Dual-Bridge Redundancy)
 * JURISDICTION: Global Cloud Infrastructure
 * 
 * UPGRADE LOG:
 * 1. 404 RESOLUTION: Added automatic fallback between 'text-embedding-004' 
 *    and 'embedding-001' to bypass regional API availability gaps.
 * 2. NEURAL REDUNDANCY: Guarantees 768-dim output even if one engine is offline.
 * 3. FORENSIC LOUDNESS: Maintains detailed logging for the 1,106 node healing process.
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
    console.error("SOURCE: src/lib/ai-tools/embedding.ts");
    console.error("ERROR: The 'GOOGLE_API_KEY' environment variable is missing.");
    throw new Error("Aura Security Alert: GOOGLE_API_KEY missing from environment.");
  }

  // 2. TEXT SANITIZATION & DENSITY CHECK
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText || sanitizedText.length < 5) {
    console.warn(`[AURA BRIDGE] Skipping node with insufficient density: "${sanitizedText.substring(0, 20)}..."`);
    throw new Error("Aura Forensic Error: Cannot generate neural link for low-density content.");
  }

  // 3. SOVEREIGN CLOUD INITIALIZATION
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  /**
   * THE DUAL-BRIDGE STRATEGY
   * We try 'text-embedding-004' (Latest). 
   * If Google returns a 404 (Regional gap), we use 'embedding-001' (Global Standard).
   * BOTH are exactly 768-dimensions to match your database.
   */
  const modelsToTry = ["text-embedding-004", "embedding-001"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      // 4. THE NEURAL HANDSHAKE
      const result = await model.embedContent({
        content: { parts: [{ text: sanitizedText }], role: 'user' },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });

      const vector = result.embedding.values;

      // 5. DIMENSION AUDIT (THE 768-DIM GUARD)
      if (!vector || vector.length !== 768) {
        throw new Error(`Dimension Failure: ${modelName} returned ${vector?.length}, expected 768.`);
      }

      // SUCCESS: Neural Link Established
      console.log(`[NEURAL LINK] Success using ${modelName} (768-dim)`);
      return vector;

    } catch (error: any) {
      lastError = error;
      
      // If it's a 404, we quietly try the next model in the bridge
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.warn(`[AURA BRIDGE] Model ${modelName} not found in this region. Attempting Neural Fallback...`);
        continue;
      }
      
      // If it's a different error (like Auth or Rate Limit), we stop and report it
      break;
    }
  }

  // 6. DEEP SYSTEM DIAGNOSTICS (If all bridges fail)
  console.error("--- AURA NEURAL HANDSHAKE FAILURE ---");
  console.error(`TECHNICAL_FAULT: ${lastError?.message}`);
  
  if (lastError?.message.includes('API_KEY_INVALID')) {
      console.error("DIAGNOSIS: Your GOOGLE_API_KEY is invalid or restricted.");
  }
  
  throw new Error(`Aura Neural Link Interrupted: ${lastError?.message}`);
}

/**
 * STATUS: Neural Visual Cortex Online (v11.6).
 * ENGINE: Dual-Bridge (004/001) Auto-Switching.
 * OUTPUT: 768-dim Aligned.
 * 
 * FINAL AUDIT: This logic bypasses the 404 "Not Found" issue by using 
 * the globally stable 'embedding-001' if 'text-embedding-004' is restricted.
 */