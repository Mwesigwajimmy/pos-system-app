// src/lib/ai-tools/embedding.ts
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

/**
 * --- AURA MEGA NEURAL ALIGNMENT ---
 * ENGINE: Google Gemini text-embedding-004
 * OUTPUT: 768-Dimension Forensic Precision.
 */

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

export async function generateEmbedding(text: string): Promise<number[]> {
  const sanitizedText = text.replace(/\n/g, ' ').trim();
  
  if (!sanitizedText) {
    throw new Error("Aura Forensic Error: Empty text content.");
  }

  if (!GEMINI_API_KEY && typeof window === 'undefined') {
    throw new Error("Aura Security Alert: GOOGLE_API_KEY missing.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const result = await model.embedContent({
      content: { parts: [{ text: sanitizedText }], role: 'user' },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    const vector = result.embedding.values;

    // DEEP AUDIT LOG: Remove in high-scale production, keep for migration.
    // console.log(`[NEURAL LINK] Generated ${vector.length} dimensions.`);

    if (!vector || vector.length !== 768) {
        throw new Error(`Dimension Failure: Engine returned ${vector?.length || 0} instead of 768.`);
    }

    return vector;

  } catch (error: any) {
    console.error("--- AURA NEURAL FAILURE ---");
    console.error(`MODEL: text-embedding-004 | ERROR: ${error.message}`);
    throw new Error(`Aura Neural Link Interrupted: ${error.message}`);
  }
}