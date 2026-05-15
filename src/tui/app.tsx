import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useAppState } from '../state.js';
import { StatusBar } from './status-bar.js';
import { TabBar } from './tab-bar.js';
import { RendererSwitch } from './renderer-switch.js';
import { Composer } from './composer.js';

export const App: React.FC = () => {
  const { exit } = useApp();
  const { state, dispatch } = useAppState();

  // Keyboard navigation
  useInput((input, key) => {
    // Global shortcuts
    if (key.escape) {
      dispatch({ type: 'SET_FOCUSED_PANE', pane: 'navigation' });
      return;
    }
    
    if (input === 'i' || input === 'I') {
      dispatch({ type: 'SET_FOCUSED_PANE', pane: 'composer' });
      return;
    }
    
    if (input === 'q') {
      exit();
      return;
    }
    
    // Quick tab navigation (when not in composer mode)
    if (state.focusedPane === 'navigation') {
      switch (input) {
        case '1': {
          const chatNode = state.workspace.find((n: any) => n.type === 'chat') || { type: 'chat', id: crypto.randomUUID(), messages: [], createdAt: Date.now() };
          dispatch({ type: 'SET_ACTIVE_NODE', id: chatNode.id });
          break;
        }
        case '2': {
          const inboxNode = state.workspace.find((n: any) => n.type === 'proposal-inbox');
          if (inboxNode) {
            dispatch({ type: 'SET_ACTIVE_NODE', id: inboxNode.id });
          }
          break;
        }
        case '3': {
          const healthNode = state.workspace.find((n: any) => n.type === 'graph-health') || { type: 'graph-health', id: crypto.randomUUID(), summary: null, createdAt: Date.now() };
          dispatch({ type: 'SET_ACTIVE_NODE', id: healthNode.id });
          break;
        }
        case '4': {
          const helpNode = state.workspace.find((n: any) => n.type === 'help') || { type: 'help', id: crypto.randomUUID(), createdAt: Date.now() };
          dispatch({ type: 'SET_ACTIVE_NODE', id: helpNode.id });
          break;
        }
      }
    }
  });

  const handleRendererAction = (action: string) => {
    if (action.startsWith('open-detail:')) {
      const proposalId = action.split(':')[1];
      const inboxNode = state.workspace.find((n: any) => n.type === 'proposal-inbox');
      if (inboxNode && inboxNode.type === 'proposal-inbox') {
        const proposal = inboxNode.proposals.find((p: any) => p.id === proposalId);
        if (proposal) {
          dispatch({
            type: 'ADD_NODE',
            node: {
              type: 'proposal-detail',
              id: crypto.randomUUID(),
              proposal,
              showPreview: false,
              createdAt: Date.now()
            }
          });
        }
      }
    } else if (action.startsWith('approve:')) {
      // Handle approve action
    } else if (action.startsWith('reject:')) {
      // Handle reject action
    } else if (action === 'back-to-inbox') {
      const inboxNode = state.workspace.find((n: any) => n.type === 'proposal-inbox');
      if (inboxNode) {
        dispatch({ type: 'SET_ACTIVE_NODE', id: inboxNode.id });
      }
    }
  };

  const handleComposerSubmit = async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // Simple command handling for demo
    if (trimmed.startsWith('/')) {
      console.log(`Executing command: ${trimmed}`);
    } else {
      console.log(`Chat message: ${trimmed}`);
    }
    dispatch({ type: 'SET_COMPOSER_VALUE', value: '' });
  };

  return (
    <Box flexDirection="column">
      {/* Status Bar */}
      <StatusBar />
      
      {/* Tab Bar */}
      <TabBar />
      
      {/* Main Content Area */}
      <Box>
        <Box borderStyle="single" borderColor={theme.muted}>
          <RendererSwitch 
            onAction={handleRendererAction}
          />
        </Box>
      </Box>
      
      {/* Composer */}
      <Box borderTop borderStyle="single" borderColor={theme.muted}>
        <Composer
          value={state.composerValue}
          onChange={(value: any) => dispatch({ type: 'SET_COMPOSER_VALUE', value })}
          onSubmit={handleComposerSubmit}
          focused={state.focusedPane === 'composer'}
          onFocus={() => dispatch({ type: 'SET_FOCUSED_PANE', pane: 'composer' })}
          onBlur={() => dispatch({ type: 'SET_FOCUSED_PANE', pane: 'navigation' })}
        />
      </Box>
    </Box>
  );
};