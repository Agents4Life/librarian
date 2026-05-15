import React, { useEffect, useReducer, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import { AppStateContext, appReducer, createInitialState } from './state.js';
import { registerRenderer } from './renderers/registry.js';
import { ChatRenderer } from './renderers/chat-renderer.js';
import { SearchRenderer } from './renderers/search-renderer.js';
import { WikiStatusRenderer } from './renderers/wiki-status-renderer.js';
import { GraphRenderer } from './renderers/graph-renderer.js';
import { ProcessRenderer } from './renderers/process-renderer.js';
import { OrphansRenderer } from './renderers/orphans-renderer.js';
import { StaleRenderer } from './renderers/stale-renderer.js';
import { ProposalInboxRenderer } from './renderers/proposal-inbox-renderer.js';
import { ProposalDetailRenderer } from './renderers/proposal-detail-renderer.js';
import { GraphHealthRenderer } from './renderers/graph-health-renderer.js';
import { ActivityRenderer } from './renderers/activity-renderer.js';
import { HelpRenderer } from './renderers/help-renderer.js';
import { StatusBar } from './components/status-bar.js';
import { TabBar } from './components/tab-bar.js';
import { Composer } from './components/composer.js';
import { RendererSwitch } from './components/renderer-switch.js';
import { useIndex } from './hooks/use-index.js';
import { useProposals } from './hooks/use-proposals.js';
import { useActivity } from './hooks/use-activity.js';
import { useComposer } from './hooks/use-composer.js';
import { defaultConfig } from '../config.js';
import { theme } from './theme.js';

registerRenderer('chat', ChatRenderer);
registerRenderer('search', SearchRenderer);
registerRenderer('status', WikiStatusRenderer);
registerRenderer('graph', GraphRenderer);
registerRenderer('process', ProcessRenderer);
registerRenderer('orphans', OrphansRenderer);
registerRenderer('stale', StaleRenderer);
registerRenderer('proposal-inbox', ProposalInboxRenderer);
registerRenderer('proposal-detail', ProposalDetailRenderer);
registerRenderer('graph-health', GraphHealthRenderer);
registerRenderer('activity', ActivityRenderer);
registerRenderer('help', HelpRenderer);

const TAB_MAP: Record<string, string> = {
  '1': 'chat',
  '2': 'proposal-inbox',
  '3': 'graph-health',
  '4': 'help',
};

export const App: React.FC = () => {
  const { exit } = useApp();
  const [state, dispatch] = useReducer(appReducer, defaultConfig.vaultPath, createInitialState);

  const { checkOllama, buildIndex } = useIndex(dispatch);
  const { subscribe } = useActivity(dispatch);
  const { loadProposalInbox, approve, reject, retry, reset, openDetail } = useProposals(state, dispatch);
  const { handleComposerSubmit } = useComposer(state, dispatch, { loadProposalInbox });

  useEffect(() => {
    checkOllama();
    buildIndex(state.vaultPath);
    return subscribe();
  }, [checkOllama, buildIndex, state.vaultPath, subscribe]);

  const handleRendererAction = async (action: string) => {
    if (action.startsWith('open-detail:')) { openDetail(action.split(':')[1]); return; }
    if (action.startsWith('approve:')) { await approve(action.split(':')[1]); return; }
    if (action.startsWith('reject:')) { await reject(action.split(':')[1]); return; }
    if (action.startsWith('retry:')) { await retry(action.split(':')[1]); return; }
    if (action.startsWith('reset:')) { await reset(action.split(':')[1]); return; }
    if (action === 'back-to-inbox') { dispatch({ type: 'NAVIGATE_BACK' }); }
  };

  const switchToTab = useCallback((nodeType: string) => {
    const node = state.workspace.find((n) => n.type === nodeType);
    if (node) {
      dispatch({ type: 'SET_ACTIVE_NODE', id: node.id });
    }
  }, [state.workspace, dispatch]);

  useInput((input, key) => {
    const inComposer = state.focusedPane === 'composer';

    // Esc: always unfocus composer → navigation mode
    if (key.escape) {
      dispatch({ type: 'SET_FOCUSED_PANE', pane: 'navigation' });
      return;
    }

    // In navigation mode
    if (!inComposer) {
      // Enter or i: re-focus composer
      if (key.return || input === 'i') {
        dispatch({ type: 'SET_FOCUSED_PANE', pane: 'composer' });
        return;
      }

      // Number keys switch tabs
      if (TAB_MAP[input]) {
        switchToTab(TAB_MAP[input]);
        return;
      }

      // q: quit
      if (input === 'q') {
        exit();
        return;
      }

      return; // ignore other keys in nav mode
    }

    // In composer mode: number keys and q go to input, only Esc exits
  });

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      <Box flexDirection="column" height="100%">
        {/* Row 1: Status bar */}
        <Box paddingX={1}>
          <StatusBar />
        </Box>

        {/* Row 2: Tab bar + mode indicator */}
        <Box paddingX={1} justifyContent="space-between">
          <TabBar />
          <Text color={state.focusedPane === 'composer' ? theme.primary : theme.warning} bold>
            {state.focusedPane === 'composer' ? '✎ WRITE' : '⊞ NAV'}
          </Text>
        </Box>

        {/* Separator */}
        <Box>
          <Text color={theme.borderSubtle}>{'─'.repeat(80)}</Text>
        </Box>

        {/* Row 3: Content */}
        <Box flexDirection="column" flexGrow={1}>
          <RendererSwitch onAction={handleRendererAction} />
        </Box>

        {/* Row 4: Composer */}
        <Composer onSubmit={handleComposerSubmit} />
      </Box>
    </AppStateContext.Provider>
  );
};
