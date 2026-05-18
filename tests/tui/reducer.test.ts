import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appReducer, createInitialState } from '../../src/tui/state.js';

describe('TUI State Reducer', () => {
  const initialState = createInitialState('/test/vault');

  describe('SET_FOCUSED_PANE', () => {
    it('should update focused pane', () => {
      const action = { type: 'SET_FOCUSED_PANE' as const, pane: 'navigation' as const };
      const state = appReducer(initialState, action);
      assert.equal(state.focusedPane, 'navigation');
    });
  });

  describe('SET_ACTIVE_NODE', () => {
    it('should set active node when node exists', () => {
      const node = { type: 'help' as const, id: 'test-id', createdAt: Date.now() };
      const stateWithNode = { ...initialState, workspace: [...initialState.workspace, node] };
      const action = { type: 'SET_ACTIVE_NODE' as const, id: 'test-id' };
      const result = appReducer(stateWithNode, action);
      assert.equal(result.activeNodeId, 'test-id');
      assert.ok(result.navigationHistory.includes('test-id'));
    });

    it('should add node to history if not present', () => {
      const node = { type: 'help' as const, id: 'new-id', createdAt: Date.now() };
      const stateWithNode = { ...initialState, workspace: [...initialState.workspace, node] };
      const action = { type: 'SET_ACTIVE_NODE' as const, id: 'new-id' };
      const result = appReducer(stateWithNode, action);
      assert.ok(result.navigationHistory.includes('new-id'));
      assert.equal(result.historyIndex, result.navigationHistory.length - 1);
    });

    it('should update history index for existing node', () => {
      const node = { type: 'help' as const, id: 'existing-id', createdAt: Date.now() };
      const stateWithHistory = {
        ...initialState,
        workspace: [node],
        navigationHistory: ['old-id', 'existing-id', 'future-id'],
        historyIndex: 2,
      };
      const action = { type: 'SET_ACTIVE_NODE' as const, id: 'existing-id' };
      const result = appReducer(stateWithHistory, action);
      assert.equal(result.historyIndex, 1);
    });
  });

  describe('NAVIGATE_BACK', () => {
    it('should go back in history', () => {
      const stateWithHistory = {
        ...initialState,
        navigationHistory: ['node1', 'node2', 'node3'],
        historyIndex: 2,
        activeNodeId: 'node3',
      };
      const action = { type: 'NAVIGATE_BACK' as const };
      const result = appReducer(stateWithHistory, action);
      assert.equal(result.historyIndex, 1);
      assert.equal(result.activeNodeId, 'node2');
    });

    it('should not go back when at start', () => {
      const stateWithHistory = {
        ...initialState,
        navigationHistory: ['node1', 'node2'],
        historyIndex: 0,
        activeNodeId: 'node1',
      };
      const action = { type: 'NAVIGATE_BACK' as const };
      const result = appReducer(stateWithHistory, action);
      assert.deepEqual(result, stateWithHistory);
    });
  });

  describe('NAVIGATE_FORWARD', () => {
    it('should go forward in history', () => {
      const stateWithHistory = {
        ...initialState,
        navigationHistory: ['node1', 'node2', 'node3'],
        historyIndex: 0,
        activeNodeId: 'node1',
      };
      const action = { type: 'NAVIGATE_FORWARD' as const };
      const result = appReducer(stateWithHistory, action);
      assert.equal(result.historyIndex, 1);
      assert.equal(result.activeNodeId, 'node2');
    });

    it('should not go forward when at end', () => {
      const stateWithHistory = {
        ...initialState,
        navigationHistory: ['node1', 'node2'],
        historyIndex: 1,
        activeNodeId: 'node2',
      };
      const action = { type: 'NAVIGATE_FORWARD' as const };
      const result = appReducer(stateWithHistory, action);
      assert.deepEqual(result, stateWithHistory);
    });
  });

  describe('UPDATE_NODE', () => {
    it('should update node properties', () => {
      const node = { type: 'chat' as const, id: 'chat-id', messages: [] as any[], createdAt: Date.now() };
      const stateWithNode = { ...initialState, workspace: [node] };
      const patch = { messages: [{ role: 'user' as const, content: 'hello' }] };
      const action = { type: 'UPDATE_NODE' as const, id: 'chat-id', patch };
      const result = appReducer(stateWithNode, action);
      const updatedNode = result.workspace.find((n: any) => n.id === 'chat-id');
      assert.deepEqual(updatedNode?.messages, patch.messages);
    });

    it('should not update other nodes', () => {
      const node1 = { type: 'chat' as const, id: 'chat-id', messages: [] as any[], createdAt: Date.now() };
      const node2 = { type: 'help' as const, id: 'help-id', createdAt: Date.now() };
      const stateWithNodes = { ...initialState, workspace: [node1, node2] };
      const action = { type: 'UPDATE_NODE' as const, id: 'chat-id', patch: { messages: ['test'] } };
      const result = appReducer(stateWithNodes, action);
      const helpNode = result.workspace.find((n: any) => n.id === 'help-id');
      assert.deepEqual(helpNode, node2);
    });
  });

  describe('PUSH_ACTIVITY', () => {
    it('should add activity entry', () => {
      const entry = { icon: '✓', color: 'green', message: 'Test message' };
      const action = { type: 'PUSH_ACTIVITY' as const, entry };
      const result = appReducer(initialState, action);
      assert.equal(result.activityLog.length, 1);
      assert.equal(result.activityLog[0].icon, '✓');
      assert.equal(result.activityLog[0].color, 'green');
      assert.equal(result.activityLog[0].message, 'Test message');
      assert.ok(result.activityLog[0].id);
      assert.ok(result.activityLog[0].timestamp);
    });

    it('should limit activity log to 50 entries', () => {
      const fiftyEntries = Array.from({ length: 50 }, (_, i) => ({
        id: `entry-${i}`,
        timestamp: Date.now() - i,
        icon: '•',
        color: 'gray',
        message: `Message ${i}`,
      }));
      const stateWithFifty = { ...initialState, activityLog: fiftyEntries };
      const action = { type: 'PUSH_ACTIVITY' as const, entry: { icon: '✓', color: 'green', message: 'New entry' } };
      const result = appReducer(stateWithFifty, action);
      assert.equal(result.activityLog.length, 50);
      assert.equal(result.activityLog[result.activityLog.length - 1].message, 'New entry');
      assert.equal(result.activityLog[0].message, 'Message 1');
    });
  });

  describe('MOVE_CURSOR', () => {
    it('should move cursor down', () => {
      const node = {
        type: 'proposal-inbox' as const,
        id: 'inbox-id',
        proposals: Array.from({ length: 5 }, (_, i) => ({ id: `prop-${i}` })),
        cursor: 0,
        createdAt: Date.now(),
      };
      const stateWithNode = { ...initialState, workspace: [node] };
      const action = { type: 'MOVE_CURSOR' as const, nodeId: 'inbox-id', direction: 'down' as const };
      const result = appReducer(stateWithNode, action);
      const updatedNode = result.workspace.find((n: any) => n.id === 'inbox-id');
      assert.equal(updatedNode?.cursor, 1);
    });

    it('should move cursor up', () => {
      const node = {
        type: 'proposal-inbox' as const,
        id: 'inbox-id',
        proposals: Array.from({ length: 5 }, (_, i) => ({ id: `prop-${i}` })),
        cursor: 2,
        createdAt: Date.now(),
      };
      const stateWithNode = { ...initialState, workspace: [node] };
      const action = { type: 'MOVE_CURSOR' as const, nodeId: 'inbox-id', direction: 'up' as const };
      const result = appReducer(stateWithNode, action);
      const updatedNode = result.workspace.find((n: any) => n.id === 'inbox-id');
      assert.equal(updatedNode?.cursor, 1);
    });

    it('should not move cursor beyond bounds', () => {
      const node = {
        type: 'proposal-inbox' as const,
        id: 'inbox-id',
        proposals: Array.from({ length: 3 }, (_, i) => ({ id: `prop-${i}` })),
        cursor: 2,
        createdAt: Date.now(),
      };
      const stateWithNode = { ...initialState, workspace: [node] };
      const action = { type: 'MOVE_CURSOR' as const, nodeId: 'inbox-id', direction: 'down' as const };
      const result = appReducer(stateWithNode, action);
      const updatedNode = result.workspace.find((n: any) => n.id === 'inbox-id');
      assert.equal(updatedNode?.cursor, 2);
    });
  });

  describe('SET_LOADING', () => {
    it('should set loading to true', () => {
      const result = appReducer(initialState, { type: 'SET_LOADING', loading: true });
      assert.equal(result.loading, true);
    });

    it('should set loading to false', () => {
      const loadingState = { ...initialState, loading: true };
      const result = appReducer(loadingState, { type: 'SET_LOADING', loading: false });
      assert.equal(result.loading, false);
    });
  });

  describe('SET_CHAT_SCROLL', () => {
    it('should set scroll offset', () => {
      const result = appReducer(initialState, { type: 'SET_CHAT_SCROLL', offset: 5 });
      assert.equal(result.chatScrollOffset, 5);
    });

    it('should not allow negative offset', () => {
      const result = appReducer(initialState, { type: 'SET_CHAT_SCROLL', offset: -3 });
      assert.equal(result.chatScrollOffset, 0);
    });
  });

  describe('SET_RAW_PENDING', () => {
    it('should set raw pending count', () => {
      const result = appReducer(initialState, { type: 'SET_RAW_PENDING', count: 42 });
      assert.equal(result.rawPendingCount, 42);
    });

    it('should update existing count', () => {
      const state = { ...initialState, rawPendingCount: 10 };
      const result = appReducer(state, { type: 'SET_RAW_PENDING', count: 0 });
      assert.equal(result.rawPendingCount, 0);
    });
  });

  describe('SET_COMPOSER_VALUE', () => {
    it('should set composer value', () => {
      const result = appReducer(initialState, { type: 'SET_COMPOSER_VALUE', value: 'hola' });
      assert.equal(result.composerValue, 'hola');
    });
  });

  describe('ADD_RECENT', () => {
    it('should add recent item and dedupe', () => {
      const state = { ...initialState, recentItems: ['b', 'c'] };
      const result = appReducer(state, { type: 'ADD_RECENT', item: 'a' });
      assert.deepEqual(result.recentItems, ['a', 'b', 'c']);
    });

    it('should move existing item to front', () => {
      const state = { ...initialState, recentItems: ['a', 'b', 'c'] };
      const result = appReducer(state, { type: 'ADD_RECENT', item: 'b' });
      assert.deepEqual(result.recentItems, ['b', 'a', 'c']);
    });

    it('should limit to 10 items', () => {
      const state = { ...initialState, recentItems: Array.from({ length: 10 }, (_, i) => `item-${i}`) };
      const result = appReducer(state, { type: 'ADD_RECENT', item: 'new' });
      assert.equal(result.recentItems.length, 10);
      assert.equal(result.recentItems[0], 'new');
    });
  });

  describe('PUSH_ACTIVITY_EVENT', () => {
    it('should prepend event and limit to 200', () => {
      const event = { type: 'agent:thinking' as const, message: 'test' };
      const result = appReducer(initialState, { type: 'PUSH_ACTIVITY_EVENT', event });
      assert.equal(result.activityEvents.length, 1);
      assert.equal(result.activityEvents[0].type, 'agent:thinking');
    });
  });

  describe('SET_LAST_INDEX_AT', () => {
    it('should set last index timestamp', () => {
      const result = appReducer(initialState, { type: 'SET_LAST_INDEX_AT', timestamp: 12345 });
      assert.equal(result.lastIndexAt, 12345);
    });
  });

  describe('Unknown actions', () => {
    it('should return unchanged state for unknown actions', () => {
      const action = { type: 'UNKNOWN_ACTION' } as any;
      const result = appReducer(initialState, action);
      assert.equal(result, initialState);
    });
  });
});
