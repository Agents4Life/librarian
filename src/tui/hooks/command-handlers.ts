import { computeGraphHealth } from '../health/compute-graph-health.js';
import { uiEventBus } from '../event-bus.js';
import { getStore } from '../services.js';
import { createIndexContext } from '../../index-context.js';
import { runLibrarian } from '../../harness.js';
import type { AppState, WorkspaceNode, AppAction } from '../state.js';
import type { SlashCommandHandler } from './types.js';

interface CommandHandlerContext {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  loadProposalInbox: () => Promise<string | null>;
}

export const createCommandHandlers = ({ state, dispatch, loadProposalInbox }: CommandHandlerContext) => {
  const handleHealth = async (_slash: string, _args: string) => {
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
  };

  const handleReview = async (_slash: string, _args: string) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    uiEventBus.emit({ type: 'agent:thinking', message: 'Loading proposals...' });
    await loadProposalInbox();
    dispatch({ type: 'SET_LOADING', loading: false });
  };

  const handleActivity = async (_slash: string, _args: string) => {
    const node: WorkspaceNode = { type: 'activity', id: crypto.randomUUID(), events: state.activityEvents, cursor: 0, createdAt: Date.now() };
    dispatch({ type: 'ADD_NODE', node });
  };

  const handleHelp = async (_slash: string, _args: string) => {
    dispatch({ type: 'ADD_NODE', node: { type: 'help', id: crypto.randomUUID(), createdAt: Date.now() } });
  };

  const handleOrphans = async (_slash: string, _args: string) => {
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
  };

  const handleGenericCommand = async (command: string, args: string) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    uiEventBus.emit({ type: 'agent:thinking', message: `Running ${command}...` });
    try {
      const run = await runLibrarian(command === '/search' ? `buscar ${args}` : `${command} ${args}`);
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
  };

  return {
    '/health': handleHealth,
    '/review': handleReview,
    '/activity': handleActivity,
    '/help': handleHelp,
    '/orphans': handleOrphans,
    '*': handleGenericCommand,
  } satisfies Record<string, SlashCommandHandler>;
};

// Keep the mapRunToNode helper here (we'll make it safer later)
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