import type { EmbeddingProvider, EmbeddingStore } from './types.js';
import { OllamaEmbeddingProvider } from './ollama-embeddings.js';
import { MemoryEmbeddingStore } from './memory-store.js';

export type { EmbeddingProvider, EmbeddingStore, EmbeddingVector, SearchResult } from './types.js';

let _provider: EmbeddingProvider | null = null;
let _store: EmbeddingStore | null = null;
let _available: boolean | null = null;

export const getEmbeddingProvider = (): EmbeddingProvider => {
  if (!_provider) {
    _provider = new OllamaEmbeddingProvider();
  }
  return _provider;
};

export const getEmbeddingStore = (): EmbeddingStore => {
  if (!_store) {
    _store = new MemoryEmbeddingStore();
  }
  return _store;
};

/** Check if embeddings are available. Caches result for the session. */
export const isEmbeddingAvailable = async (): Promise<boolean> => {
  if (_available === null) {
    try {
      _available = await getEmbeddingProvider().isAvailable();
    } catch {
      _available = false;
    }
  }
  return _available;
};

/** Reset availability check (useful after config changes) */
export const resetEmbeddingCheck = (): void => {
  _available = null;
};
