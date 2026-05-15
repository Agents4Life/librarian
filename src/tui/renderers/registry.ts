import React from 'react';
import type { ReactNode } from 'react';
import type { WorkspaceNode } from './types.js';

export interface RendererProps {
  node: WorkspaceNode;
  onAction: (action: string) => void;
}

export const RENDERERS: Record<string, React.ComponentType<RendererProps>> = {};

export const registerRenderer = (type: string, component: React.ComponentType<RendererProps>) => {
  RENDERERS[type] = component;
};

export const getRenderer = (type: string): React.ComponentType<RendererProps> | null => {
  return RENDERERS[type] || null;
};