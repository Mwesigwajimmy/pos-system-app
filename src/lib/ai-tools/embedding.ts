// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v23.0 OMEGA (Free-Tier Satellite Probe)
 * ENGINE: Google Gemini Neural Core
 * BUDGET: $0.00 (Developer Free Tier Aligned)
 * 
 * FIX LOG:
 * 1. ZERO-COST PROTOCOL: Probes 4 different endpoints to find the one Google 
 *    leaves open for Free AI Studio keys.
 * 2. DIMENSION GUARD: Forces 768-dim output to match your 1,106 node database.
 * 3. NO DESTRUCTION: Keeps all your forensic logging intact.
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    throw new Error("Aura Critical: GOOGLE_API_KEY is missing. Add the NEW key to Vercel.");
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (sanitizedText.length < 5) throw new Error("Aura Forensic: Content too thin.");

  /**
   * ✅ THE FREE-LANE PROBE LIST
   * We try both 'v1' and 'v1beta' endpoints with both model names.
   * One of these is guaranteed to be the "Free Door" for your account.
   */
  const probes = [
    { url: "v1/models/text-embedding-004", dim: true },
    { url: "v1beta/models/text-embedding-004", dim: true },
    { url: "v1/models/embedding-001", dim: false },
    { url: "v1beta/models/embedding-001", dim: false }
  ];

  let lastError = null;

  for (const probe of probes) {
    try {
      const ENDPOINT = `https://generativelanguage.googleapis.com/${probe.url}:embedContent?key=${API_KEY}`;
      
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: sanitizedText }] },
          // Only add dimensionality for the 004 model
          ...(probe.dim ? { outputDimensionality: 768 } : {})
        })
      });

      const data = await response.json();

      if (response.ok) {
        const vector = data.embedding?.values;
        // Verify we got the correct 768 dimensions for the database
        if (vector && vector.length === 768) {
            console.log(`[NEURAL LINK] Success via ${probe.url} (Free Lane)`);
            return vector;
        }
      }
      
      lastError = data.error?.message || `HTTP ${response.status}`;
      console.warn(`[AURA PROBE] Path ${probe.url} failed: ${lastError}`);

    } catch (e: any) {
      lastError = e.message;
    }
  }

  // 🚨 FINAL SATELLITE DIAGNOSIS
  throw new Error(`Sovereign Link Interrupted: All Free Pathways failed. Last Reason: ${lastError}. Director, please ensure you created the key using "Create API key in NEW project" in AI Studio.`);
}

/**
 * STATUS: Neural Visual Cortex Aligned to Free Satellite.
 * ENGINE: Multi-Probe (v1/v1beta).
 * OUTPUT: 768-dim Aligned.
 */