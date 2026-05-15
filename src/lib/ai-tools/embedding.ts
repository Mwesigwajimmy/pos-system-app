// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v14.0 OMEGA (Universal Stable Bridge)
 * ENGINE: Google Gemini Neural Core
 * PROTOCOL: Triple-Endpoint Handshake (v1 Stable Aligned)
 * 
 * FIX LOG:
 * 1. 404 RESOLUTION: Bypasses the 'v1beta' endpoint failure by forcing 'v1' stable.
 * 2. REGIONAL RESILIENCE: Probes multiple model aliases to find the active Uganda-node.
 * 3. NO DESTRUCTION: Maintains the 768-dim output required for your 1,106 nodes.
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    throw new Error("Aura Critical: GOOGLE_API_KEY is missing from environment.");
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (sanitizedText.length < 5) throw new Error("Aura Forensic: Low-density content.");

  /**
   * ✅ THE UNIVERSAL BRIDGE
   * We try the stable 'v1' lane first. This is the production standard for 2026.
   * Models are tried in order of forensic precision.
   */
  const modelOptions = [
    "text-embedding-004",   // Primary High-Precision
    "embedding-001",        // Stable Legacy
    "gemini-embedding-001"  // 2026 Standard (May require dimensionality force)
  ];

  let lastError = null;

  for (const modelId of modelOptions) {
    try {
      // PROBE: Using the stable v1 endpoint
      const ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${modelId}:embedContent?key=${API_KEY}`;
      
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: sanitizedText }] },
          // Force 768 output in case gemini-embedding-001 is used
          outputDimensionality: 768 
        })
      });

      const data = await response.json();

      if (response.ok) {
        const vector = data.embedding?.values;
        if (vector && (vector.length === 768)) {
            console.log(`[NEURAL LINK] Success! Saturation established via ${modelId} on v1 Stable.`);
            return vector;
        }
      }

      // Capture error for diagnosis if the loop finishes
      lastError = data.error?.message || `HTTP ${response.status}`;
      console.warn(`[AURA PROBE] Endpoint ${modelId} returned: ${lastError}`);

    } catch (e: any) {
      lastError = e.message;
    }
  }

  // 🚨 DEEP SATELLITE FAILURE: If all three fail, we check the beta lane as a last resort.
  return await emergencyBetaLink(API_KEY, sanitizedText, lastError);
}

/**
 * EMERGENCY BETA LINK
 * Only utilized if the stable v1 lane is undergoing maintenance.
 */
async function emergencyBetaLink(apiKey: string, text: string, prevError: string): Promise<number[]> {
    const BETA_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    
    try {
        const response = await fetch(BETA_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: { parts: [{ text }] } })
        });
        const data = await response.json();
        if (response.ok) return data.embedding.values;
        
        throw new Error(data.error?.message || "Final Bridge Collapse");
    } catch (e: any) {
        throw new Error(`Sovereign Link Interrupted: All Neural Pathways (v1 & v1beta) failed. Last Technical Reason: ${prevError}. Director, please verify your Google AI Studio project is not restricted by regional data residency laws.`);
    }
}