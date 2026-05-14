export interface EmbeddingVector {
  values: number[];
  dim: number;
}

export interface EmbeddingResult {
  text: string;
  vector: EmbeddingVector;
}

export interface SearchResult {
  path: string;
  score: number;
  snippet: string;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly dim: number;
  
  /** Embed a single text string */
  embed(text: string): Promise<EmbeddingVector>;
  
  /** Embed multiple texts in batch */
  embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
  
  /** Check if the provider is available */
  isAvailable(): Promise<boolean>;
}

export interface EmbeddingStore {
  /** Store an embedding for a vault file path */
  upsert(path: string, text: string, vector: EmbeddingVector): void;
  
  /** Remove an embedding */
  remove(path: string): void;
  
  /** Search by embedding vector, return top-K results */
  search(queryVector: EmbeddingVector, options: { topK?: number; minScore?: number; filterSections?: string[] }): SearchResult[];
  
  /** Get the embedding for a specific path */
  get(path: string): EmbeddingVector | undefined;
  
  /** Check if a path has an embedding */
  has(path: string): boolean;
  
  /** Get number of stored embeddings */
  size(): number;
  
  /** Clear all stored embeddings */
  clear(): void;
}
