/**
 * --- BBU1 SOVEREIGN TEXT ARCHITECTURE ---
 * Represents a single high-density chunk of business intelligence ready for neural mapping.
 * Optimized for the 15-year audit retention mandate.
 */
export interface DocumentChunk {
  pageContent: string;
  metadata: Record<string, any> & {
    sector?: 'medical' | 'finance' | 'telecom' | 'logistics';
    timestamp: string;
  };
}

/**
 * Configuration options for the Sovereign Text Splitter.
 * UPGRADED: Chunk sizes tuned for Gemini 1.5 high-precision embeddings.
 */
export interface TextSplitterOptions {
  chunkSize: number;
  chunkOverlap: number;
}

/**
 * RECURSIVE CHARACTER TEXT SPLITTER (EXECUTIVE EDITION)
 * A production-grade engine that recursively breaks down massive ERP datasets
 * into overlapping semantic windows.
 * 
 * This ensures that financial figures, medical diagnoses, and logistics routes 
 * remain contextually linked even after being vectorized.
 */
export class RecursiveCharacterTextSplitter {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  
  // SOVEREIGN SEPARATORS: Ranked by structural importance for BBU1 data exports.
  // We prioritize Double Newlines (paragraphs), then single lines, 
  // then JSON object boundaries, then standard spaces.
  private readonly separators: string[];

  constructor(options: Partial<TextSplitterOptions> = {}) {
    this.chunkSize = options.chunkSize ?? 1200; // Optimized for high-density business text
    this.chunkOverlap = options.chunkOverlap ?? 200;

    if (this.chunkOverlap >= this.chunkSize) {
      throw new Error("Aura Kernel Error: Chunk overlap must be smaller than chunk size.");
    }

    this.separators = ["\n\n", "\n", "},", '",', " ", ""];
  }

  /**
   * PRIMARY SPLIT INTERFACE
   * Breaks down raw business intelligence into a forensic-ready array of string chunks.
   * 
   * @param text The raw ERP data or document text to be split.
   * @returns An array of structural string chunks.
   */
  public splitText(text: string): string[] {
    const finalChunks: string[] = [];
    
    // 1. NEURAL SCAN: Determine the most appropriate separator for this specific sector data.
    let currentSeparator = this.separators[this.separators.length - 1];
    for (const separator of this.separators) {
      if (separator === "") {
        currentSeparator = separator;
        break;
      }
      if (text.includes(separator)) {
        currentSeparator = separator;
        break;
      }
    }

    // 2. STRUCTURAL SEGMENTATION
    let splits: string[];
    if (currentSeparator) {
      splits = text.split(currentSeparator);
    } else {
      splits = text.split("");
    }

    let goodSplits: string[] = [];
    const separator = currentSeparator;

    // 3. RECURSIVE RECONCILIATION
    for (const s of splits) {
      if (s.length < this.chunkSize) {
        goodSplits.push(s);
      } else {
        // If we have existing small splits, merge them first before descending
        if (goodSplits.length > 0) {
          const merged = this.mergeSplits(goodSplits, separator);
          finalChunks.push(...merged);
          goodSplits = [];
        }
        
        // RECURSIVE CALL: Break down the oversized split using the next-level separator
        const recursiveChunks = this.splitText(s);
        finalChunks.push(...recursiveChunks);
      }
    }

    // 4. FINAL MERGE PASS
    if (goodSplits.length > 0) {
      const merged = this.mergeSplits(goodSplits, separator);
      finalChunks.push(...merged);
    }

    return finalChunks;
  }

  /**
   * MERGE LOGIC (RE-ENGINEERED)
   * Collapses small segments into a single chunk that approaches the target size
   * while respecting the audit-trail overlap requirements.
   */
  private mergeSplits(splits: string[], separator: string): string[] {
    const docs: string[] = [];
    const currentDoc: string[] = [];
    let total = 0;

    for (const d of splits) {
      const len = d.length;
      
      // Check if adding this segment exceeds our Sovereign Chunk Size
      const potentialTotal = total + len + (currentDoc.length > 0 ? separator.length : 0);
      
      if (potentialTotal > this.chunkSize) {
        // Commit the current document if it contains data
        if (currentDoc.length > 0) {
          const doc = currentDoc.join(separator).trim();
          if (doc) docs.push(doc);

          // OVERLAP LOGIC: Maintain semantic continuity for the Cloud Brain.
          // We remove segments from the start until the remaining text is within the overlap limit.
          while (total > this.chunkOverlap || (total > 0 && total + len + separator.length > this.chunkSize)) {
            const removed = currentDoc.shift();
            if (removed) {
              total -= removed.length + (currentDoc.length > 0 ? separator.length : 0);
            } else {
              break;
            }
          }
        }
      }
      
      currentDoc.push(d);
      total += len + (currentDoc.length > 1 ? separator.length : 0);
    }
    
    // Final residual document capture
    const doc = currentDoc.join(separator).trim();
    if (doc) docs.push(doc);
    
    return docs;
  }
}

/**
 * STATUS: Forensic Splitter Online.
 * VERSION: v2.1 (Sovereign Kernel Ready)
 * TARGET: Google Gemini 1.5 Pro / Cloud Embeddings
 */