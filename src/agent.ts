import { randomUUID } from 'node:crypto';

import type { Intent, RoutedIntent } from './types.js';

export type AgentStepKind = 'observe' | 'plan' | 'act' | 'reflect';

export interface AgentStep {
  kind: AgentStepKind;
  message: string;
  tool?: string;
}

export interface AgentSession {
  id: string;
  turns: number;
  lastIntent?: Intent;
  lastSummary?: string;
}

export interface AgentRun<T> {
  routed: RoutedIntent;
  result: T;
  session: AgentSession;
  steps: AgentStep[];
}

export const createSession = (): AgentSession => ({
  id: randomUUID(),
  turns: 0,
});
