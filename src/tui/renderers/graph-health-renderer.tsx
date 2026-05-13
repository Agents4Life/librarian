import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';
import { HealthCard } from '../components/health-card.js';

export const GraphHealthRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'graph-health') return null;

  const { summary } = node;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Graph Health</Text>
      <Text> </Text>

      <HealthCard
        title="Wiki"
        status={summary.status}
        metrics={[
          { label: 'Total wiki notes', value: summary.totalWikiNotes },
          { label: 'Orphan notes', value: summary.orphanNotes },
          { label: 'Stale notes', value: summary.staleNotes },
          { label: 'Incomplete notes', value: summary.incompleteNotes },
          { label: 'Broken links', value: summary.brokenLinks },
        ]}
      />

      <HealthCard
        title="Pipeline"
        status={summary.pendingProposals > 5 ? 'warning' : 'healthy'}
        metrics={[
          { label: 'Raw backlog', value: summary.rawBacklog },
          { label: 'Pending proposals', value: summary.pendingProposals },
          { label: 'Approved', value: summary.approvedProposals },
          { label: 'Applied', value: summary.appliedProposals },
        ]}
      />
    </Box>
  );
};
