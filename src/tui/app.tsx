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
import { Header } from './components/header.js';
import { Sidebar } from './components/sidebar.js';
import { Composer } from './components/composer.js';
import { ActivityStream } from './components/activity-stream.js';
import { RendererSwitch } from './components/renderer-switch.js';
import { createCommands, parseComposerInput } from './commands.js';
import { defaultConfig } from '../config.js';
import { createLlmClient } from '../llm.js';
import { runLibrarian } from '../harness.js';
import type { ChatMessage } from './types.js';

registerRenderer('chat', ChatRenderer);
registerRenderer('search', SearchRenderer);
registerRenderer('status', WikiStatusRenderer);
registerRenderer('graph', GraphRenderer);
registerRenderer('process', ProcessRenderer);
registerRenderer('orphans', OrphansRenderer);
registerRenderer('stale', StaleRenderer);
registerRenderer('review', ReviewRenderer);

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
      }
    });

    return unsub;
  }, [checkOllama]);

  const commands = createCommands(
    (action) => dispatch(action as never),
    async () => {},
  );

  const handleComposerSubmit = useCallback(async (input: string) => {
    const parsed = parseComposerInput(input, commands);

    if (parsed.isCommand && parsed.command) {
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
            <RendererSwitch />
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
