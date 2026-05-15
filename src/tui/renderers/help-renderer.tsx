import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

const commands = [
  { slash: '/search', description: 'Buscar en la wiki', args: '<query>' },
  { slash: '/status', description: 'Estado del vault' },
  { slash: '/process', description: 'Procesar raw/' },
  { slash: '/review', description: 'Revisar propuestas pendientes' },
  { slash: '/graph', description: 'Mapa de conexiones' },
  { slash: '/orphans', description: 'Notas huérfanas' },
  { slash: '/stale', description: 'Notas sin tocar 90 días' },
  { slash: '/health', description: 'Graph health dashboard' },
  { slash: '/activity', description: 'Session activity log' },
];

const keyboardShortcuts = [
  { key: 'Esc', description: 'Salir del composer / volver' },
  { key: '1-4', description: 'Tabs: Chat, Inbox, Health, Help' },
  { key: 'j/k', description: 'Mover cursor en listas' },
  { key: 'Enter', description: 'Abrir detalle / acción' },
  { key: 'a/r', description: 'Approve/Reject proposals' },
  { key: '←/→', description: 'Páginas en resultados' },
  { key: 'q', description: 'Salir de la app' },
];

export const HelpRenderer: React.FC<RendererProps> = ({ node }) => {
  if (node.type !== 'help') return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Ayuda</Text>
      <Text> </Text>
      
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.primary}>Comandos</Text>
        <Text> </Text>
        {commands.map((cmd, i) => (
          <Box key={i} flexDirection="row" gap={2}>
            <Text color={theme.primary} bold>{cmd.slash}{cmd.args ? ` ${cmd.args}` : ''}</Text>
            <Text>{cmd.description}</Text>
          </Box>
        ))}
      </Box>
      
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.primary}>Atajos de teclado</Text>
        <Text> </Text>
        {keyboardShortcuts.map((shortcut, i) => (
          <Box key={i} flexDirection="row" gap={2}>
            <Text color={theme.muted} bold>[{shortcut.key}]</Text>
            <Text>{shortcut.description}</Text>
          </Box>
        ))}
      </Box>
      
      <Box flexDirection="column">
        <Text bold color={theme.primary}>Modos</Text>
        <Text> </Text>
        <Box flexDirection="row" gap={2}>
          <Text color={theme.primary} bold>✎ WRITE</Text>
          <Text>Modo escritura (composer enfocado)</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Text color={theme.warning} bold>⊞ NAV</Text>
          <Text>Modo navegación (teclas habilitadas)</Text>
        </Box>
      </Box>
    </Box>
  );
};