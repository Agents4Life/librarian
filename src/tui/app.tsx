import React, { useCallback, useEffect, useReducer } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import { AppStateContext, appReducer, createInitialState, type WorkspaceNode } from './state.js';
import { uiEventBus } from './event-bus.js';
import { theme } from './theme.js';
import { registerRenderer } from './renderers/registry.js';
import { ChatRenderer } from './renderers/chat-renderer.js';
import { SearchRenderer } from './renderers/search-renderer.js';
import { WikiStatusRenderer } from './renderers/wiki-status-renderer.js';
import { GraphRenderer } from './renderers/graph-renderer.js';
import { ProcessRenderer } from './renderers/process-renderer.js';
import { OrphansRenderer } from './renderers/orphans-renderer.js';
import { StaleRenderer } from './renderers/stale-renderer.js';
import { ReviewRenderer } from './renderers/review-renderer.js';
import { ProposalInboxRenderer } from './renderers/proposal-inbox-renderer.js';
import { ProposalDetailRenderer } from './renderers/proposal-detail-renderer.js';
import { GraphHealthRenderer } from './renderers/graph-health-renderer.js';
import { ActivityRenderer } from './renderers/activity-renderer.js';
import { Header } from './components/header.js';
import { Sidebar } from './components/sidebar.js';
import { Composer } from './components/composer.js';
import { ActivityStream } from './components/activity-stream.js';
import { RendererSwitch } from './components/renderer-switch.js';
import { createCommands, parseComposerInput } from './commands.js';
import { defaultConfig } from '../config.js';
import { createLlmClient } from '../llm.js';
import { runLibrarian } from '../harness.js';
import { FileProposalStore } from '../proposals/proposal-store.js';
import { ReviewService } from '../review/review-service.js';
import { createIndexContext } from '../index-context.js';
import { computeGraphHealth } from './health/compute-graph-health.js';
import type { ChatMessage } from './types.js';
import type { StoredProposal } from '../proposals/types.js';
import type { ActivityEvent } from './activity/types.js';

registerRenderer('chat', ChatRenderer);
registerRenderer('search', SearchRenderer);
registerRenderer('status', WikiStatusRenderer);
registerRenderer('graph', GraphRenderer);
registerRenderer('process', ProcessRenderer);
registerRenderer('orphans', OrphansRenderer);
registerRenderer('stale', StaleRenderer);
registerRenderer('review', ReviewRenderer);
registerRenderer('proposal-inbox', ProposalInboxRenderer);
registerRenderer('proposal-detail', ProposalDetailRenderer);
registerRenderer('graph-health', GraphHealthRenderer);
registerRenderer('activity', ActivityRenderer);

