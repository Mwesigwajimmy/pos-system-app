/**
 * --- BBU1 SOVEREIGN TEXT ARCHITECTURE ---
 * VERSION: v2.5 OMEGA-ULTIMATUM (THE FORENSIC SEGMENTER)
 * 
 * Represents a single high-density chunk of business intelligence ready for neural mapping.
 * Optimized for the 15-year audit retention mandate and 1024-dim Elite Memory.
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
 * UPGRADED: Chunk sizes tuned for 1024-dimension high-precision embeddings (SambaNova/Jina).
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
 * FIX LOG v2.5:
 * 1. SEPARATOR WATERFALL: Recursive logic now passes a sub-list of separators 
 *    to prevent infinite loops on dense JSON/ERP data blocks.
 * 2. DIMENSION ALIGNMENT: Default chunkSize calibrated to 1024 to match the 
 *    SambaNova 70B Elite reasoning and 1024-dim neural memory.
 * 3. JSON BOUNDARY SENSITIVITY: Priority given to '},' and '",' to prevent 
 *    splitting critical database records in the middle of a value.
 */
export class RecursiveCharacterTextSplitter {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  
  // SOVEREIGN SEPARATORS: Ranked by structural importance for BBU1 data exports.
  // We prioritize Double Newlines, then single lines, then JSON boundaries, 
  // then characters (as the absolute fallback).
  private readonly separators: string[];

  constructor(options: Partial<TextSplitterOptions> = {}) {
    // Calibrated for 1024-dim Elite standard
    this.chunkSize = options.chunkSize ?? 1024; 
    this.chunkOverlap = options.chunkOverlap ?? 200;

    if (this.chunkOverlap >= this.chunkSize) {
      throw new Error("Aura Kernel Error: Chunk overlap must be smaller than chunk size.");
    }

    this.separators = ["\n\n", "\n", "},", '",', " ", ""];
  }

  /**
   * PRIMARY SPLIT INTERFACE
   * Public entry point for the Sovereign Kernel.
   */
  public splitText(text: string): string[] {
    return this.executeRecursiveSplit(text, this.separators);
  }

  /**
   * EXECUTIVE RECURSIVE ENGINE (The Waterfall)
   * Breaks down raw business intelligence into a forensic-ready array of string chunks.
   * 
   * @param text The raw ERP data or document text to be split.
   * @param separators The current hierarchy of separators to attempt.
   * @returns An array of structural string chunks.
   */
  private executeRecursiveSplit(text: string, separators: string[]): string[] {
    const finalChunks: string[] = [];
    
    // 1. NEURAL SCAN: Determine the most appropriate separator from the remaining waterfall
    let currentSeparator = separators[separators.length - 1];
    let nextSeparators: string[] = [];

    for (let i = 0; i < separators.length; i++) {
      const s = separators[i];
      if (s === "") {
        currentSeparator = s;
        nextSeparators = [];
        break;
      }
      if (text.includes(s)) {
        currentSeparator = s;
        // The waterfall: the next level of recursion will only use separators 
        // that are "finer" than the current one.
        nextSeparators = separators.slice(i + 1);
        break;
      }
    }

    // 2. STRUCTURAL SEGMENTATION
    const splits = currentSeparator === "" ? text.split("") : text.split(currentSeparator);

    let goodSplits: string[] = [];

    // 3. RECURSIVE RECONCILIATION
    for (const s of splits) {
      if (s.length < this.chunkSize) {
        goodSplits.push(s);
      } else {
        // If we have existing small splits, merge them first to maintain order
        if (goodSplits.length > 0) {
          const merged = this.mergeSplits(goodSplits, currentSeparator);
          finalChunks.push(...merged);
          goodSplits = [];
        }
        
        // RECURSIVE WATERFALL: If no more separators, this is the smallest possible split.
        if (nextSeparators.length === 0) {
          finalChunks.push(s);
        } else {
          // Descend into the next level of the waterfall
          const recursiveChunks = this.executeRecursiveSplit(s, nextSeparators);
          finalChunks.push(...recursiveChunks);
        }
      }
    }

    // 4. FINAL MERGE PASS
    if (goodSplits.length > 0) {
      const merged = this.mergeSplits(goodSplits, currentSeparator);
      finalChunks.push(...merged);
    }

    return finalChunks;
  }

  /**
   * MERGE LOGIC (FORENSIC PRECISION)
   * Collapses small segments into a single chunk that approaches the target size
   * while respecting the audit-trail overlap requirements.
   */
  private mergeSplits(splits: string[], separator: string): string[] {
    const docs: string[] = [];
    const currentDoc: string[] = [];
    let total = 0;

    for (const d of splits) {
      const len = d.length;
      
      // Calculate potential total with the separator added
      const potentialTotal = total + len + (currentDoc.length > 0 ? separator.length : 0);
      
      if (potentialTotal > this.chunkSize) {
        // Commit the current document if it satisfies the business logic
        if (currentDoc.length > 0) {
          const doc = currentDoc.join(separator).trim();
          if (doc) docs.push(doc);

          /**
           * OVERLAP LOGIC: Maintain semantic continuity for the Cloud Brain.
           * We perform a forensic lookback, removing segments from the start 
           * until we are back within the authorized overlap window.
           */
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
    
    // Final residual document capture (Sovereign Safety Seal)
    const doc = currentDoc.join(separator).trim();
    if (doc) docs.push(doc);
    
    return docs;
  }
}

/**
 * STATUS: Forensic Splitter v2.5 Aligned with 1024-dim Memory.
 * JURISDICTION: BBU1 Sovereign Cloud Infrastructure.
 * TARGET: SambaNova Llama 3.3 70B / Jina v3 Elite Embeddings.
 */