import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../theme.js';
import type { RendererProps } from './registry.js';

const COMMANDS = [
  { cmd: '/search <query>', desc: 'Buscar en el vault (raw + wiki)' },
  { cmd: '/status', desc: 'Estado general del vault' },
  { cmd: '/process', desc: 'Procesar notas nuevas en raw/' },
  { cmd: '/review', desc: 'Ver proposals pendientes' },
  { cmd: '/health', desc: 'Dashboard de salud del vault' },
  { cmd: '/graph', desc: 'Mapa de conexiones entre notas' },
  { cmd: '/orphans', desc: 'Notas sin incoming links' },
  { cmd: '/stale', desc: 'Notas sin tocar en 90+ días' },
  { cmd: '/activity', desc: 'Log de actividad de la sesión' },
  { cmd: '/help', desc: 'Esta pantalla de ayuda' },
];

const KEYBINDINGS = [
  { key: 'Enter', desc: 'Enviar mensaje o comando' },
  { key: 'Esc', desc: 'Volver a la pantalla anterior' },
  { key: 'q', desc: 'Salir de Librarian (composer vacío)' },
];

const WORKFLOW = [
  { step: '1', action: 'Escribís en raw/ (Obsidian)' },
  { step: '2', action: '/process → Librarian genera proposals' },
  { step: '3', action: '/review → ves proposals pendientes' },
  { step: '4', action: 'Enter en un proposal → approve o reject' },
  { step: '5', action: '/status → verificás que el wiki creció' },
];

const CLI_COMMANDS = [
  { cmd: 'librarian init', desc: 'Scaffolding del vault (carpetas + templates)' },
  { cmd: 'librarian proposals', desc: 'Listar proposals por estado' },
  { cmd: 'librarian preview <id>', desc: 'Ver preview de un proposal' },
  { cmd: 'librarian approve <id>', desc: 'Aprobar un proposal' },
  { cmd: 'librarian reject <id>', desc: 'Rechazar un proposal' },
  { cmd: 'librarian apply <id>', desc: 'Aplicar un proposal aprobado' },
  { cmd: 'librarian lint', desc: 'Health check completo del vault' },
  { cmd: 'librarian claims', desc: 'Detectar contradicciones' },
  { cmd: 'librarian save-chat --q "..." --a "..."', desc: 'Guardar Q&A como proposal' },
];

const VAULT_STRUCTURE = `vault/
  raw/                  ← Tu contenido (Librarian lee)
    1-proyectos/        ← Proyectos con deadline
    2-areas/            ← Responsabilidades continuas
    3-recursos/         ← Referencias
    4-archivo/          ← Inactivos
    daily/              ← Notas diarias
    inbox/              ← Captura rápida
  wiki/                 ← Curado por Librarian (escribe)
    conceptos/          ← Páginas de conceptos
    entidades/          ← Páginas de entidades
    sources/            ← Índice de fuentes
    synthesis/          ← Síntesis
  templates/            ← Templates de notas
  reports/              ← Reportes de salud
  reviews/              ← Proposals exportados`;

export const HelpRenderer: React.FC<RendererProps> = () => {
  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>📖 Librarian — Guía de Uso</Text>
      </Box>

      {/* Two ways to use */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.muted}>Dos modos de uso</Text>
        <Text dimColor>  • TUI (esta pantalla): interactivo con slash commands</Text>
        <Text dimColor>  • CLI: librarian &lt;command&gt; para scripting y automatización</Text>
      </Box>

      {/* Slash commands */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.muted}>Comandos TUI (escribí en el composer abajo)</Text>
        {COMMANDS.map((c) => (
          <Box key={c.cmd}>
            <Text color={theme.primary}>{c.cmd.padEnd(28)}</Text>
            <Text dimColor>{c.desc}</Text>
          </Box>
        ))}
      </Box>

      {/* Keybindings */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.muted}>Atajos de teclado</Text>
        {KEYBINDINGS.map((k) => (
          <Box key={k.key}>
            <Text color={theme.warning}>{k.key.padEnd(10)}</Text>
            <Text dimColor>{k.desc}</Text>
          </Box>
        ))}
      </Box>

      {/* Workflow */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.muted}>Workflow típico</Text>
        {WORKFLOW.map((w) => (
          <Box key={w.step}>
            <Text color={theme.success}>{w.step}.</Text>
            <Text dimColor> {w.action}</Text>
          </Box>
        ))}
      </Box>

      {/* CLI reference */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.muted}>Comandos CLI (desde terminal)</Text>
        {CLI_COMMANDS.map((c) => (
          <Box key={c.cmd}>
            <Text color={theme.primary}>{c.cmd.padEnd(38)}</Text>
            <Text dimColor>{c.desc}</Text>
          </Box>
        ))}
      </Box>

      {/* Vault structure */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.muted}>Estructura del vault</Text>
        <Text dimColor>{VAULT_STRUCTURE}</Text>
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>Escribí cualquier cosa en el composer para chatear con Librarian</Text>
      </Box>
      <Box>
        <Text dimColor>Usá un /comando para acciones específicas</Text>
      </Box>
    </Box>
  );
};
