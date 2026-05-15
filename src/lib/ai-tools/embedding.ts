// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v12.0 OMEGA (Direct REST Sovereign Link)
 * ENGINE: Google Gemini Neural Core
 * PROTOCOL: Direct HTTPS REST (Bypasses SDK 404 issues)
 */

export async function generateEmbedding(text: string): Promise<number[]> {
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    throw new Error("Aura Critical: GOOGLE_API_KEY is missing from environment.");
  }

  const sanitizedText = text.replace(/\n/g, ' ').trim();
  if (sanitizedText.length < 5) throw new Error("Aura Forensic: Low-density content.");

  /**
   * ✅ THE DEEP LINK FIX: Direct REST Call
   * We bypass the SDK entirely and call the Google API directly via HTTPS.
   * This eliminates any "v1beta vs v1" confusion in the library.
   */
  const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${API_KEY}`;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: sanitizedText }] }
      })
    });

    const data = await response.json();

    // If Google returns an error, we capture the DEEP reason
    if (!response.ok) {
        console.error("--- GOOGLE REST REJECTION ---", data);
        const reason = data.error?.message || "Unknown API Restriction";
        
        // If it's a 404, we try the fallback endpoint immediately
        if (response.status === 404) {
            return await secondaryDirectLink(API_KEY, sanitizedText);
        }
        
        throw new Error(`Google REST Rejection: ${reason}`);
    }

    const vector = data.embedding?.values;

    if (!vector || vector.length !== 768) {
      throw new Error(`Dimension Failure: Received ${vector?.length || 0}, expected 768.`);
    }

    return vector;

  } catch (error: any) {
    console.error("--- AURA NEURAL LINK COLLAPSE ---");
    console.error(`TECHNICAL_FAULT: ${error.message}`);
    
    // This message will appear in your bbu1.com/api/chat diagnostic
    throw new Error(`Sovereign Link Interrupted: ${error.message}. Please verify "Generative Language API" is ENABLED in your Google Cloud Console for this project.`);
  }
}

/**
 * SECONDARY DIRECT LINK: Fallback to the legacy endpoint if the 004 model is regionalized.
 */
async function secondaryDirectLink(apiKey: string, text: string): Promise<number[]> {
    const FALLBACK_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`;
    
    const response = await fetch(FALLBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] } })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Deep Satellite Failure: Both primary and fallback models returned 404. Your API Key is valid, but the Embedding API is not enabled for this project.`);
    }

    return data.embedding.values;
}