import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

const COMMANDS = [
  { cmd: '/search <q>', desc: 'Buscar' },
  { cmd: '/status',     desc: 'Estado' },
  { cmd: '/process',    desc: 'Procesar raw/' },
  { cmd: '/review',     desc: 'Proposals' },
  { cmd: '/health',     desc: 'Salud' },
  { cmd: '/graph',      desc: 'Conexiones' },
  { cmd: '/orphans',    desc: 'Huérfanas' },
  { cmd: '/stale',      desc: 'Stale 90d' },
  { cmd: '/activity',   desc: 'Actividad' },
];

const KEYS = [
  { key: '1-4',  desc: 'Cambiar tab' },
  { key: 'j/k',  desc: 'Mover cursor' },
  { key: 'Enter', desc: 'Abrir detalle' },
  { key: 'a/r',  desc: 'Approve/Reject proposal' },
  { key: 'Esc',  desc: 'Volver' },
  { key: 'q',    desc: 'Salir' },
];

export const HelpRenderer: React.FC<RendererProps> = () => {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color={theme.primary}>Comandos</Text>
      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column">
          {COMMANDS.map((c) => (
            <Box key={c.cmd}>
              <Text color={theme.primary}>{c.cmd.padEnd(16)}</Text>
              <Text dimColor>{c.desc}</Text>
            </Box>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text bold color={theme.muted}>Teclas</Text>
          {KEYS.map((k) => (
            <Box key={k.key}>
              <Text color={theme.warning}>{k.key.padEnd(8)}</Text>
              <Text dimColor>{k.desc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Workflow: escribís en raw/ → /process → /review → approve → wiki/ se actualiza</Text>
      </Box>
    </Box>
  );
};
