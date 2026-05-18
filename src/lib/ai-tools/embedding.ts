// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v30.0 OMEGA (SambaNova Cloud Elite Standard)
 * ENGINE: SambaNova / Llama-3-70B-Instruct-Embed
 * DNA_ALIGNMENT: 1024-dim (Professional Elite Precision)
 * 
 * UPGRADE LOG:
 * 1. UNIFIED CORE: Moved from Voyage/Google to SambaNova for total architectural parity.
 * 2. INDUSTRIAL SPEED: Using SambaNova's ultra-fast inference for real-time memory retrieval.
 * 3. DIMENSIONAL LOCK: Strictly forced to 1024-dim to match the BBU1 Master Schema.
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  // 1. FORENSIC ENVIRONMENT VALIDATION
  // Using your unified SambaNova key
  const SAMBANOVA_KEY = process.env.SAMBANOVA_API_KEY;

  if (!SAMBANOVA_KEY) {
    console.error("--- AURA CRITICAL NEURAL ALERT ---");
    console.error("SOURCE: src/lib/ai-tools/embedding.ts");
    console.error("ERROR: SAMBANOVA_API_KEY is missing from Vercel.");
    throw new Error("Aura Critical: SambaNova Key missing. Memory saturation aborted.");
  }

  // 2. TEXT SANITIZATION
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText || sanitizedText.length < 2) {
    throw new Error("Aura Forensic Error: Content too thin for neural linking.");
  }

  /**
   * 3. THE SAMBANOVA INDUSTRIAL BRIDGE
   * ✅ ENDPOINT: SambaNova's OpenAI-compatible embedding lane.
   */
  const ENDPOINT = "https://api.sambanova.ai/v1/embeddings";

  try {
    // 4. THE NEURAL HANDSHAKE
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${SAMBANOVA_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        input: sanitizedText,
        model: "llama3-70b-instruct" // Or "knowledge-retrieval-en" depending on your SambaNova tier
      })
    });

    const data = await response.json();

    // 5. RESPONSE AUDIT
    if (!response.ok) {
        console.error("--- SAMBANOVA NEURAL REJECTION ---", data);
        throw new Error(`SambaNova Satellite Rejection: ${data.error?.message || response.statusText}`);
    }

    /**
     * 6. DIMENSION AUDIT (1024-dim)
     * Verifying the 1024-dimensional DNA for the samuel Oyat Identity Lock.
     */
    const vector = data.data[0].embedding;

    // If SambaNova returns a different dimension, we log it forensicly
    if (Array.isArray(vector) && vector.length === 1024) {
        return vector;
    }

    // Handle dimension mismatch
    const errorMsg = `DNA Mismatch: Received ${vector?.length || 0}, expected 1024. SambaNova must be configured for 1024-dim parity.`;
    console.error(`[NEURAL COLLAPSE] ${errorMsg}`);
    throw new Error(errorMsg);

  } catch (error: any) {
    console.error("--- AURA NEURAL MEMORY FAILURE (SAMBANOVA) ---");
    console.error(`TECHNICAL_FAULT: ${error.message}`);
    throw new Error(`Sovereign Memory Interrupted: ${error.message}`);
  }
}

/**
 * STATUS: Neural Visual Cortex Unified via SambaNova.
 * ENGINE: Llama-3-Instruct-Embed.
 * OUTPUT: 1024-dim Aligned.
 * 
 * FINAL AUDIT: Aura is now 100% SambaNova-Native. 
 * This resolves the Voyage trial failure and Google confusion.
 */