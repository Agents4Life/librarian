import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';
import { HealthCard } from '../components/health-card.js';

const statusLabel: Record<string, { icon: string; color: string; text: string }> = {
  healthy: { icon: '✓', color: theme.success, text: 'Tu vault esta bien' },
  warning: { icon: '⚠', color: theme.warning, text: 'Tu vault necesita atencion' },
  critical: { icon: '✗', color: theme.error, text: 'Tu vault necesita ayuda urgente' },
};

export const GraphHealthRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'graph-health') return null;

  const { summary } = node;
  const status = statusLabel[summary.status] ?? statusLabel.healthy;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="row" gap={1}>
        <Text bold color={status.color}>{status.icon}</Text>
        <Text bold color={status.color}>{status.text}</Text>
      </Box>
      <Text> </Text>

      <HealthCard
        title={`Wiki: ${summary.totalWikiNotes} paginas`}
        status={summary.status}
        metrics={[
          { label: 'Paginas huerfanas', value: summary.orphanNotes, hint: summary.orphanNotes > 0 ? '(sin conexiones)' : '' },
          { label: 'Sin tocar hace 90d', value: summary.staleNotes, hint: summary.staleNotes > 0 ? '(pueden estar desactualizadas)' : '' },
          { label: 'Incompletas', value: summary.incompleteNotes, hint: summary.incompleteNotes > 0 ? '(sin contenido)' : '' },
          { label: 'Links rotos', value: summary.brokenLinks, hint: summary.brokenLinks > 0 ? '(apuntan a paginas que no existen)' : '' },
        ]}
      />

      <HealthCard
        title="Pendientes"
        status={summary.pendingProposals > 5 ? 'warning' : 'healthy'}
        metrics={[
          { label: 'Sin procesar', value: summary.rawBacklog, hint: summary.rawBacklog > 0 ? '(en carpeta raw/)' : '' },
          { label: 'Propuestas pendientes', value: summary.pendingProposals },
          { label: 'Propuestas aprobadas', value: summary.approvedProposals },
          { label: 'Aplicadas', value: summary.appliedProposals },
        ]}
      />
    </Box>
  );
};
