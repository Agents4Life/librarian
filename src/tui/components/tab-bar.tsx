import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState } from '../state.js';
import { Clickable } from './clickable.js';

interface TabItem {
  key: string;
  label: string;
  nodeType: string;
}

const TABS: TabItem[] = [
  { key: '1', label: 'Chat', nodeType: 'chat' },
  { key: '2', label: 'Inbox', nodeType: 'proposal-inbox' },
  { key: '3', label: 'Health', nodeType: 'graph-health' },
  { key: '4', label: 'Help', nodeType: 'help' },
];

export const TabBar: React.FC = () => {
  const { state, dispatch } = useAppState();
  const activeNode = state.workspace.find((n: any) => n.id === state.activeNodeId);
  const activeType = activeNode?.type;

  const inboxNode = state.workspace.find((n: any) => n.type === 'proposal-inbox');
  const inboxCount = inboxNode && inboxNode.type === 'proposal-inbox' ? inboxNode.proposals.length : 0;

  const handleTabClick = (nodeType: string) => {
    // Find or create the node for this tab
    let node = state.workspace.find((n: any) => n.type === nodeType);
    
    if (!node) {
      node = {
        type: nodeType,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        ...(nodeType === 'chat' && { messages: [] }),
        ...(nodeType === 'activity' && { events: state.activityEvents, cursor: 0 }),
        ...(nodeType === 'proposal-inbox' && { proposals: [], cursor: 0 }),
      };
    }
    
    dispatch({ type: 'SET_ACTIVE_NODE', id: node.id });
  };

  return (
    <Box gap={0}>
      {TABS.map((tab) => {
        const isActive = tab.nodeType === activeType;
        const bg = isActive ? theme.primary : undefined;
        const fg = isActive ? 'black' : theme.muted;
        const badge = tab.nodeType === 'proposal-inbox' && inboxCount > 0 ? ` (${inboxCount})` : '';
        const hasNewContent = tab.nodeType === 'proposal-inbox' && inboxCount > 0;

        return (
          <Box key={tab.key} gap={0}>
            <Text color={theme.muted}>{tab.key}</Text>
            <Clickable
              onClick={() => handleTabClick(tab.nodeType)}
              hoverText={isActive ? 'current' : 'click to switch'}
              active={isActive}
            >
              <Text color={fg} backgroundColor={bg} bold={isActive}>
                {` ${tab.label}${badge} `}
              </Text>
              {hasNewContent && (
                <Text color={theme.warning} backgroundColor={bg}>
                  ●
                </Text>
              )}
            </Clickable>
            <Text>{' '}</Text>
          </Box>
        );
      })}
      
      {/* Dynamic tabs for open views */}
      {state.workspace
        .filter((n: any) => !TABS.some((t) => t.nodeType === n.type))
        .slice(-3)
        .map((node: any) => {
          const isActive = node.id === state.activeNodeId;
          const label = getNodeLabel(node);
          const bg = isActive ? theme.accent : undefined;
          const fg = isActive ? 'black' : theme.muted;
          
          return (
            <Box key={node.id}>
              <Clickable
                onClick={() => dispatch({ type: 'SET_ACTIVE_NODE', id: node.id })}
                hoverText={isActive ? 'current' : 'click to switch'}
                active={isActive}
              >
                <Text color={fg} backgroundColor={bg}>
                  {` ${label} `}
                </Text>
              </Clickable>
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