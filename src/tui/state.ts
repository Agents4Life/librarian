import { createContext, useContext } from 'react';
import { randomUUID } from 'node:crypto';

import type { ChatMessage } from './types.js';

export interface SearchResult {
  file: string;
  score: number;
  snippet?: string;
}

export interface WikiStats {
  total_files: number;
  wiki_pages: number;
  raw_files: number;
}

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  avg_connections: number;
  most_connected: Array<{ file: string; connections: number }>;
  orphans: number;
}

export interface Review {
  id: string;
  type: 'merge' | 'create' | 'expand';
  source: string;
  target: string;
  diff_id: string;
  status: 'pending' | 'approved' | 'rejected';
  preview?: string;
}

export interface OrphanNote {
  file: string;
  has_outgoing: boolean;
  has_incoming: boolean;
}

export interface StaleNote {
  file: string;
  last_touched: string;
  days_since_touch: number;
}

export interface InboxSummary {
  total: number;
  curatable: number;
  preview: string[];
}

export type WorkspaceNode =
  | { type: 'chat'; id: string; messages: ChatMessage[]; createdAt: number }
  | { type: 'search'; id: string; query: string; results: SearchResult[]; createdAt: number }
  | { type: 'review'; id: string; reviews: Review[]; activeIndex: number; createdAt: number }
  | { type: 'status'; id: string; stats: WikiStats; graph: GraphStats; createdAt: number }
  | { type: 'graph'; id: string; stats: GraphStats; createdAt: number }
  | { type: 'process'; id: string; inbox: InboxSummary; createdAt: number }
  | { type: 'orphans'; id: string; notes: OrphanNote[]; createdAt: number }
  | { type: 'stale'; id: string; notes: StaleNote[]; createdAt: number };

export interface ActivityEntry {
  id: string;
  timestamp: number;
  icon: string;
  color: string;
  message: string;
}

export interface AppState {
  vaultPath: string;
  ollamaStatus: 'ok' | 'down' | 'checking';

  workspace: WorkspaceNode[];
  activeNodeId: string;
  navigationHistory: string[];
  historyIndex: number;

  activityLog: ActivityEntry[];
  reviews: Review[];
  recentItems: string[];
  composerValue: string;
  loading: boolean;
}

export type AppAction =
  | { type: 'SET_VAULT_PATH'; vaultPath: string }
  | { type: 'SET_OLLAMA_STATUS'; status: 'ok' | 'down' | 'checking' }
  | { type: 'ADD_NODE'; node: WorkspaceNode }
  | { type: 'UPDATE_NODE'; id: string; patch: Partial<WorkspaceNode> }
  | { type: 'SET_ACTIVE_NODE'; id: string }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'NAVIGATE_FORWARD' }
  | { type: 'PUSH_ACTIVITY'; entry: Omit<ActivityEntry, 'id' | 'timestamp'> }
  | { type: 'SET_REVIEWS'; reviews: Review[] }
  | { type: 'APPROVE_REVIEW'; id: string }
  | { type: 'REJECT_REVIEW'; id: string }
  | { type: 'ADD_RECENT'; item: string }
  | { type: 'SET_COMPOSER_VALUE'; value: string }
  | { type: 'SET_LOADING'; loading: boolean };

const createNodeId = () => randomUUID();

export const navigateTo = (node: WorkspaceNode, state: AppState): Partial<AppState> => {
  const newHistory = [...state.navigationHistory.slice(0, state.historyIndex + 1), node.id];

  return {
    workspace: [...state.workspace, node],
    activeNodeId: node.id,
    navigationHistory: newHistory,
    historyIndex: newHistory.length - 1,
  };
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_VAULT_PATH':
      return { ...state, vaultPath: action.vaultPath };

    case 'SET_OLLAMA_STATUS':
      return { ...state, ollamaStatus: action.status };

    case 'ADD_NODE':
      return { ...state, ...navigateTo(action.node, state) };

    case 'UPDATE_NODE':
      return {
        ...state,
        workspace: state.workspace.map((n) => n.id === action.id ? { ...n, ...action.patch } as WorkspaceNode : n),
      };

    case 'SET_ACTIVE_NODE':
      return {
        ...state,
        activeNodeId: action.id,
        historyIndex: state.navigationHistory.indexOf(action.id),
      };

    case 'NAVIGATE_BACK':
      if (state.historyIndex <= 0) return state;
      return {
        ...state,
        historyIndex: state.historyIndex - 1,
        activeNodeId: state.navigationHistory[state.historyIndex - 1],
      };

    case 'NAVIGATE_FORWARD':
      if (state.historyIndex >= state.navigationHistory.length - 1) return state;
      return {
        ...state,
        historyIndex: state.historyIndex + 1,
        activeNodeId: state.navigationHistory[state.historyIndex + 1],
      };

    case 'PUSH_ACTIVITY':
      return {
        ...state,
        activityLog: [
          ...state.activityLog,
          { id: createNodeId(), timestamp: Date.now(), ...action.entry },
        ].slice(-50),
      };

    case 'SET_REVIEWS':
      return { ...state, reviews: action.reviews };

    case 'APPROVE_REVIEW':
      return {
        ...state,
        reviews: state.reviews.map((r) => r.id === action.id ? { ...r, status: 'approved' as const } : r),
      };

    case 'REJECT_REVIEW':
      return {
        ...state,
        reviews: state.reviews.map((r) => r.id === action.id ? { ...r, status: 'rejected' as const } : r),
      };

    case 'ADD_RECENT':
      return {
        ...state,
        recentItems: [action.item, ...state.recentItems.filter((i) => i !== action.item)].slice(0, 10),
      };

    case 'SET_COMPOSER_VALUE':
      return { ...state, composerValue: action.value };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    default:
      return state;
  }
};

export const createInitialState = (vaultPath: string): AppState => {
  const chatNodeId = createNodeId();
  const chatNode: WorkspaceNode = {
    type: 'chat',
    id: chatNodeId,
    messages: [],
    createdAt: Date.now(),
  };

  return {
    vaultPath,
    ollamaStatus: 'checking',
    workspace: [chatNode],
    activeNodeId: chatNodeId,
    navigationHistory: [chatNodeId],
    historyIndex: 0,
    activityLog: [],
    reviews: [],
    recentItems: [],
    composerValue: '',
    loading: false,
  };
};

interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppStateContext = createContext<AppStateContextValue | null>(null);

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateContext');
  return ctx;
};
