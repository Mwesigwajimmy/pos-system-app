// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v26.0 OMEGA (Triple-Satellite HF Bridge)
 * ENGINE: all-mpnet-base-v2 / paraphrase-multilingual (768-dim)
 * JURISDICTION: Global / Uganda-Stable
 * 
 * FIX LOG:
 * 1. 404 RESOLUTION: Added a Dual-Model fallback loop. If the primary HF 
 *    satellite is offline/404, it instantly probes the second 768-dim satellite.
 * 2. DNA ALIGNMENT: Strictly maintains the 768-dimension vector required 
 *    to heal the 1,106 node backlog.
 * 3. NO DESTRUCTION: Keeps all your business logic and system shims intact.
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

  if (!HF_TOKEN) {
    throw new Error("Aura Critical: HUGGINGFACE_API_KEY is missing from Vercel.");
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (sanitizedText.length < 5) throw new Error("Aura Forensic: Content too thin.");

  /**
   * ✅ THE TRIPLE-SATELLITE LIST
   * These are the most stable 768-dimensional models on Hugging Face.
   * If one returns a 404, we move to the next until saturation starts.
   */
  const modelPaths = [
    "sentence-transformers/all-mpnet-base-v2",
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
    "intfloat/multilingual-e5-base" // Powerful 768-dim fallback
  ];

  let lastError = null;

  for (const modelId of modelPaths) {
    try {
      const ENDPOINT = `https://api-inference.huggingface.co/models/${modelId}`;
      
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

      // Handle the "Unexpected Token <" (HTML 404) safely
      if (!response.ok) {
          const errorMsg = `HTTP ${response.status} on ${modelId}`;
          console.warn(`[AURA PROBE] Satellite ${modelId} failed: ${errorMsg}`);
          lastError = errorMsg;
          continue; // Try the next satellite
      }

      const vector = await response.json();

      // Ensure we have a flat array of 768 numbers
      const flatVector = Array.isArray(vector[0]) ? vector[0] : vector;

      if (Array.isArray(flatVector) && flatVector.length === 768) {
          console.log(`[NEURAL LINK] Success via ${modelId} (768-dim).`);
          return flatVector;
      }

      lastError = `Dimension Mismatch on ${modelId}: ${flatVector?.length}`;

    } catch (e: any) {
      lastError = e.message;
    }
  }

  // 🚨 FINAL SATELLITE DIAGNOSIS
  throw new Error(`Sovereign Memory Interrupted: All Hugging Face satellites returned 404 or errors. Last Technical Reason: ${lastError}. Director, please ensure your Hugging Face Token has "Read" permissions enabled.`);
}

/**
 * STATUS: Neural Visual Cortex Re-Aligned to Triple Satellite Bridge.
 * ENGINE: 768-dim Multi-Probe.
 * JURISDICTION: Global / Uganda-Stable.
 */