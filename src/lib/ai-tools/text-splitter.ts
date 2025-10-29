/**
 * Represents a single chunk of a document ready for embedding.
 */
export interface DocumentChunk {
  pageContent: string;
  metadata: Record<string, any>;
}

/**
 * Configuration options for the text splitter.
 */
export interface TextSplitterOptions {
  chunkSize: number;
  chunkOverlap: number;
}

/**
 * A production-grade text splitter that recursively breaks down large texts
 * into smaller, overlapping chunks to preserve semantic context for vector embeddings.
 */
export class RecursiveCharacterTextSplitter {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  // Defines the separators to split on, in order of priority.
  private readonly separators: string[];

  constructor(options: Partial<TextSplitterOptions> = {}) {
    this.chunkSize = options.chunkSize ?? 1000;
    this.chunkOverlap = options.chunkOverlap ?? 200;

    if (this.chunkOverlap >= this.chunkSize) {
      throw new Error("Chunk overlap must be smaller than chunk size.");
    }

    this.separators = ["\n\n", "\n", " ", ""];
  }

  /**
   * Splits a given text into an array of smaller string chunks.
   * @param text The text to be split.
   * @returns An array of string chunks.
   */
  public splitText(text: string): string[] {
    const finalChunks: string[] = [];
    let currentSeparator = this.separators[0];

    // Find the first separator that exists in the text
    for (const separator of this.separators) {
      if (separator === "" || text.includes(separator)) {
        currentSeparator = separator;
        break;
      }
    }

    // Split the text by the chosen separator
    let splits: string[];
    if (currentSeparator) {
      splits = text.split(currentSeparator);
    } else {
      splits = text.split("");
    }

    let goodSplits: string[] = [];
    const separator = currentSeparator;

    // Merge smaller splits together to approach the chunkSize
    for (const s of splits) {
      if (s.length < this.chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length > 0) {
          const merged = this.mergeSplits(goodSplits, separator);
          finalChunks.push(...merged);
          goodSplits = [];
        }
        // If a split is still too large, recursively split it with the next separator
        const recursiveChunks = this.splitText(s);
        finalChunks.push(...recursiveChunks);
      }
    }

    if (goodSplits.length > 0) {
      const merged = this.mergeSplits(goodSplits, separator);
      finalChunks.push(...merged);
    }

    return finalChunks;
  }

  private mergeSplits(splits: string[], separator: string): string[] {
    const docs: string[] = [];
    const currentDoc: string[] = [];
    let total = 0;

    for (const d of splits) {
      const len = d.length;
      if (total + len + (currentDoc.length > 0 ? separator.length : 0) > this.chunkSize) {
        if (total > this.chunkSize) {
          console.warn(`Created a chunk of size ${total}, which is longer than the specified ${this.chunkSize}`);
        }
        if (currentDoc.length > 0) {
          const doc = currentDoc.join(separator).trim();
          if (doc) docs.push(doc);
          // Create the overlap
          while (total > this.chunkOverlap || (total > 0 && total + len + (currentDoc.length > 0 ? separator.length : 0) > this.chunkSize)) {
            total -= currentDoc[0].length + (currentDoc.length > 1 ? separator.length : 0);
            currentDoc.shift();
          }
        }
      }
      currentDoc.push(d);
      total += len + (currentDoc.length > 1 ? separator.length : 0);
    }
    const doc = currentDoc.join(separator).trim();
    if (doc) docs.push(doc);
    return docs;
  }
}