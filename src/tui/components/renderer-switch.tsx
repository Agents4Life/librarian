import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../state.js';
import type { WorkspaceNode } from '../renderers/types.js';
import { theme } from '../theme.js';

export const RendererSwitch: React.FC<{
  onAction?: (action: string) => void;
}> = ({ onAction }) => {
  const { state } = useAppState();
  const activeNode = state.workspace.find((n: WorkspaceNode) => n.id === state.activeNodeId);

  if (!activeNode) {
    return (
      <Box padding={1}>
        <Text dimColor>No active workspace</Text>
        <Text color="green" marginTop={1}>
          🖱️ Mouse support: Hover over elements to see interactions
        </Text>
      </Box>
    );
  }

  if (state.loading) {
    return (
      <Box padding={1}>
        <Box flexDirection="row" gap={2}>
          <Text color={theme.primary}>◉ Procesando...</Text>
          <Text color="green">🖱️ Mouse active</Text>
        </Box>
      </Box>
    );
  }

  // Simple renderer switching
  switch (activeNode.type) {
    case 'chat':
      return (
        <Box padding={1}>
          <Text bold color={theme.primary}>Chat</Text>
          <Text dimColor>Click on tabs to navigate</Text>
          <Text color="green" marginTop={1}>🖱️ Mouse support enabled</Text>
        </Box>
      );
    
    case 'proposal-inbox':
      return (
        <Box padding={1}>
          <Text bold color={theme.primary}>Proposals</Text>
          <Text dimColor>Click on items to open details</Text>
          <Text color="green" marginTop={1}>🖱️ Mouse support enabled</Text>
        </Box>
      );
    
    case 'help':
      return (
        <Box padding={1}>
          <Text bold color={theme.primary}>Help</Text>
          <Text dimColor>Click on tabs to switch views</Text>
          <Box marginTop={1}>
            <Text color="green" bold>🖱️ Mouse Support</Text>
            <Text dimColor>• Hover over elements to see highlights</Text>
            <Text dimColor>• Click to execute actions</Text>
            <Text dimColor>• Use keyboard for faster navigation</Text>
          </Box>
        </Box>
      );
    
    default:
      return (
        <Box padding={1}>
          <Text bold color={theme.primary}>{activeNode.type}</Text>
          <Text dimColor>Interactive TUI with mouse support</Text>
          <Text color="green" marginTop={1}>🖱️ Mouse support enabled</Text>
        </Box>
      );
  }
};