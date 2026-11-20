import { EventEmitter } from 'node:events';

export type RealtimeEvent =
  | { type: 'PARTNER_MOOD_CHANGED'; partnerUserId: string; mood: 'happy' | 'unhappy'; updatedAt: string }
  | { type: 'BOND_REQUEST_RECEIVED'; senderUserId: string; senderUsername: string; senderMood: string }
  | { type: 'BOND_REQUEST_UPDATED'; status: 'accepted' | 'declined' | 'cancelled' }
  | { type: 'BOND_ACCEPTED'; partnerUserId: string; partnerUsername: string; partnerMood: string }
  | { type: 'BOND_BREAK_REQUESTED'; requestedByUserId: string; requestedByUsername: string }
  | { type: 'BOND_BREAK_CANCELLED' }
  | { type: 'BOND_ENDED' }
  | { type: 'HEARTBEAT'; timestamp: number };

class AppEventEmitter extends EventEmitter {}

// Global event bus singleton across server calls
const globalEventBus = (globalThis as any).__knowmood_events__ || new AppEventEmitter();
globalEventBus.setMaxListeners(200);
(globalThis as any).__knowmood_events__ = globalEventBus;

export const eventBus = globalEventBus;

/**
 * Dispatch an event to a specific user
 */
export function sendUserEvent(userId: string, event: RealtimeEvent) {
  eventBus.emit(`user:${userId}`, event);
}
