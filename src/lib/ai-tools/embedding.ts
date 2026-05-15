// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v15.0 OMEGA (The Investigator / Model Discovery)
 * ENGINE: Dynamic Discovery
 * 
 * FIX LOG:
 * 1. 404 RESOLUTION: If the model is not found, the system now automatically 
 *    queries Google for the "Allowed Model List" to find the correct naming.
 * 2. REGIONAL ADAPTATION: Specifically tuned for AI Studio keys in restricted regions.
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    throw new Error("Aura Critical: GOOGLE_API_KEY is missing. Check your .env file.");
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (sanitizedText.length < 5) throw new Error("Aura Forensic: Low-density content.");

  // ✅ THE DISCOVERY STRATEGY
  // We try the most likely stable name for 2026.
  const primaryModel = "models/text-embedding-004";

  try {
    const ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${primaryModel.replace('models/', '')}:embedContent?key=${API_KEY}`;
    
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
      return data.embedding.values;
    }

    // 🚨 IF 404, INITIATE DEEP PROBE
    if (response.status === 404) {
        return await discoverAvailableModels(API_KEY, sanitizedText);
    }

    throw new Error(data.error?.message || "API Rejected Connection");

  } catch (error: any) {
    throw new Error(`Sovereign Link Interrupted: ${error.message}`);
  }
}

/**
 * DEEP PROBE: Queries Google for every model this specific key can see.
 */
async function discoverAvailableModels(apiKey: string, text: string): Promise<number[]> {
    const LIST_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    
    try {
        const response = await fetch(LIST_ENDPOINT);
        const data = await response.json();
        
        if (!data.models) {
            throw new Error("Google returned no models for this key. Verify 'Generative Language API' is ENABLED.");
        }

        // Find anything that supports embeddings
        const validModels = data.models
            .filter((m: any) => m.supportedGenerationMethods.includes('embedContent'))
            .map((m: any) => m.name);

        if (validModels.length === 0) {
            throw new Error(`Model Discovery Failed. Your key has access to these models: ${data.models.map((m:any)=>m.name).join(', ')}, but NONE support embeddings.`);
        }

        // Try the first valid embedding model found
        const discoveryModel = validModels[0];
        console.log(`[NEURAL DISCOVERY] Found valid model: ${discoveryModel}. Attempting link...`);

        const RETRY_ENDPOINT = `https://generativelanguage.googleapis.com/v1/${discoveryModel}:embedContent?key=${apiKey}`;
        const retryRes = await fetch(RETRY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: { parts: [{ text: text }] },
                outputDimensionality: 768
            })
        });

        const retryData = await retryRes.json();
        if (retryRes.ok) return retryData.embedding.values;

        throw new Error(`Discovery Match Failed: ${discoveryModel} rejected the request with: ${retryData.error?.message}`);

    } catch (e: any) {
        throw new Error(`Deep Satellite Failure: ${e.message}`);
    }
}