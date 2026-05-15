import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';

const TABS = [
  { key: '1', label: 'Chat', nodeType: 'chat' },
  { key: '2', label: 'Inbox', nodeType: 'proposal-inbox' },
  { key: '3', label: 'Health', nodeType: 'graph-health' },
  { key: '4', label: 'Help', nodeType: 'help' },
];

export const TabBar: React.FC = () => {
  const { state } = useAppState();
  const activeNode = state.workspace.find((n) => n.id === state.activeNodeId);
  const activeType = activeNode?.type;

  const inboxNode = state.workspace.find((n) => n.type === 'proposal-inbox');
  const inboxCount = inboxNode && inboxNode.type === 'proposal-inbox' ? inboxNode.proposals.length : 0;

  return (
    <Box gap={0}>
      {TABS.map((tab) => {
        const isActive = tab.nodeType === activeType;
        const bg = isActive ? theme.primary : undefined;
        const fg = isActive ? 'black' : theme.muted;
        const badge = tab.nodeType === 'proposal-inbox' && inboxCount > 0 ? ` (${inboxCount})` : '';

        return (
          <Box key={tab.key} gap={0}>
            <Text>{' '}</Text>
            <Text color={theme.muted}>{tab.key}</Text>
            <Text color={fg} backgroundColor={bg} bold={isActive}>
              {` ${tab.label}${badge} `}
            </Text>
            <Text>{' '}</Text>
          </Box>
        );
      })}
      {/* Dynamic tabs for open views */}
      {state.workspace
        .filter((n) => !TABS.some((t) => t.nodeType === n.type))
        .slice(-3)
        .map((node) => {
          const isActive = node.id === state.activeNodeId;
          const label = getNodeLabel(node);
          const bg = isActive ? theme.accent : undefined;
          const fg = isActive ? 'black' : theme.muted;
          return (
            <Box key={node.id}>
              <Text color={fg} backgroundColor={bg}>{` ${label} `}</Text>
              <Text>{' '}</Text>
            </Box>
          );
        })}
    </Box>
  );
};

const getNodeLabel = (node: { type: string; query?: string }): string => {
  switch (node.type) {
    case 'search': return `🔍 ${node.query?.slice(0, 15)}`;
    case 'status': return 'Status';
    case 'graph': return 'Graph';
    case 'process': return 'Process';
    case 'orphans': return 'Orphans';
    case 'stale': return 'Stale';
    case 'activity': return 'Activity';
    case 'proposal-detail': return 'Proposal';
    default: return node.type;
  }
};
