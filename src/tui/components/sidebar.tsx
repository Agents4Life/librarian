import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState, type WorkspaceNode } from '../state.js';

const navItems = [
  { label: 'Chat', nodeType: 'chat', key: '1' },
  { label: 'Inbox', nodeType: 'proposal-inbox', key: '2' },
  { label: 'Health', nodeType: 'graph-health', key: '3' },
  { label: 'Help', nodeType: 'help', key: '4' },
];

const getNodeLabel = (node: WorkspaceNode): string => {
  switch (node.type) {
    case 'help': return 'Help';
    case 'chat': return 'Chat';
    case 'proposal-inbox': return 'Inbox';
    case 'proposal-detail': return 'Detail';
    case 'search': return `🔍 ${node.query?.slice(0, 10)}`;
    case 'status': return 'Status';
    case 'graph': return 'Graph';
    case 'process': return 'Process';
    case 'orphans': return 'Orphans';
    case 'stale': return 'Stale';
    case 'graph-health': return 'Health';
    case 'activity': return 'Activity';
    case 'review': return 'Review';
  }
};

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useAppState();

  const activeNode = state.workspace.find((n) => n.id === state.activeNodeId);
  const activeType = activeNode?.type;

  const dynamicNodes = state.workspace.filter(
    (n) => !navItems.some((t) => t.nodeType === n.type) && n.id !== state.activeNodeId
  ).slice(-3);

  return (
    <Box flexDirection="column" width={14} borderStyle="single" borderRight={true} borderLeft={false} borderTop={false} borderBottom={false} borderColor={theme.borderSubtle} paddingX={1}>
      {navItems.map((item) => {
        const isActive = item.nodeType === activeType;
        return (
          <Box key={item.nodeType}>
            <Text color={isActive ? theme.primary : theme.muted}>
              {isActive ? '◉' : `${item.key}`}
            </Text>
            <Text color={isActive ? theme.primary : theme.muted}>
              {' '}{item.label}
            </Text>
          </Box>
        );
      })}
      {dynamicNodes.map((node) => {
        const isActive = node.id === state.activeNodeId;
        return (
          <Text key={node.id} color={isActive ? theme.primary : theme.muted}>
            {isActive ? '▶' : ' '} {getNodeLabel(node)}
          </Text>
        );
      })}
    </Box>
  );
};
