import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

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
  if (node.type !== 'activity') return null;

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
      <Text bold color={theme.primary}>Activity</Text>
      <Text dimColor>{events.length} event{events.length !== 1 ? 's' : ''} this session</Text>
      <Text> </Text>

      {events.map((event) => {
        const cfg = eventIcons[event.type] ?? { icon: '·', color: theme.muted };
        return (
          <Box key={event.id} flexDirection="row" gap={1}>
            <Text color={cfg.color}>{cfg.icon}</Text>
            <Box flexGrow={1}>
              <Text>{event.message}</Text>
            </Box>
            <Text dimColor>{formatTimeAgo(event.createdAt)}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
