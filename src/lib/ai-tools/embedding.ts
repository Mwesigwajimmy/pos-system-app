// src/lib/ai-tools/embedding.ts

/**
 * --- AURA NEURAL CONFIGURATION ---
 * Dynamically resolves the connection to your D: drive Ollama instance.
 * Using 127.0.0.1 bypasses local DNS lookups for maximum speed.
 */
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/"/g, '');
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "nomic-embed-text:latest";

/**
 * Generates a high-precision vector embedding for a given piece of text.
 * This is the "Visual Cortex" of Aura, allowing her to understand business DNA.
 * 
 * @param text The raw text (Business DNA, Baselines, or Schemas) to be vectorized.
 * @returns A promise resolving to a 768 or 1024-dimension numerical vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 1. FORENSIC SANITIZATION
  // We remove newlines and extra spaces to ensure the embedding model gets a clean signal.
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText) {
    throw new Error("Aura Forensic Error: Cannot generate neural link for empty text content.");
  }

  try {
    // 2. THE LOCAL HANDSHAKE
    // We use a direct fetch to the Ollama API for the lowest possible latency.
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: sanitizedText
      })
    });

    // 3. ERROR CAPTURE
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Neural Link Interrupted. Status: ${response.status}. Detail: ${errorBody}`);
    }

    const data = await response.json();

    // 4. VECTOR VALIDATION
    // Ensures the data returned is a valid mathematical vector before saving to Supabase.
    if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error("Invalid Neural Response: The embedding vector is missing or malformed.");
    }

    // Success: Return the vector to be stored in the 'embedding' column
    return data.embedding;

  } catch (error: any) {
    // SYSTEM DIAGNOSTICS
    // If this fails, it usually means Ollama is closed or the D: drive is disconnected.
    console.error("--- AURA CRITICAL NEURAL FAILURE ---");
    console.error(`TARGET_URL: ${OLLAMA_BASE_URL}`);
    console.error(`TARGET_MODEL: ${EMBEDDING_MODEL}`);
    console.error(`ERROR_LOG: ${error.message}`);
    
    // Check for "Connection Refused" - The most common grassroots error
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
        throw new Error("Aura is OFFLINE: Ensure Ollama is running ('ollama serve') on your host machine.");
    }
    
    throw error;
  }
}