import { useCallback } from 'react';
import { uiEventBus } from '../event-bus.js';
import { theme } from '../theme.js';
import type { AppState, AppAction, WorkspaceNode } from '../state.js';
import type { ActivityEvent } from '../activity/types.js';

export const useActivity = (
  dispatch: React.Dispatch<AppAction>,
) => {
  const subscribe = useCallback(() => {
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
        case 'notification': {
          const colors = { info: theme.primary, warn: theme.warning, error: theme.error };
          dispatch({ type: 'PUSH_ACTIVITY', entry: { icon: event.level === 'error' ? '✗' : '◉', color: colors[event.level], message: event.message } });
          break;
        }
        case 'review:approved':
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'review:approved', message: `Approved: ${event.id.slice(0, 20)}...`, createdAt: Date.now(), meta: { id: event.id } } as ActivityEvent });
          break;
        case 'review:rejected':
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'review:rejected', message: `Rejected: ${event.id.slice(0, 20)}...`, createdAt: Date.now(), meta: { id: event.id } } as ActivityEvent });
          break;
        case 'proposal:applied':
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'proposal:applied', message: `Applied: ${event.target}`, createdAt: Date.now(), meta: { id: event.id, target: event.target } } as ActivityEvent });
          break;
        case 'pipeline:processed':
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'pipeline:processed', message: `Processed: ${event.source} → ${event.target}`, createdAt: Date.now() } as ActivityEvent });
          break;
        case 'index:rebuilt':
          dispatch({ type: 'SET_LAST_INDEX_AT', timestamp: Date.now() });
          dispatch({ type: 'PUSH_ACTIVITY_EVENT', event: { id: crypto.randomUUID(), type: 'index:rebuilt', message: `Index rebuilt: ${event.noteCount} notes`, createdAt: Date.now() } as ActivityEvent });
          break;
      }
    });
    return unsub;
  }, [dispatch]);

  return { subscribe };
};
