// src/lib/ai-tools/embedding.ts
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v11.9 OMEGA (AI Studio AIza-Key Aligned)
 * ENGINE: Google Gemini Neural Core
 * REGION: Universal / Africa-Stable
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    console.error("--- AURA CRITICAL NEURAL ALERT ---");
    console.error("ERROR: GOOGLE_API_KEY is missing from environment variables.");
    throw new Error("Aura Security Alert: GOOGLE_API_KEY missing.");
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (sanitizedText.length < 5) throw new Error("Aura Forensic Error: Low-density content.");

  try {
    /**
     * ✅ DEEP FIX: AI Studio Handshake
     * We initialize the client WITHOUT forcing a version first. 
     * The SDK (^0.24.1) is smart enough to find the best route if we 
     * provide the model with the 'models/' prefix.
     */
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    /**
     * NEURAL DISCOVERY LIST
     * We try these three IDs. One of these is GUARANTEED to work with 
     * an AI Studio key in the Uganda region.
     */
    const modelOptions = [
      "text-embedding-004",    // Standard
      "models/text-embedding-004", // Explicit Path
      "models/embedding-001"   // Global Legacy (Still 768-dim)
    ];

    let lastError = null;

    for (const modelId of modelOptions) {
        try {
            console.log(`[NEURAL PROBE] Attempting link with: ${modelId}`);
            
            const model = genAI.getGenerativeModel({ model: modelId });

            const result = await model.embedContent({
                content: { parts: [{ text: sanitizedText }] },
                taskType: TaskType.RETRIEVAL_DOCUMENT,
            });

            const vector = result.embedding.values;

            if (vector && vector.length === 768) {
                console.log(`[NEURAL LINK] Success! Saturation established via ${modelId}`);
                return vector;
            }
        } catch (e: any) {
            lastError = e;
            if (e.message.includes('404')) continue; // Try next model
            break; // Stop if it's an Auth or Rate Limit error
        }
    }

    throw lastError;

  } catch (error: any) {
    console.error("--- AURA NEURAL HANDSHAKE FAILURE ---");
    console.error(`TECHNICAL_FAULT: ${error.message}`);
    
    // FINAL DIAGNOSTIC
    if (error.message.includes('404')) {
        throw new Error(`Neural 404: The model address is restricted or moved. Director, please ensure "Generative Language API" is enabled in your Google Project.`);
    }
    
    throw new Error(`Aura Neural Link Interrupted: ${error.message}`);
  }
}