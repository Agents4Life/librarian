import { useCallback } from 'react';
import { runLibrarian } from '../../harness.js';
import { createIndexContext } from '../../index-context.js';
import { computeGraphHealth } from '../health/compute-graph-health.js';
import { uiEventBus } from '../event-bus.js';
import { getStore } from '../services.js';
import type { AppState, AppAction, WorkspaceNode } from '../state.js';
import type { ChatMessage } from '../types.js';

const mapRunToNode = (run: unknown): WorkspaceNode | null => {
  const r = run as { routed?: { intent?: string }; result?: unknown; session?: { id?: string } };
  const intent = r.routed?.intent;
  const result = r.result as Record<string, unknown> | null;

  if (!intent || !result) return null;

  const id = r.session?.id ?? crypto.randomUUID();
  const now = Date.now();

  switch (intent) {
    case 'search-wiki': {
      const searchResults = result.results as Array<{ file: string; score: number; snippet?: string }> ?? [];
      return { type: 'search', id, query: String(result.query ?? ''), results: searchResults.map((s) => ({ file: s.file, score: s.score, snippet: s.snippet })), createdAt: now };
    }
    case 'wiki-status': {
      const stats = (result.stats ?? {}) as Record<string, number>;
      const graph = (result.graph ?? {}) as Record<string, unknown>;
      return {
        type: 'status', id,
        stats: { total_files: stats.total_files ?? 0, wiki_pages: stats.wiki_pages ?? 0, raw_files: stats.raw_files ?? 0 },
        graph: {
          total_nodes: (graph.total_nodes as number) ?? 0,
          total_edges: (graph.total_edges as number) ?? 0,
          avg_connections: (graph.avg_connections as number) ?? 0,
          most_connected: (graph.most_connected as Array<{ file: string; connections: number }>) ?? [],
          orphans: (graph.orphans as number) ?? 0,
        },
        createdAt: now,
      };
    }
    case 'connections': {
      const g = result as Record<string, unknown>;
      return {
        type: 'graph', id,
        stats: {
          total_nodes: (g.total_nodes as number) ?? 0,
          total_edges: (g.total_edges as number) ?? 0,
          avg_connections: (g.avg_connections as number) ?? 0,
          most_connected: (g.most_connected as Array<{ file: string; connections: number }>) ?? [],
          orphans: (g.orphans as number) ?? 0,
        },
        createdAt: now,
      };
    }
    case 'process-notes': {
      return {
        type: 'process', id,
        inbox: { total: (result.total as number) ?? 0, curatable: (result.total as number) ?? 0, preview: (result.preview as string[]) ?? [] },
        createdAt: now,
      };
    }
    case 'stale-notes': {
      const staleNotes = (result.notes as Array<Record<string, unknown>>) ?? [];
      return {
        type: 'stale', id,
        notes: staleNotes.map((n) => ({ file: String(n.file ?? ''), last_touched: String(n.last_touched ?? ''), days_since_touch: Number(n.days_since_touch ?? 0) })),
        createdAt: now,
      };
    }
    default:
      return null;
  }
};

