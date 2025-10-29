import { ChatOllama } from '@langchain/community/chat_models/ollama'; // FIX: Use the configured alias

/**
 * A dedicated, high-performance Ollama model instance for generating text embeddings.
 * It is recommended to use a model specifically fine-tuned for this task.
 * 'nomic-embed-text' is a top-tier, open-source embedding model.
 */
const embeddingModel = new ChatOllama({
  baseUrl: "http://localhost:11434",
  model: "nomic-embed-text"
});

/**
 * Generates a vector embedding for a given piece of text using a local Ollama model.
 * This function is the core of the AI's ability to "understand" and "remember" textual information.
 *
 * @param text The text to be converted into a vector embedding. Cannot be empty.
 * @returns A promise that resolves to an array of numbers representing the vector.
 * @throws An error if the embedding generation fails due to a network issue or an API error.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const sanitizedText = text.replace(/\n/g, ' ');
  if (!sanitizedText) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  try {
    const response = await fetch(`${embeddingModel.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: embeddingModel.model,
        prompt: sanitizedText
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to generate embedding. Status: ${response.status}. Body: ${errorBody}`);
    }

    const data = await response.json();

    if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error("Invalid response from embedding API. The 'embedding' field is missing or not an array.");
    }

    return data.embedding;
  } catch (error) {
    console.error("Embedding generation process failed:", error);
    // Re-throw the error to be handled by the calling tool
    throw error;
  }
}