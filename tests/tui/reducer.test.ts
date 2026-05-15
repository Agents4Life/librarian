import { describe, it, expect } from 'node:test';
import { appReducer, createInitialState } from '../state.js';

describe('TUI State Reducer', () => {
  const initialState = createInitialState('/test/vault');

  describe('SET_FOCUSED_PANE', () => {
    it('should update focused pane', () => {
      const action = { type: 'SET_FOCUSED_PANE' as const, pane: 'navigation' as const };
      const state = appReducer(initialState, action);
      
      expect(state.focusedPane).toBe('navigation');
    });
  });

  describe('SET_ACTIVE_NODE', () => {
    it('should set active node when node exists', () => {
      const node = { type: 'help' as const, id: 'test-id', createdAt: Date.now() };
      const stateWithNode = { ...initialState, workspace: [node] };
      const action = { type: 'SET_ACTIVE_NODE' as const, id: 'test-id' };
      
      const result = appReducer(stateWithNode, action);
      
      expect(result.activeNodeId).toBe('test-id');
      expect(result.navigationHistory).toContain('test-id');
      expect(result.historyIndex).toBe(0);
    });

    it('should add node to history if not present', () => {
      const node = { type: 'help' as const, id: 'new-id', createdAt: Date.now() };
      const stateWithNode = { ...initialState, workspace: [node] };
      const action = { type: 'SET_ACTIVE_NODE' as const, id: 'new-id' };
      
      const result = appReducer(stateWithNode, action);
      
      expect(result.navigationHistory).toEqual(['new-id']);
      expect(result.historyIndex).toBe(0);
    });

    it('should update history index for existing node', () => {
      const node = { type: 'help' as const, id: 'existing-id', createdAt: Date.now() };
      const stateWithHistory = {
        ...initialState,
        workspace: [node],
        navigationHistory: ['old-id', 'existing-id', 'future-id'],
        historyIndex: 2
      };
      const action = { type: 'SET_ACTIVE_NODE' as const, id: 'existing-id' };
      
      const result = appReducer(stateWithHistory, action);
      
      expect(result.historyIndex).toBe(1); // Should point to existing position
    });
  });

  describe('NAVIGATE_BACK', () => {
    it('should go back in history', () => {
      const stateWithHistory = {
        ...initialState,
        navigationHistory: ['node1', 'node2', 'node3'],
        historyIndex: 2,
        activeNodeId: 'node3'
      };
      const action = { type: 'NAVIGATE_BACK' as const };
      
      const result = appReducer(stateWithHistory, action);
      
      expect(result.historyIndex).toBe(1);
      expect(result.activeNodeId).toBe('node2');
    });

    it('should not go back when at start', () => {
      const stateWithHistory = {
        ...initialState,
        navigationHistory: ['node1', 'node2'],
        historyIndex: 0,
        activeNodeId: 'node1'
      };
      const action = { type: 'NAVIGATE_BACK' as const };
      
      const result = appReducer(stateWithHistory, action);
      
      expect(result).toEqual(stateWithHistory); // Should not change
    });
  });

  describe('NAVIGATE_FORWARD', () => {
    it('should go forward in history', () => {
      const stateWithHistory = {
        ...initialState,
        navigationHistory: ['node1', 'node2', 'node3'],
        historyIndex: 0,
        activeNodeId: 'node1'
      };
      const action = { type: 'NAVIGATE_FORWARD' as const };
      
      const result = appReducer(stateWithHistory, action);
      
      expect(result.historyIndex).toBe(1);
      expect(result.activeNodeId).toBe('node2');
    });

    it('should not go forward when at end', () => {
      const stateWithHistory = {
        ...initialState,
        navigationHistory: ['node1', 'node2'],
        historyIndex: 1,
        activeNodeId: 'node2'
      };
      const action = { type: 'NAVIGATE_FORWARD' as const };
      
      const result = appReducer(stateWithHistory, action);
      
      expect(result).toEqual(stateWithHistory); // Should not change
    });
  });

  describe('UPDATE_NODE', () => {
    it('should update node properties', () => {
      const node = { type: 'chat' as const, id: 'chat-id', messages: [], createdAt: Date.now() };
      const stateWithNode = { ...initialState, workspace: [node] };
      const patch = { messages: [{ role: 'user' as const, content: 'hello' }] };
      const action = { type: 'UPDATE_NODE' as const, id: 'chat-id', patch };
      
      const result = appReducer(stateWithNode, action);
      const updatedNode = result.workspace.find((n: any) => n.id === 'chat-id');
      
      expect(updatedNode?.messages).toEqual(patch.messages);
    });

    it('should not update other nodes', () => {
      const node1 = { type: 'chat' as const, id: 'chat-id', messages: [], createdAt: Date.now() };
      const node2 = { type: 'help' as const, id: 'help-id', createdAt: Date.now() };
      const stateWithNodes = { ...initialState, workspace: [node1, node2] };
      const action = { type: 'UPDATE_NODE' as const, id: 'chat-id', patch: { messages: ['test'] } };
      
      const result = appReducer(stateWithNodes, action);
      const helpNode = result.workspace.find((n: any) => n.id === 'help-id');
      
      expect(helpNode).toEqual(node2); // Should be unchanged
    });
  });

  describe('PUSH_ACTIVITY', () => {
    it('should add activity entry', () => {
      const entry = { icon: '✓', color: 'green', message: 'Test message' };
      const action = { type: 'PUSH_ACTIVITY' as const, entry };
      
      const result = appReducer(initialState, action);
      
      expect(result.activityLog).toHaveLength(1);
      expect(result.activityLog[0]).toMatchObject(entry);
      expect(result.activityLog[0]).toHaveProperty('id');
      expect(result.activityLog[0]).toHaveProperty('timestamp');
    });

    it('should limit activity log to 50 entries', () => {
      // Create state with 50 entries
      const fiftyEntries = Array(50).fill(null).map((_, i) => ({
        id: `entry-${i}`,
        timestamp: Date.now() - i,
        icon: '•',
        color: 'gray',
        message: `Message ${i}`
      }));
      const stateWithFifty = { ...initialState, activityLog: fiftyEntries };
      
      const action = { type: 'PUSH_ACTIVITY' as const, entry: { icon: '✓', color: 'green', message: 'New entry' } };
      const result = appReducer(stateWithFifty, action);
      
      expect(result.activityLog).toHaveLength(50);
      expect(result.activityLog[0].message).toBe('New entry'); // New entry should be first
      expect(result.activityLog[49].message).toBe('Message 0'); // Oldest entry should be last
    });
  });

  describe('MOVE_CURSOR', () => {
    it('should move cursor down', () => {
      const node = { 
        type: 'proposal-inbox' as const, 
        id: 'inbox-id', 
        proposals: Array(5).fill(null).map((_, i) => ({ id: `prop-${i}` })),
        cursor: 0,
        createdAt: Date.now() 
      };
      const stateWithNode = { ...initialState, workspace: [node] };
      const action = { type: 'MOVE_CURSOR' as const, nodeId: 'inbox-id', direction: 'down' as const };
      
      const result = appReducer(stateWithNode, action);
      const updatedNode = result.workspace.find((n: any) => n.id === 'inbox-id');
      
      expect(updatedNode?.cursor).toBe(1);
    });

    it('should move cursor up', () => {
      const node = { 
        type: 'proposal-inbox' as const, 
        id: 'inbox-id', 
        proposals: Array(5).fill(null).map((_, i) => ({ id: `prop-${i}` })),
        cursor: 2,
        createdAt: Date.now() 
      };
      const stateWithNode = { ...initialState, workspace: [node] };
      const action = { type: 'MOVE_CURSOR' as const, nodeId: 'inbox-id', direction: 'up' as const };
      
      const result = appReducer(stateWithNode, action);
      const updatedNode = result.workspace.find((n: any) => n.id === 'inbox-id');
      
      expect(updatedNode?.cursor).toBe(1);
    });

    it('should not move cursor beyond bounds', () => {
      const node = { 
        type: 'proposal-inbox' as const, 
        id: 'inbox-id', 
        proposals: Array(3).fill(null).map((_, i) => ({ id: `prop-${i}` })),
        cursor: 2,
        createdAt: Date.now() 
      };
      const stateWithNode = { ...initialState, workspace: [node] };
      const action = { type: 'MOVE_CURSOR' as const, nodeId: 'inbox-id', direction: 'down' as const };
      
      const result = appReducer(stateWithNode, action);
      const updatedNode = result.workspace.find((n: any) => n.id === 'inbox-id');
      
      expect(updatedNode?.cursor).toBe(2); // Should not go beyond last item
    });
  });

  describe('Unknown actions', () => {
    it('should return unchanged state for unknown actions', () => {
      const action = { type: 'UNKNOWN_ACTION' as any };
      
      const result = appReducer(initialState, action);
      
      expect(result).toBe(initialState);
    });
  });
});