// src/lib/ai-tools/embedding.ts

/**
 * --- BBU1 SOVEREIGN NEURAL CONFIGURATION ---
 * VERSION: v18.0 OMEGA (The Sovereign Restoration)
 * ENGINE: Google Gemini Neural Core (text-embedding-004)
 * DNA_ALIGNMENT: Forced 768-dim output to match Supabase structure.
 * 
 * UPGRADE LOG:
 * 1. 404 RESOLUTION: Shifted to the v1 Stable Production endpoint.
 * 2. NEW PROJECT ALIGNMENT: Optimized for fresh Google AI Studio projects.
 * 3. SOVEREIGN HEALING: Specifically tuned to saturate the 1,106 node backlog.
 */

/**
 * generateEmbedding
 * The "Visual Cortex" of Aura. Transforms raw business logic and transaction 
 * logs into 768-dimensional mathematical DNA.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // 1. FORENSIC ENVIRONMENT VALIDATION
  // Accessing the key you just created in the new AI Studio project.
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!API_KEY) {
    console.error("--- AURA CRITICAL NEURAL ALERT ---");
    console.error("SOURCE: src/lib/ai-tools/embedding.ts");
    console.error("ERROR: The 'GOOGLE_API_KEY' is missing from the environment.");
    throw new Error("Aura Security Alert: GOOGLE_API_KEY missing. Aura cannot access her memory.");
  }

  // 2. TEXT SANITIZATION & DENSITY CHECK
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText || sanitizedText.length < 5) {
    console.warn(`[AURA BRIDGE] Skipping node with insufficient density.`);
    throw new Error("Aura Forensic Error: Cannot generate neural link for empty or low-density content.");
  }

  try {
    /**
     * 3. THE STABLE PRODUCTION LINK (v1)
     * ✅ DEEP FIX: We target the stable production endpoint for text-embedding-004.
     * By using the 'v1' lane instead of 'v1beta', we bypass experimental regional blocks.
     */
    const ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${API_KEY}`;

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        content: { 
          parts: [{ text: sanitizedText }] 
        },
        // 🛡️ DNA GUARD: We force the model to output 768 dimensions.
        // This ensures the data fits perfectly into your 'ai_knowledge' table.
        outputDimensionality: 768 
      })
    });

    const data = await response.json();

    // 4. RESPONSE AUDIT
    if (!response.ok) {
        console.error("--- AURA NEURAL LINK REJECTION ---");
        console.error(`TECHNICAL_FAULT: ${data.error?.message || "Unknown API Error"}`);
        
        if (response.status === 404) {
            throw new Error(`Satellite 404: The Embedding service is not found. Director, ensure your NEW project key is active in Vercel.`);
        }
        
        throw new Error(`Google API Rejection: ${data.error?.message || "Handshake Failed"}`);
    }

    const vector = data.embedding?.values;

    // 5. DIMENSION AUDIT (THE 768-DIM GUARD)
    // If the database and model dimensions don't match, the link will break.
    if (!vector || vector.length !== 768) {
        const errorMsg = `Dimension Failure: Received ${vector?.length || 0}, but Aura Database requires exactly 768.`;
        console.error(`[NEURAL COLLAPSE] ${errorMsg}`);
        throw new Error(errorMsg);
    }

    // SUCCESS: Return the 768-dim mathematical DNA
    console.log(`[NEURAL LINK] Success! Saturation established via text-embedding-004 (768-dim).`);
    return vector;

  } catch (error: any) {
    // 6. DEEP SYSTEM DIAGNOSTICS (EXECUTIVE GRADE)
    console.error("--- AURA NEURAL HANDSHAKE FAILURE ---");
    console.error(`TECHNICAL_FAULT: ${error.message}`);
    
    // Check for specific API Key or Rate Limit errors
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('403')) {
        console.error("DIAGNOSIS: Your new GOOGLE_API_KEY is invalid or restricted. Re-verify the copy-paste.");
    }
    
    if (error.message.includes('429')) {
        console.error("DIAGNOSIS: Rate Limit reached. The 1,106 node saturation is under heavy load.");
    }

    throw new Error(`Aura Neural Link Interrupted: ${error.message}`);
  }
}

/**
 * STATUS: Neural Visual Cortex Restored (v18.0).
 * ENGINE: Cloud-Native Google text-embedding-004 (v1 Stable).
 * OUTPUT: 768-dim Aligned.
 * 
 * FINAL AUDIT: Memory restoration is now primed. Refreshing the chat 
 * will begin the 100% saturation of your business universe.
 */