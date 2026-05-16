import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';

export const TABS = [
  { key: '1', label: 'Chat', nodeType: 'chat' },
  { key: '2', label: 'Revisar', nodeType: 'proposal-inbox' },
  { key: '3', label: 'Salud', nodeType: 'graph-health' },
  { key: '4', label: 'Ayuda', nodeType: 'help' },
];

export const TabBar: React.FC = () => {
  const { state } = useAppState();
  const activeNode = state.workspace.find((n) => n.id === state.activeNodeId);
  const activeType = activeNode?.type;

  const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
  const inboxCount = inboxNode && inboxNode.type === 'proposal-inbox' ? inboxNode.proposals.length : 0;

  return (
    <Box flexDirection="row">
      {TABS.map((tab, i) => {
        const isActive = tab.nodeType === activeType;
        const badge = tab.nodeType === 'proposal-inbox' && inboxCount > 0 ? ` ${inboxCount}` : '';
        return (
          <React.Fragment key={tab.key}>
            <Text backgroundColor={isActive ? theme.primary : undefined} color={isActive ? 'black' : theme.muted} bold={isActive}>
              {` ${tab.key} ${tab.label}${badge} `}
            </Text>
            {i < TABS.length - 1 && <Text dimColor> · </Text>}
          </React.Fragment>
        );
      })}
      <Text dimColor>   Tab cambia vista</Text>
    </Box>
  );
};

export const TAB_ORDER = ['chat', 'proposal-inbox', 'graph-health', 'help'] as const;
