export const theme = {
  primary: 'cyan',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  muted: 'gray',
  text: 'white',
  accent: 'magenta',
  bgPanel: 'gray',
  borderActive: 'cyan',
  borderSubtle: 'gray',
  border: 'white',
} as const;

export const icons = {
  bullet: '◉',
  circle: '○',
  arrow: '→',
  check: '✓',
  cross: '✗',
  star: '★',
  dash: '─',
  pipe: '│',
  corner_tl: '┌',
  corner_tr: '┐',
  corner_bl: '└',
  corner_br: '┘',
  tee_down: '┬',
  tee_up: '┴',
  tee_right: '├',
  tee_left: '┤',
} as const;

export const agentStates = {
  thinking: { icon: '◉', color: 'cyan' as const },
  scanning: { icon: '◎', color: 'cyan' as const },
  indexing: { icon: '◆', color: 'cyan' as const },
  done: { icon: '✓', color: 'green' as const },
  error: { icon: '✗', color: 'red' as const },
  waiting: { icon: '○', color: 'yellow' as const },
} as const;
