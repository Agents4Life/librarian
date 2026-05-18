import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appReducer, createInitialState, navigateTo } from '../../src/tui/state.js';
import type { AppState, WorkspaceNode } from '../../src/tui/state.js';

describe('Focus and Navigation System', () => {
  const base = createInitialState('/test/vault');

  describe('navigateTo', () => {
    it('should append node to workspace and history', () => {
      const node: WorkspaceNode = { type: 'help', id: 'new-help', createdAt: Date.now() };
      const patch = navigateTo(node, base);
      assert.ok(patch.workspace!.includes(node));
      assert.equal(patch.activeNodeId, 'new-help');
      assert.deepEqual(patch.navigationHistory, [...base.navigationHistory, 'new-help']);
      assert.equal(patch.historyIndex, base.navigationHistory.length);
    });

    it('should truncate forward history when navigating from middle', () => {
      const stateWithHistory: AppState = {
        ...base,
        navigationHistory: ['a', 'b', 'c'],
        historyIndex: 0,
      };
      const node: WorkspaceNode = { type: 'help', id: 'd', createdAt: Date.now() };
      const patch = navigateTo(node, stateWithHistory);
      assert.deepEqual(patch.navigationHistory, ['a', 'd']);
      assert.equal(patch.historyIndex, 1);
    });
  });

  describe('focused pane cycling', () => {
    it('should switch between composer and navigation', () => {
      const nav = appReducer(base, { type: 'SET_FOCUSED_PANE', pane: 'navigation' });
      assert.equal(nav.focusedPane, 'navigation');
      const back = appReducer(nav, { type: 'SET_FOCUSED_PANE', pane: 'composer' });
      assert.equal(back.focusedPane, 'composer');
    });
  });

  describe('integration: navigate then go back and forward', () => {
    it('should maintain correct history through back/forward', () => {
      let state = base;
      const nodeA: WorkspaceNode = { type: 'help', id: 'a', createdAt: 1 };
      const nodeB: WorkspaceNode = { type: 'help', id: 'b', createdAt: 2 };
      state = { ...state, ...navigateTo(nodeA, state) } as AppState;
      state = { ...state, ...navigateTo(nodeB, state) } as AppState;
      assert.equal(state.activeNodeId, 'b');

      state = appReducer(state, { type: 'NAVIGATE_BACK' });
      assert.equal(state.activeNodeId, 'a');

      state = appReducer(state, { type: 'NAVIGATE_FORWARD' });
      assert.equal(state.activeNodeId, 'b');
    });
  });
});
