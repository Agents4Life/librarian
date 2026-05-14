import type { EmbeddingStore, EmbeddingVector, SearchResult } from './types.js';

const cosineSimilarity = (a: EmbeddingVector, b: EmbeddingVector): number => {
  if (a.dim !== b.dim || a.values.length !== b.values.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.values.length; i++) {
    dotProduct += a.values[i] * b.values[i];
    normA += a.values[i] * a.values[i];
    normB += b.values[i] * b.values[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
};

type StoredEmbedding = {
  path: string;
  text: string;
  vector: EmbeddingVector;
};

export class MemoryEmbeddingStore implements EmbeddingStore {
  private store = new Map<string, StoredEmbedding>();
  
  upsert(path: string, text: string, vector: EmbeddingVector): void {
    this.store.set(path, { path, text, vector });
  }
  
  remove(path: string): void {
    this.store.delete(path);
  }
  
  search(queryVector: EmbeddingVector, options: { topK?: number; minScore?: number; filterSections?: string[] } = {}): SearchResult[] {
    const topK = options.topK ?? 10;
    const minScore = options.minScore ?? 0.3;
    const filterSections = options.filterSections;
    
    const results: SearchResult[] = [];
    
    for (const entry of this.store.values()) {
      if (filterSections && filterSections.length > 0) {
        const section = entry.path.split('/')[0];
        if (!filterSections.includes(section)) continue;
      }
      
      const score = cosineSimilarity(queryVector, entry.vector);
      if (score >= minScore) {
        results.push({
          path: entry.path,
          score,
          snippet: entry.text.slice(0, 200),
        });
      }
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
  
  get(path: string): EmbeddingVector | undefined {
    return this.store.get(path)?.vector;
  }
  
  has(path: string): boolean {
    return this.store.has(path);
  }
  
  size(): number {
    return this.store.size;
  }
  
  clear(): void {
    this.store.clear();
  }
}
