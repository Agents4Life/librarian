import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState, type WorkspaceNode } from '../state.js';

const navItems = [
  { label: 'Chat', nodeType: 'chat' },
  { label: 'Inbox', nodeType: 'proposal-inbox' },
  { label: 'Health', nodeType: 'graph-health' },
  { label: 'Activity', nodeType: 'activity' },
  { label: 'Search', nodeType: 'search' },
  { label: 'Status', nodeType: 'status' },
  { label: 'Review', nodeType: 'review' },
  { label: 'Graph', nodeType: 'graph' },
  { label: 'Process', nodeType: 'process' },
  { label: 'Orphans', nodeType: 'orphans' },
  { label: 'Stale', nodeType: 'stale' },
];

const getNodeLabel = (node: WorkspaceNode): string => {
  switch (node.type) {
    case 'chat': return 'Chat';
    case 'proposal-inbox': return 'Inbox';
    case 'proposal-detail': return 'Proposal';
    case 'search': return `Search: ${node.query}`;
    case 'review': return 'Review';
    case 'status': return 'Status';
    case 'graph': return 'Graph';
    case 'process': return 'Process';
    case 'orphans': return 'Orphans';
    case 'stale': return 'Stale';
    case 'graph-health': return 'Health';
    case 'activity': return 'Activity';
  }
};

export const Sidebar: React.FC = () => {
  const { state } = useAppState();

  const activeNode = state.workspace.find((n) => n.id === state.activeNodeId);
  const activeType = activeNode?.type;

  const hasNodeType = (type: string) => state.workspace.some((n) => n.type === type);

  return (
    <Box flexDirection="column" width={16} borderStyle="single" borderRight={true} borderLeft={false} borderTop={false} borderBottom={false} borderColor={theme.borderSubtle} paddingX={1}>
      {navItems.map((item) => {
        const isActive = item.nodeType === activeType;
        const exists = hasNodeType(item.nodeType);
        const icon = isActive ? theme.primary : exists ? theme.muted : theme.borderSubtle;

        return (
          <Box key={item.nodeType}>
            <Text color={icon}>{isActive ? '◉' : exists ? '○' : '·'}</Text>
            <Text color={isActive ? theme.primary : theme.muted}> {item.label}</Text>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color={theme.borderSubtle}>{'─'.repeat(14)}</Text>
      </Box>

      <Text color={theme.muted} bold>Recent</Text>
      {state.recentItems.slice(0, 5).map((item) => {
        const name = item.split('/').pop() ?? item;

        return (
          <Text key={item} color={theme.muted}> · {name.length > 12 ? name.slice(0, 12) + '…' : name}</Text>
        );
      })}
      {state.recentItems.length === 0 && <Text dimColor> · (empty)</Text>}

      {state.workspace.length > 1 && (
        <>
          <Box marginTop={1}>
            <Text color={theme.borderSubtle}>{'─'.repeat(14)}</Text>
          </Box>
          <Text color={theme.muted} bold>History</Text>
          {state.workspace.slice(-5).reverse().map((node) => {
            const isActive = node.id === state.activeNodeId;

            return (
              <Text key={node.id} color={isActive ? theme.primary : theme.muted}>
                {isActive ? '▶' : ' '} {getNodeLabel(node)}
              </Text>
            );
          })}
        </>
      )}
    </Box>
  );
};
