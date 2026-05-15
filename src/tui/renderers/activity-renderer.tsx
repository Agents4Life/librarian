import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';
import type { WorkspaceNode } from './types.js';

const PAGE_SIZE = 15;

interface ActivityState {
  page: number;
  maxPage: number;
}

const eventIcons: Record<string, { icon: string; color: string }> = {
  'review:approved': { icon: '✓', color: theme.success },
  'review:rejected': { icon: '✗', color: theme.error },
  'proposal:applied': { icon: '◆', color: theme.accent },
  'pipeline:processed': { icon: '◎', color: theme.primary },
  'index:rebuilt': { icon: '⟳', color: theme.primary },
};

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export const ActivityRenderer: React.FC<RendererProps> = ({ node }) => {
  const [state, setState] = React.useState<ActivityState>(() => {
    const maxPage = Math.max(0, Math.ceil(node.events.length / PAGE_SIZE) - 1);
    return { page: 0, maxPage };
  });

  if (node.type !== 'activity') return null;

  const startIdx = state.page * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const visible = node.events.slice(startIdx, endIdx);

  const nextPage = () => setState(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.maxPage) }));
  const prevPage = () => setState(prev => ({ ...prev, page: Math.max(prev.page - 1, 0) }));

  const { events } = node;

  if (events.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color={theme.primary}>Activity</Text>
        <Text> </Text>
        <Text dimColor>No activity in this session.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Box gap={1}>
          <Text bold color={theme.primary}>Activity</Text>
          <Text dimColor>{events.length} event{events.length !== 1 ? 's' : ''} this session</Text>
        </Box>
        <Text dimColor>{state.page + 1}/{state.maxPage + 1}</Text>
      </Box>
      <Text> </Text>

      {visible.map((event) => {
        const cfg = eventIcons[event.type] ?? { icon: '·', color: theme.muted };
        return (
          <Box key={event.id} flexDirection="row" gap={1} marginBottom={1}>
            <Text color={cfg.color}>{cfg.icon}</Text>
            <Box flexGrow={1}>
              <Text>{event.message}</Text>
            </Box>
            <Text dimColor>{formatTimeAgo(event.createdAt)}</Text>
          </Box>
        );
      })}
      
      {events.length > PAGE_SIZE && (
        <Box justifyContent="space-between" marginTop={1}>
          <Text dimColor>[←/→] página anterior/siguiente</Text>
          <Text dimColor>{startIdx + 1}-{Math.min(endIdx, events.length)} de {events.length} eventos</Text>
        </Box>
      )}
    </Box>
  );
};