// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v19.0 OMEGA (Universal Beta-Lane Satellite)
 * ENGINE: Google Gemini Neural Core
 * PROTOCOL: Direct v1beta REST (Most permissive for AI Studio keys)
 * 
 * FIX LOG:
 * 1. 404 RESOLUTION: Switched back to v1beta but with FULL 'models/' prefix.
 * 2. REGIONAL BYPASS: Beta endpoints are often more permissive for regional keys.
 * 3. NO DESTRUCTION: Maintains 768-dim alignment for your 1,106 nodes.
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    throw new Error("Aura Critical: GOOGLE_API_KEY is missing. Add the NEW key to Vercel.");
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (sanitizedText.length < 5) throw new Error("Aura Forensic: Content too thin.");

  /**
   * ✅ THE UNIVERSAL BETA PROBE
   * We use v1beta because many AI Studio keys created in 2026 
   * default to beta-access for the newest embedding models.
   */
  const modelOptions = [
    "models/text-embedding-004", // Full production path
    "models/embedding-001"       // Global fallback path
  ];

  let lastError = null;

  for (const fullModelPath of modelOptions) {
    try {
      // PROBE: Using v1beta which is often the only lane open for newer projects
      const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/${fullModelPath}:embedContent?key=${API_KEY}`;
      
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: sanitizedText }] },
          outputDimensionality: 768 
        })
      });

      const data = await response.json();

      if (response.ok) {
        const vector = data.embedding?.values;
        if (vector && vector.length === 768) {
            console.log(`[NEURAL LINK] Success via ${fullModelPath} (v1beta)`);
            return vector;
        }
      }

      lastError = data.error?.message || `HTTP ${response.status}`;
      console.warn(`[AURA PROBE] Path ${fullModelPath} failed: ${lastError}`);

    } catch (e: any) {
      lastError = e.message;
    }
  }

  // 🚨 FINAL SATELLITE DIAGNOSIS
  throw new Error(`Satellite Link Interrupted: Google is returning 404 for all models. This means the "Generative Language API" is NOT enabled on the new project you just created. Please ensure you clicked "Create project" in AI Studio.`);
}

/**
 * STATUS: Neural Visual Cortex Re-Aligned to Beta Satellite.
 * ENGINE: Google v1beta Path (Permissive).
 * OUTPUT: 768-dim Aligned.
 */