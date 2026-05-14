import type { EmbeddingProvider, EmbeddingVector } from './types.js';
import { defaultLlmConfig } from '../llm.js';

const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';
const DEFAULT_EMBEDDING_DIM = 768;

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'ollama';
  readonly dim: number;
  
  private baseUrl: string;
  private model: string;
  
  constructor(options?: { baseUrl?: string; model?: string; dim?: number }) {
    this.baseUrl = options?.baseUrl ?? defaultLlmConfig.baseUrl.replace(/\/v1$/, '');
    this.model = options?.model ?? process.env.OLLAMA_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
    this.dim = options?.dim ?? DEFAULT_EMBEDDING_DIM;
  }
  
  async embed(text: string): Promise<EmbeddingVector> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: text.slice(0, 8000), // Truncate to avoid token limits
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.status}`);
    }
    
    const data = await response.json() as { embedding: number[] };
    return { values: data.embedding, dim: data.embedding.length };
  }
  
  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    // Ollama doesn't have a native batch endpoint, so we do sequential
    // with concurrency control
    const results: EmbeddingVector[] = [];
    const concurrency = 3;
    
    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const vectors = await Promise.all(batch.map(t => this.embed(t)));
      results.push(...vectors);
    }
    
    return results;
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return false;
      
      const data = await response.json() as { models: Array<{ name: string }> };
      return data.models.some(m => m.name.includes(this.model) || m.name.includes(this.model.split(':')[0]));
    } catch {
      return false;
    }
  }
}