export const useComposer = (
  state: AppState,
  dispatch: React.Dispatch<AppAction>,
  deps: {
    loadProposalInbox: () => Promise<string | null>;
  },
) => {
  const handleComposerSubmit = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Slash commands
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(/\s+/);
      const slash = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (slash === '/review') {
        dispatch({ type: 'SET_LOADING', loading: true });
        uiEventBus.emit({ type: 'agent:thinking', message: 'Loading proposals...' });
        await deps.loadProposalInbox();
        dispatch({ type: 'SET_LOADING', loading: false });
        return;
      }

      if (slash === '/health') {
        dispatch({ type: 'SET_LOADING', loading: true });
        uiEventBus.emit({ type: 'agent:thinking', message: 'Computing graph health...' });
        try {
          const ctx = await createIndexContext(state.vaultPath);
          const store = getStore(state.vaultPath);
          const summary = await computeGraphHealth(ctx.query, store);
          const node: WorkspaceNode = { type: 'graph-health', id: crypto.randomUUID(), summary, createdAt: Date.now() };
          dispatch({ type: 'ADD_NODE', node });
          dispatch({ type: 'SET_LAST_INDEX_AT', timestamp: Date.now() });
          uiEventBus.emit({ type: 'agent:done', nodeId: node.id });
        } catch (error) {
          uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
        } finally {
          dispatch({ type: 'SET_LOADING', loading: false });
        }
        return;
      }

      if (slash === '/activity') {
        const node: WorkspaceNode = { type: 'activity', id: crypto.randomUUID(), events: state.activityEvents, cursor: 0, createdAt: Date.now() };
        dispatch({ type: 'ADD_NODE', node });
        return;
      }

      if (slash === '/help') {
        const helpNode: WorkspaceNode = { type: 'help', id: crypto.randomUUID(), createdAt: Date.now() };
        dispatch({ type: 'ADD_NODE', node: helpNode });
        return;
      }

      if (slash === '/orphans') {
        dispatch({ type: 'SET_LOADING', loading: true });
        uiEventBus.emit({ type: 'agent:thinking', message: 'Finding orphan notes...' });
        try {
          const ctx = await createIndexContext(state.vaultPath);
          const orphans = ctx.query.getOrphans();
          const node: WorkspaceNode = {
            type: 'orphans', id: crypto.randomUUID(),
            notes: orphans.map((n) => ({ file: n.path, has_outgoing: n.links.length > 0, has_incoming: n.backlinks.length > 0 })),
            createdAt: Date.now(),
          };
          dispatch({ type: 'ADD_NODE', node });
          uiEventBus.emit({ type: 'agent:done', nodeId: node.id });
        } catch (error) {
          uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
        } finally {
          dispatch({ type: 'SET_LOADING', loading: false });
        }
        return;
      }

      // Generic slash command → runLibrarian
      dispatch({ type: 'SET_LOADING', loading: true });
      uiEventBus.emit({ type: 'agent:thinking', message: `Running ${slash}...` });
      try {
        const run = await runLibrarian(slash === '/search' ? `buscar ${args}` : trimmed);
        const node = mapRunToNode(run);
        if (node) {
          dispatch({ type: 'ADD_NODE', node });
          uiEventBus.emit({ type: 'agent:done', nodeId: node.id });
        }
      } catch (error) {
        uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
      return;
    }

    // Free-form chat
    const activeNode = state.workspace.find((n) => n.id === state.activeNodeId);
    const chatNode = activeNode?.type === 'chat' ? activeNode : state.workspace.find((n) => n.type === 'chat');

    if (chatNode && chatNode.type === 'chat') {
      const userMsg: ChatMessage = { role: 'user', content: trimmed };
      const updatedMessages = [...chatNode.messages, userMsg];

      dispatch({ type: 'UPDATE_NODE', id: chatNode.id, patch: { messages: updatedMessages } as Partial<WorkspaceNode> });
      dispatch({ type: 'SET_LOADING', loading: true });
      uiEventBus.emit({ type: 'agent:thinking', message: 'Thinking...' });

      try {
        const run = await runLibrarian(trimmed, state.vaultPath);
        const runResult = run.result as Record<string, unknown> | null;
        const responseText = typeof runResult?.content === 'string'
          ? runResult.content
          : runResult?.message
            ? String(runResult.message)
            : JSON.stringify(runResult ?? {});
        const assistantMsg: ChatMessage = { role: 'assistant', content: responseText };
        dispatch({ type: 'UPDATE_NODE', id: chatNode.id, patch: { messages: [...updatedMessages, assistantMsg] } as Partial<WorkspaceNode> });
        uiEventBus.emit({ type: 'agent:done', nodeId: chatNode.id });
      } catch (error) {
        const errorMsg: ChatMessage = { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` };
        dispatch({ type: 'UPDATE_NODE', id: chatNode.id, patch: { messages: [...updatedMessages, errorMsg] } as Partial<WorkspaceNode> });
        uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }
  }, [state, dispatch, deps]);

  return { handleComposerSubmit };
};
