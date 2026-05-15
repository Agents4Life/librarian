import { useCallback } from 'react';
import { runLibrarian } from '../../harness.js';
import { uiEventBus } from '../event-bus.js';
import type { AppState, AppAction, WorkspaceNode } from '../state.js';
import type { ChatMessage } from '../types.js';
import { createCommandHandlers } from './command-handlers.js';

export const useComposer = (
  state: AppState,
  dispatch: React.Dispatch<AppAction>,
  deps: {
    loadProposalInbox: () => Promise<string | null>;
  },
) => {
  const handlers = createCommandHandlers({ state, dispatch, loadProposalInbox: deps.loadProposalInbox });

  const handleComposerSubmit = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Slash commands
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(/\s+/);
      const slash = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      const handler = handlers[slash as keyof typeof handlers] || handlers['*'];
      await handler(slash, args);
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
        const finalMessages = [...updatedMessages, assistantMsg];
        dispatch({ type: 'UPDATE_NODE', id: chatNode.id, patch: { messages: finalMessages } as Partial<WorkspaceNode> });
        
        uiEventBus.emit({ type: 'agent:done', nodeId: chatNode.id });
      } catch (error) {
        const errorMsg: ChatMessage = { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` };
        dispatch({ type: 'UPDATE_NODE', id: chatNode.id, patch: { messages: [...updatedMessages, errorMsg] } as Partial<WorkspaceNode> });
        uiEventBus.emit({ type: 'agent:error', error: error instanceof Error ? error.message : String(error) });
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }
  }, [state, dispatch, deps, handlers]);

  return { handleComposerSubmit };
};