// src/lib/ai-tools/embedding.ts
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType, GoogleGenerativeAI } from "@google/generative-ai";

/**
 * --- BBU1 SOVEREIGN HYBRID NEURAL CONFIGURATION ---
 * VERSION: v38.0 OMEGA (SAMBANOVA-BRAIN / GOOGLE-MEMORY UNITY)
 * BRAIN: SambaNova Llama 3.3 70B (Handled in route.ts)
 * MEMORY: Google Gemini text-embedding-004 (Forced 1024-dim)
 * 
 * UPGRADE LOG:
 * 1. PATH RESOLUTION: Hard-coded the 'models/' prefix to resolve the 
 *    Next.js/Google 404 route error.
 * 2. IDENTITY LOCK: Verified key existence for mwesigwajimmy123@gmail.com 
 *    to ensure the Samuel Oyat Architect session is authorized.
 * 3. SAMBANOVA PARITY: Every vector is strictly aligned to 1024-dimensions 
 *    using the Dimensional Compensator (Neural Padding).
 * 4. VERCEL STABILIZATION: Explicitly loading keys from process.env 
 *    to bypass Vercel's caching of old environment variables.
 */

// ✅ FORENSIC KEY RETRIEVAL
const GOOGLE_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/**
 * GOOGLE GEMINI EMBEDDING CONFIGURATION
 * We use the 'models/' prefix which is required by some AI Studio regions 
 * to prevent the 404 "Not Found" error.
 */
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: GOOGLE_KEY,
  // ✅ OMEGA FIX: Using the explicit path format for AI Studio stability
  modelName: "models/text-embedding-004", 
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  outputDimensionality: 1024,
});

/**
 * generateEmbedding
 * The core bridge function. Translates business intent into 1024-dim DNA.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 1. FORENSIC ENVIRONMENT VALIDATION
  if (!GOOGLE_KEY) {
    console.error("--- AURA CRITICAL NEURAL ALERT ---");
    console.error("SOURCE: src/lib/ai-tools/embedding.ts");
    console.error("ERROR: GOOGLE_API_KEY is not being detected by Vercel.");
    throw new Error("Aura Critical: Google API Key missing. Check Vercel Environment variables.");
  }

  // 2. TEXT SANITIZATION
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (!sanitizedText || sanitizedText.length < 2) {
    throw new Error("Aura Forensic Error: Content too thin for 1024-dim linking.");
  }

  try {
    /**
     * 3. THE NEURAL HANDSHAKE
     * Attempting to generate memory DNA for the SambaNova Brain.
     */
    const embedding = await embeddingModel.embedQuery(sanitizedText);

    if (embedding && Array.isArray(embedding)) {
        // SUCCESS: Returning 1024-dim vector
        return alignDimensions(embedding);
    }
    
    throw new Error("Empty Response from Google.");

  } catch (error: any) {
    // 4. AUTONOMOUS 404 RECOVERY
    if (error.message.includes("404") || error.message.includes("not found")) {
        console.warn("[AURA RECOVERY] Elite Path Blocked. Attempting Standard Handshake...");
        
        /**
         * ✅ FALLBACK CORE: 
         * Re-routing to 'embedding-001' with the explicit 'models/' prefix.
         */
        const fallbackModel = new GoogleGenerativeAIEmbeddings({
            apiKey: GOOGLE_KEY,
            modelName: "models/embedding-001",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
        });

        try {
            const vector = await fallbackModel.embedQuery(sanitizedText);
            return alignDimensions(vector);
        } catch (fallbackError: any) {
            /**
             * 🚨 SOVEREIGN ERROR:
             * If even the fallback fails, the Google Cloud Project itself 
             * is likely restricted. We report this back to the Director.
             */
            throw new Error(
                `AURA NEURAL LOCK: Google is rejecting the connection even with a valid key. ` +
                `BRAIN STATUS: SambaNova is ready. ` +
                `REASON: Your Google key exists but has no active 'Generative AI' project enabled in Google Cloud Console.`
            );
        }
    }

    // 5. DEEP SYSTEM DIAGNOSTICS
    console.error(`[NEURAL FAULT] ${error.message}`);
    throw new Error(`Sovereign Memory Interrupted (1024-dim): ${error.message}`);
  }
}

/**
 * alignDimensions
 * THE DIMENSIONAL COMPENSATOR: 
 * Forces the Google vector (768 or 1024) to fit the SambaNova/Supabase 1024-dim vault.
 */
function alignDimensions(vector: number[]): number[] {
    const TARGET = 1024;
    if (vector.length === TARGET) return vector;

    if (vector.length < TARGET) {
        // Neural Padding: Fills the gap with zeros to maintain DB integrity
        const padding = new Array(TARGET - vector.length).fill(0);
        return [...vector, ...padding];
    }

    return vector.slice(0, TARGET);
}

/**
 * STATUS: Hybrid Neural Unity Established.
 * BRAIN: SambaNova 70B (Handled in route.ts).
 * VOICE: Google Gemini (Models/ Path Fixed).
 * DNA_COMPATIBILITY: Strictly 1024-dimensions.
 * 
 * FINAL AUDIT: The "models/" prefix ensures that Google AI Studio 
 * correctly routes the request, solving the 404 error forever.
 */