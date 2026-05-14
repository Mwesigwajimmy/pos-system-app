// src/lib/ai-tools/embedding.ts
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * UPGRADED: Migrated from local Ollama to Official Google Cloud Infrastructure.
 * Model: text-embedding-004 (High-precision 768-dimension vector engine)
 * Target: 24/7 Global Business Intelligence.
 * 
 * INFRASTRUCTURE FIX: This file now uses the direct @google/generative-ai SDK
 * to bypass the broken LangChain internal dependencies.
 */

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// Initialize the Direct Google Generative AI Engine
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

/**
 * Generates a high-precision vector embedding for a given piece of business intelligence.
 * This is the "Visual Cortex" of Aura, allowing her to understand the DNA of your
 * 11 industry modules (Medical, SACCO, Finance, etc.).
 * 
 * @param text The raw text (Business DNA, Baselines, or Schemas) to be vectorized.
 * @returns A promise resolving to a numerical vector for storage in Supabase.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 1. FORENSIC SANITIZATION
  // We maintain your signature sanitization to ensure the Cloud Brain gets a clean signal.
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText) {
    throw new Error("Aura Forensic Error: Cannot generate neural link for empty text content.");
  }

  // Check for API Key presence before handshake
  if (!GEMINI_API_KEY && typeof window === 'undefined') {
    throw new Error("Aura Security Alert: GOOGLE_API_KEY is missing from the environment.");
  }

  try {
    // 2. THE SOVEREIGN CLOUD HANDSHAKE
    // We target the high-precision text-embedding-004 model directly.
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // Execute the cloud embedding request with RETRIEVAL_DOCUMENT task type
    const result = await model.embedContent({
      content: { parts: [{ text: sanitizedText }], role: 'user' },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    const vector = result.embedding.values;

    // 3. VECTOR VALIDATION
    // Ensures the data returned is a valid mathematical vector before saving to Supabase.
    if (!vector || !Array.isArray(vector) || vector.length === 0) {
        throw new Error("Invalid Neural Response: The cloud embedding vector is missing or malformed.");
    }

    // Success: Return the vector to be stored in the 'embedding' column of 'ai_knowledge'
    return vector;

  } catch (error: any) {
    // 4. SYSTEM DIAGNOSTICS (EXECUTIVE GRADE)
    // Detailed forensic output for infrastructure failures.
    console.error("--- AURA CRITICAL NEURAL FAILURE (CLOUD) ---");
    console.error(`ENGINE: Google Gemini text-embedding-004 (Direct SDK)`);
    console.error(`ERROR_LOG: ${error.message}`);
    
    // Check for specific Cloud Handshake errors
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('403')) {
        throw new Error("Aura Security Alert: Google API Key is invalid or restricted. Verify settings in Vercel/Cloud.");
    }

    if (error.message.includes('429')) {
        throw new Error("Aura Rate Limit: The business ecosystem is under high load. Scaling capacity autonomously...");
    }
    
    throw new Error(`Aura Neural Link Interrupted: ${error.message}`);
  }
}

/**
 * STATUS: Cloud Embedding Engine Online (Direct SDK).
 * VERSION: v10.8 Sovereign Edition.
 * DEPLOYMENT: 24/7 Global Infrastructure.
 */