export const App: React.FC = () => {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(appReducer, defaultConfig.vaultPath, createInitialState);

  const checkOllama = useCallback(async () => {
    try {
      const llm = createLlmClient();
      const health = await llm.healthcheck();
      dispatch({ type: 'SET_OLLAMA_STATUS', status: health.ok ? 'ok' : 'down' });
    } catch {
      dispatch({ type: 'SET_OLLAMA_STATUS', status: 'down' });
    }
  }, []);

  useEffect(() => {
    checkOllama();

    const buildIndexOnMount = async () => {
      try {
        const ctx = await createIndexContext(defaultConfig.vaultPath);
        dispatch({ type: 'SET_LAST_INDEX_AT', timestamp: Date.now() });
        uiEventBus.emit({ type: 'index:rebuilt', noteCount: Object.keys(ctx.index.notes).length });
      } catch {}
    };
    buildIndexOnMount();

    const unsub = uiEventBus.subscribe((event) => {
      switch (event.type) {
        case 'agent:thinking':
          dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: '◉', color: theme.primary, message: event.message } });
          break;
        case 'agent:done':
          dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: '✓', color: theme.success, message: `Completed: ${event.nodeId}` } });
          break;
        case 'agent:error':
          dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: '✗', color: theme.error, message: event.error } });
          break;
        case 'wiki:searched':
          dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: '→', color: theme.primary, message: `Searched "${event.query}": ${event.count} results` } });
          break;
        case 'notification':
          const colors = { info: theme.primary, warn: theme.warning, error: theme.error };
          dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: event.level === 'error' ? '✗' : '◉', color: colors[event.level], message: event.message } });
          break;
        case 'review:approved':
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'review:approved', message: `Approved: ${event.id.slice(0, 20)}...`, createdAt: Date.now(), meta: { id: event.id } } });
          break;
        case 'review:rejected':
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'review:rejected', message: `Rejected: ${event.id.slice(0, 20)}...`, createdAt: Date.now(), meta: { id: event.id } } });
          break;
        case 'proposal:applied':
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'proposal:applied', message: `Applied: ${event.target}`, createdAt: Date.now(), meta: { id: event.id, target: event.target } } });
          break;
        case 'pipeline:processed':
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'pipeline:processed', message: `Processed: ${event.source} → ${event.target}`, createdAt: Date.now() } });
          break;
        case 'index:rebuilt':
          dispatch({ type: 'SET_LAST_INDEX_AT', timestamp: Date.now() });
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'index:rebuilt', message: `Index rebuilt: ${event.noteCount} notes`, createdAt: Date.now() } });
          break;
      }
    });

    return unsub;
  }, [checkOllama]);

  const loadProposalInbox = useCallback(async (): Promise<string | null> => {
    try {
      const vp = state.vaultPath;
      const store = new FileProposalStore(vp);
      const service = new ReviewService(store, vp);
      const proposals = await service.list("pending");
      const nodeId = crypto.randomUUID();
      const node: WorkspaceNode = {
        type: "proposal-inbox",
        id: nodeId,
        proposals,
        cursor: 0,
        createdAt: Date.now(),
      };
      dispatch({ type: "ADD_NODE", node });
      uiEventBus.emit({ type: "agent:done", nodeId });
      return nodeId;
    } catch (error) {
      uiEventBus.emit({ type: "agent:error", error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }, [state.vaultPath]);

  const handleRendererAction = useCallback(async (action: string) => {
    if (action.startsWith("open-detail:")) {
      const proposalId = action.split(":")[1];
      const inboxNode = state.workspace.find((n) => n.type === "proposal-inbox");
      if (!inboxNode || inboxNode.type !== "proposal-inbox") return;
      const proposal = inboxNode.proposals.find((p: StoredProposal) => p.id === proposalId);
      if (!proposal) return;

      const detailNode: WorkspaceNode = {
        type: "proposal-detail",
        id: crypto.randomUUID(),
        proposal,
        showPreview: false,
        createdAt: Date.now(),
      };
      dispatch({ type: "ADD_NODE", node: detailNode });
      return;
    }

    if (action.startsWith("approve:")) {
      const proposalId = action.split(":")[1];
      try {
        const vp = state.vaultPath;
        const store = new FileProposalStore(vp);
        const service = new ReviewService(store, vp);
        await service.approve(proposalId);
        uiEventBus.emit({ type: "review:approved", id: proposalId });
        dispatch({ type: "PUSH_ACTIVITY", entry: { icon: "✓", color: theme.success, message: `Approved: ${proposalId.slice(0, 20)}...` } });

        const inboxNode = state.workspace.find((n) => n.type === "proposal-inbox");
        if (inboxNode) {
          const updated = await service.list("pending");
          dispatch({ type: "UPDATE_INBOX_PROPOSALS", nodeId: inboxNode.id, proposals: updated });
        }
        dispatch({ type: "NAVIGATE_BACK" });
      } catch (error) {
        uiEventBus.emit({ type: "agent:error", error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (action.startsWith("reject:")) {
      const proposalId = action.split(":")[1];
      try {
        const vp = state.vaultPath;
        const store = new FileProposalStore(vp);
        const service = new ReviewService(store, vp);
        await service.reject(proposalId);
        uiEventBus.emit({ type: "review:rejected", id: proposalId });
        dispatch({ type: "PUSH_ACTIVITY", entry: { icon: "✗", color: theme.error, message: `Rejected: ${proposalId.slice(0, 20)}...` } });

        const inboxNode = state.workspace.find((n) => n.type === "proposal-inbox");
        if (inboxNode) {
          const updated = await service.list("pending");
          dispatch({ type: "UPDATE_INBOX_PROPOSALS", nodeId: inboxNode.id, proposals: updated });
        }
        dispatch({ type: "NAVIGATE_BACK" });
      } catch (error) {
        uiEventBus.emit({ type: "agent:error", error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (action === "back-to-inbox") {
      dispatch({ type: "NAVIGATE_BACK" });
    }
  }, [state.vaultPath, state.workspace]);

  const commands = createCommands(
    (action) => dispatch(action as never),
    async () => {},
  );

  const handleComposerSubmit = useCallback(async (input: string) => {
    const parsed = parseComposerInput(input, commands);

    if (parsed.isCommand && parsed.command) {
      if (parsed.command.slash === "/review") {
        dispatch({ type: "SET_LOADING", loading: true });
        uiEventBus.emit({ type: "agent:thinking", message: "Loading proposals..." });
        await loadProposalInbox();
        dispatch({ type: "SET_LOADING", loading: false });
        return;
      }

      if (parsed.command.slash === "/health") {
        dispatch({ type: 'SET_LOADING', loading: true });
        uiEventBus.emit({ type: 'agent:thinking', message: 'Computing graph health...' });
        try {
          const ctx = await createIndexContext(state.vaultPath);
          const store = new FileProposalStore(state.vaultPath);
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

      if (parsed.command.slash === "/activity") {
        const node: WorkspaceNode = {
          type: 'activity',
          id: crypto.randomUUID(),
          events: state.activityEvents,
          cursor: 0,
          createdAt: Date.now(),
        };
        dispatch({ type: 'ADD_NODE', node });
        return;
      }

      dispatch({ type: 'SET_LOADING', loading: true });
      uiEventBus.emit({ type: 'agent:thinking', message: `Running ${parsed.command.slash}...` });

      try {
        const run = await runLibrarian(parsed.command.slash === '/search' ? `buscar ${parsed.args}` : input);

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

    const activeNode = state.workspace.find((n) => n.id === state.activeNodeId);
    const chatNode = activeNode?.type === 'chat' ? activeNode : state.workspace.find((n) => n.type === 'chat');

    if (chatNode && chatNode.type === 'chat') {
      const userMsg: ChatMessage = { role: 'user', content: parsed.args };
      const updatedMessages = [...chatNode.messages, userMsg];

      dispatch({ type: 'UPDATE_NODE', id: chatNode.id, patch: { messages: updatedMessages } as Partial<WorkspaceNode> });
      dispatch({ type: 'SET_LOADING', loading: true });
      uiEventBus.emit({ type: 'agent:thinking', message: 'Thinking...' });

      try {
        const llm = createLlmClient();
        const response = await llm.chat(updatedMessages);
        const assistantMsg: ChatMessage = { role: 'assistant', content: response.content };

        dispatch({
          type: 'UPDATE_NODE',
          id: chatNode.id,
          patch: { messages: [...updatedMessages, assistantMsg] } as Partial<WorkspaceNode>,
        });
        uiEventBus.emit({ type: 'agent:done', nodeId: chatNode.id });
      } catch (error) {
        const errorMsg: ChatMessage = { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` };
        dispatch({
          type: 'UPDATE_NODE',
          id: chatNode.id,
          patch: { messages: [...updatedMessages, errorMsg] } as Partial<WorkspaceNode>,
        });
        uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }
  }, [state.workspace, state.activeNodeId]);

  useInput((input, key) => {
    if (input === 'q' && state.composerValue === '') {
      exit();
      return;
    }

    if (key.escape) {
      if (state.composerValue === '') {
        dispatch({ type: 'NAVIGATE_BACK' });
      }
    }
  });

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      <Box flexDirection="column" height="100%">
        <Header />
        <Box borderStyle="single" borderLeft={false} borderRight={false} borderTop={false} borderBottom={false} borderColor={theme.borderSubtle} />
        <Box flexDirection="row" flexGrow={1}>
          <Sidebar />
          <Box flexDirection="column" flexGrow={1} paddingY={0}>
            <ActivityStream />
            <RendererSwitch onAction={handleRendererAction} />
          </Box>
        </Box>
        <Composer onSubmit={handleComposerSubmit} />
      </Box>
    </AppStateContext.Provider>
  );
};

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
        type: 'status',
        id,
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
        type: 'graph',
        id,
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
        type: 'process',
        id,
        inbox: {
          total: (result.total as number) ?? 0,
          curatable: (result.total as number) ?? 0,
          preview: (result.preview as string[]) ?? [],
        },
        createdAt: now,
      };
    }
    case 'incomplete-notes': {
      const notes = (result.notes as Array<Record<string, unknown>>) ?? [];
      return {
        type: 'orphans',
        id,
        notes: notes.map((n) => ({ file: String(n.file ?? ''), has_outgoing: false, has_incoming: false })),
        createdAt: now,
      };
    }
    case 'stale-notes': {
      const staleNotes = (result.notes as Array<Record<string, unknown>>) ?? [];
      return {
        type: 'stale',
        id,
        notes: staleNotes.map((n) => ({
          file: String(n.file ?? ''),
          last_touched: String(n.last_touched ?? ''),
          days_since_touch: Number(n.days_since_touch ?? 0),
        })),
        createdAt: now,
      };
    }
    default:
      return null;
  }
};
