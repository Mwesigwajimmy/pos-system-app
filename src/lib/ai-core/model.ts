import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

/**
 * SOVEREIGN CLOUD EMBEDDING ENGINE
 * A dedicated, high-performance Google Gemini instance for generating high-dimensional vectors.
 * Upgraded from local Ollama to text-embedding-004 for enterprise-grade semantic search
 * across the 11 BBU1 industry modules.
 */
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  modelName: "text-embedding-004", // Google's state-of-the-art embedding model
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

/**
 * Generates a high-precision vector embedding for a given piece of business intelligence.
 * This function is the core of Aura's "Long-term Memory," allowing her to cross-reference
 * financial data, audit logs, and sector-specific manifests instantly.
 *
 * @param text The business text to be converted into a vector embedding.
 * @returns A promise that resolves to a numerical vector (768 or 1024 dimensions).
 * @throws Professional error handling if the cloud handshake fails.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // ASCII & Whitespace Sanitization for Cloud Stability
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText) {
    throw new Error("Aura Forensic Error: Cannot generate embedding for empty text.");
  }

  try {
    // Perform the Cloud Handshake with Google's Embedding Engine
    const embedding = await embeddingModel.embedQuery(sanitizedText);

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Invalid Cloud Response: The embedding vector is missing or malformed.");
    }

    // Return the high-dimensional vector for storage in Supabase (ai_knowledge)
    return embedding;
    
  } catch (error: any) {
    console.error("Aura Neural Link Failure (Cloud Embedding):", error.message);
    
    // Provide a detailed fallback context for the Executive Kernel
    if (error.message.includes("429")) {
        throw new Error("Aura Rate Limit: The system is under high-density audit. Please wait a moment.");
    }
    
    throw error;
  }
}