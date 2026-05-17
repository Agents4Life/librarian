import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

const COMMANDS = [
  { cmd: '/search <q>', desc: 'Buscar en vault' },
  { cmd: '/status', desc: 'Estado del vault' },
  { cmd: '/process', desc: 'Procesar raw/' },
  { cmd: '/review', desc: 'Proposals pendientes' },
  { cmd: '/health', desc: 'Salud del grafo' },
  { cmd: '/orphans', desc: 'Notas huérfanas' },
  { cmd: '/help', desc: 'Esta ayuda' },
];

export const HelpRenderer: React.FC<RendererProps> = () => {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>📖 Librarian</Text>
      <Text dimColor>Escribí un mensaje para chatear, o un /comando:</Text>
      <Text> </Text>
      {COMMANDS.map((c) => (
        <Box key={c.cmd}>
          <Text color={theme.primary}>{c.cmd.padEnd(18)}</Text>
          <Text dimColor>{c.desc}</Text>
        </Box>
      ))}
      <Text> </Text>
      <Text dimColor>Ctrl+C salir · Esc volver · 1-4 navegar</Text>
    </Box>
  );
};
