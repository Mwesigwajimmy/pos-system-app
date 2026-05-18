// src/lib/ai-tools/embedding.ts
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

/**
 * --- BBU1 SOVEREIGN CLOUD EMBEDDING ENGINE ---
 * VERSION: v32.0 OMEGA (1024-DIM ELITE ALIGNMENT)
 * 
 * A dedicated, high-performance Google Gemini instance for generating high-dimensional vectors.
 * Upgraded to text-embedding-004 for enterprise-grade semantic search 
 * across the 11 BBU1 industry modules.
 * 
 * ✅ OMEGA UPGRADE: Forced 1024-dimension output to ensure parity with the 
 * SambaNova Llama 3.3 reasoning engine and the deep-level database schema.
 */
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  modelName: "text-embedding-004", // Google's state-of-the-art embedding model
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  // ✅ CRITICAL ALIGNMENT: Forcing the engine to output 1024 dimensions 
  // to match SambaNova requirements and the upgraded Supabase 'embedding' column.
  outputDimensionality: 1024,
});

/**
 * Generates a high-precision vector embedding for a given piece of business intelligence.
 * This function is the core of Aura's "Long-term Memory," allowing her to cross-reference
 * financial data, audit logs, and sector-specific manifests instantly.
 *
 * @param text The business text to be converted into a vector embedding.
 * @returns A promise that resolves to a numerical vector (Strictly 1024 dimensions).
 * @throws Professional error handling if the cloud handshake fails.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // ASCII & Whitespace Sanitization for Cloud Stability
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText || sanitizedText.length < 2) {
    throw new Error("Aura Forensic Error: Cannot generate embedding for empty or insufficient text.");
  }

  try {
    // Perform the Cloud Handshake with Google's Embedding Engine
    // This utilizes the outputDimensionality override set above.
    const embedding = await embeddingModel.embedQuery(sanitizedText);

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Invalid Cloud Response: The embedding vector is missing or malformed.");
    }

    /**
     * 🛡️ SOVEREIGN DIMENSION VERIFICATION
     * Ensuring the neural DNA perfectly fits the 1024-dim vault.
     */
    if (embedding.length !== 1024) {
        console.error(`--- DIMENSIONAL PARADOX DETECTED ---`);
        console.error(`Received: ${embedding.length}, Required: 1024`);
        throw new Error(`Neural Mismatch: Google returned ${embedding.length} dims, but SambaNova/Supabase requires 1024.`);
    }

    // SUCCESS: High-density 1024-dimensional vector returned for forensic storage.
    return embedding;
    
  } catch (error: any) {
    console.error("--- AURA NEURAL LINK FAILURE (CLOUD EMBEDDING) ---");
    console.error(`SOURCE: src/lib/ai-tools/embedding.ts`);
    console.error(`TECHNICAL_FAULT: ${error.message}`);
    
    // Provide a detailed fallback context for the Executive Kernel
    if (error.message.includes("429")) {
        throw new Error("Aura Rate Limit: The system is under high-density audit. Please wait a moment.");
    }
    
    throw new Error(`Sovereign Memory Interrupted (1024-dim): ${error.message}`);
  }
}

/**
 * STATUS: Neural Visual Cortex Calibrated to 1024-dim.
 * ENGINE: text-embedding-004 (Upscaled).
 * COMPATIBILITY: SambaNova 70B & Supabase 1024-Vector Aligned.
 * 
 * FINAL AUDIT: Aura is now equipped with the precision required for 
 * World-Class Forensic Auditing.
 */