import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import { useAppState, type WorkspaceNode } from '../state.js';
import { getRenderer } from '../renderers/registry.js';

interface RendererSwitchProps {
  onAction?: (action: string) => void;
}

const OVERLAY_LABELS: Record<string, string> = {
  'graph-health': '/health',
  'orphans': '/orphans',
  'proposal-inbox': '/review',
  'proposal-detail': '/review',
  'activity': '/activity',
  'help': '/help',
  'search': '/search',
  'status': '/status',
  'graph': '/graph',
  'process': '/process',
  'stale': '/stale',
};

const OverlayHeader: React.FC<{ label: string }> = ({ label }) => (
  <Box>
    <Text dimColor>{`── ${label} · Esc para volver ──`}</Text>
  </Box>
);

export const RendererSwitch: React.FC<RendererSwitchProps> = ({ onAction }) => {
  const { state } = useAppState();
  const activeNode = state.workspace.find((n) => n.id === state.activeNodeId);

  if (!activeNode) {
    return (
      <Box padding={1}>
        <Text dimColor>No active workspace</Text>
      </Box>
    );
  }

  if (state.loading) {
    return (
      <Box padding={1}>
        <Text color={theme.primary}>◉ Procesando...</Text>
      </Box>
    );
  }

  const Renderer = getRenderer(activeNode.type);

  if (!Renderer) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color={theme.warning}>No renderer for: {activeNode.type}</Text>
        <Text dimColor>{JSON.stringify(activeNode, null, 2)}</Text>
      </Box>
    );
  }

  const overlayLabel = OVERLAY_LABELS[activeNode.type];

  return (
    <Box flexDirection="column">
      {overlayLabel && activeNode.type !== 'chat' && <OverlayHeader label={overlayLabel} />}
      <Renderer node={activeNode} onAction={onAction ?? (() => {})} />
    </Box>
  );
};
