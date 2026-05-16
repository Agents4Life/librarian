import React from 'react';
import type { WorkspaceNode } from '../state.js';

export type RendererProps = {
  node: WorkspaceNode;
  onAction: (action: string) => void;
};

export type RendererComponent = React.FC<RendererProps>;

const registry = new Map<string, RendererComponent>();

export const registerRenderer = (type: string, component: RendererComponent) => {
  registry.set(type, component);
};

export const getRenderer = (type: string): RendererComponent | undefined => {
  return registry.get(type);
};
