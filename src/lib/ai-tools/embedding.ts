// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v25.0 OMEGA (Bulletproof Hugging Face Bridge)
 * ENGINE: all-mpnet-base-v2 (Forensic Standard)
 * DNA_ALIGNMENT: 768-dim Aligned
 * 
 * FIX LOG:
 * 1. URL CORRECTION: Simplified the endpoint to the standard production path 
 *    to resolve the "Unexpected token <" (HTML 404) error.
 * 2. HANDSHAKE GUARD: Added pre-parsing validation to handle "Cold Starts" 
 *    when the model is waking up in the Hugging Face cloud.
 * 3. NO DESTRUCTION: Maintains all your 1,106 node saturation logic.
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

  if (!HF_TOKEN) {
    throw new Error("Aura Critical: HUGGINGFACE_API_KEY is missing. Verify it is in Vercel Settings.");
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (sanitizedText.length < 5) throw new Error("Aura Forensic: Content too thin.");

  /**
   * ✅ THE STABLE PRODUCTION URL
   * This is the definitive endpoint for feature extraction.
   * It bypasses the 404 HTML error you just saw.
   */
  const MODEL_ID = "sentence-transformers/all-mpnet-base-v2";
  const ENDPOINT = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        inputs: sanitizedText,
        options: { wait_for_model: true } 
      })
    });

    // 🛡️ THE HANDSHAKE GUARD: Capture HTML errors before they crash the system
    if (!response.ok) {
        const errorText = await response.text();
        console.error("--- SATELLITE REJECTION ---", errorText);
        
        if (response.status === 503) {
            throw new Error("Aura's Memory is warming up. Please refresh in 30 seconds.");
        }
        
        throw new Error(`Satellite Rejection: ${response.status} ${response.statusText}`);
    }

    const vector = await response.json();

    /**
     * DIMENSION AUDIT (768-dim)
     * Hugging Face sometimes returns a nested array [[...]]. 
     * We flatten it to ensure it fits your database.
     */
    const flatVector = Array.isArray(vector[0]) ? vector[0] : vector;

    if (Array.isArray(flatVector) && flatVector.length === 768) {
        console.log(`[NEURAL LINK] Success via HF Standard Bridge (768-dim).`);
        return flatVector;
    }

    throw new Error(`DNA Mismatch: Received ${flatVector?.length || 0}, expected 768.`);

  } catch (error: any) {
    console.error("--- AURA NEURAL MEMORY FAILURE ---");
    // This message flows back to bbu1.com/api/chat
    throw new Error(`Sovereign Memory Interrupted: ${error.message}`);
  }
}

/**
 * STATUS: Neural Visual Cortex Re-Aligned to Stable Satellite.
 * ENGINE: all-mpnet-base-v2 (768-dim).
 * JURISDICTION: Global / Uganda-Ready.
 */