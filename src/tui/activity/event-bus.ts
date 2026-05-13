import type { ActivityEvent } from './types.js';

export type ActivityListener = (event: ActivityEvent) => void;

export type ActivityEventBus = {
  subscribe: (listener: ActivityListener) => () => void;
  emit: (event: ActivityEvent) => void;
};

export const createActivityEventBus = (): ActivityEventBus => {
  const listeners = new Set<ActivityListener>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit: (event) => {
      const currentListeners = [...listeners];
      for (const listener of currentListeners) {
        listener(event);
      }
    },
  };
};
