export type TuiScreen = 'menu' | 'input' | 'result' | 'chat';

export interface MenuItem {
  key: string;
  label: string;
  input: string;
  needsInput: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const menuItems: MenuItem[] = [
  { key: '1', label: 'Procesar notas nuevas', input: 'procesar notas nuevas', needsInput: false },
  { key: '2', label: 'Buscar en la wiki', input: 'buscar ', needsInput: true },
  { key: '3', label: 'Charla con Librarian', input: 'pregunta ', needsInput: true },
  { key: '4', label: 'Estado de la wiki', input: 'estado de la wiki', needsInput: false },
  { key: '5', label: 'Paginas incompletas', input: 'paginas incompletas', needsInput: false },
  { key: '6', label: 'Notas sin tocar 90 dias', input: '90 dias sin tocar', needsInput: false },
  { key: '7', label: 'Mapa de conexiones', input: 'mapa de conexiones', needsInput: false },
];
