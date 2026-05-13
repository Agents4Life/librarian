import { EventEmitter } from 'node:events';

export type UiEvent =
  | { type: 'agent:thinking'; message: string }
  | { type: 'agent:done'; nodeId: string }
  | { type: 'agent:error'; error: string }
  | { type: 'wiki:searched'; query: string; count: number }
  | { type: 'wiki:indexed'; count: number }
  | { type: 'review:created'; source: string; target: string }
  | { type: 'review:approved'; id: string }
  | { type: 'review:rejected'; id: string }
  | { type: 'notification'; level: 'info' | 'warn' | 'error'; message: string };

export type UiEventHandler = (event: UiEvent) => void;

class UiEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit(event: UiEvent) {
    this.emitter.emit('event', event);
  }

  subscribe(handler: UiEventHandler) {
    this.emitter.on('event', handler);
    return () => { this.emitter.off('event', handler); };
  }
}

export const uiEventBus = new UiEventBus();
