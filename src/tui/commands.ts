import type { SlashCommand } from './types.js';

export const createCommands = (dispatch: (action: unknown) => void, runLibrarian: (input: string) => Promise<unknown>): SlashCommand[] => [
  {
    slash: '/search',
    description: 'Buscar en la wiki',
    handler: (args) => { runLibrarian(`buscar ${args}`); },
  },
  {
    slash: '/status',
    description: 'Estado del vault',
    handler: () => { runLibrarian('estado de la wiki'); },
  },
  {
    slash: '/process',
    description: 'Procesar raw/',
    handler: () => { runLibrarian('procesar notas nuevas'); },
  },
  {
    slash: '/review',
    description: 'Revisar propuestas pendientes',
    handler: () => { runLibrarian('review pendientes'); },
  },
  {
    slash: '/graph',
    description: 'Mapa de conexiones',
    handler: () => { runLibrarian('mapa de conexiones'); },
  },
  {
    slash: '/orphans',
    description: 'Notas huérfanas',
    handler: () => { runLibrarian('notas huérfanas'); },
  },
  {
    slash: '/stale',
    description: 'Notas sin tocar 90 días',
    handler: () => { runLibrarian('90 dias sin tocar'); },
  },
  {
    slash: '/health',
    description: 'Graph health dashboard',
    handler: () => { dispatch({ type: 'LOAD_GRAPH_HEALTH' }); },
  },
  {
    slash: '/activity',
    description: 'Session activity log',
    handler: () => { dispatch({ type: 'LOAD_ACTIVITY' }); },
  },
  {
    slash: '/help',
    description: 'Show help and usage guide',
    handler: () => { dispatch({ type: 'LOAD_HELP' }); },
  },
  {
    slash: '/researcher',
    description: 'Investigar tema en internet',
    handler: (args) => { runLibrarian(`investigar ${args}`); },
  },
];

export const parseComposerInput = (input: string, commands: SlashCommand[]): { isCommand: boolean; command?: SlashCommand; args: string } => {
  const trimmed = input.trim();

  if (!trimmed.startsWith('/')) {
    return { isCommand: false, args: trimmed };
  }

  const parts = trimmed.split(/\s+/);
  const slash = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  const command = commands.find((c) => c.slash === slash);

  if (command) {
    return { isCommand: true, command, args };
  }

  return { isCommand: false, args: trimmed };
};
