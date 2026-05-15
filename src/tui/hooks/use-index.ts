import { useCallback } from 'react';
import { createLlmClient } from '../../llm.js';
import { createIndexContext } from '../../index-context.js';
import { loadIndexMetadata, detectStaleness, type IndexCacheStatus } from '../../indexer/index-metadata.js';
import { uiEventBus } from '../event-bus.js';
import type { AppAction } from '../state.js';

export const useIndex = (
  dispatch: React.Dispatch<AppAction>,
) => {
  const checkOllama = useCallback(async () => {
    try {
      const llm = createLlmClient();
      const health = await llm.healthcheck();
      dispatch({ type: 'SET_OLLAMA_STATUS', status: health.status });
    } catch {
      dispatch({ type: 'SET_OLLAMA_STATUS', status: 'down' });
    }
  }, [dispatch]);

  const buildIndex = useCallback(async (vaultPath: string) => {
    try {
      const ctx = await createIndexContext(vaultPath);
      dispatch({ type: 'SET_LAST_INDEX_AT', timestamp: Date.now() });
      uiEventBus.emit({ type: 'index:rebuilt', noteCount: Object.keys(ctx.index.notes).length });

      const meta = await loadIndexMetadata(vaultPath);
      if (meta) {
        const isStale = await detectStaleness(vaultPath, meta);
        dispatch({ type: 'SET_INDEX_STATUS', status: isStale ? 'stale' : meta.status as IndexCacheStatus });
      } else {
        dispatch({ type: 'SET_INDEX_STATUS', status: 'fresh' });
      }
    } catch (error) {
      dispatch({ type: 'SET_INDEX_STATUS', status: 'missing' });
      uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
    }
  }, [dispatch]);

  return { checkOllama, buildIndex };
};
