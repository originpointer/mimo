import type { BionChatDeltaEvent, BionToolUsedEvent } from '@bion/protocol';

export interface ChatDeltaAccumulator {
  targetEventId: string;
  content: string;
  finished: boolean;
  lastEvent?: BionChatDeltaEvent;
}

export function createChatDeltaAccumulator(targetEventId: string): ChatDeltaAccumulator {
  return { targetEventId, content: '', finished: false };
}

/**
 * Apply a `chatDelta` event to an accumulator.
 * - `.reverse` uses delta-based updates; append `delta.content`.
 */
export function applyChatDelta(acc: ChatDeltaAccumulator, ev: BionChatDeltaEvent): ChatDeltaAccumulator {
  if (ev.targetEventId !== acc.targetEventId) return acc;
  acc.content += ev.delta?.content ?? '';
  acc.finished = Boolean(ev.finished);
  acc.lastEvent = ev;
  return acc;
}

export interface ToolUsedTracker {
  actionId: string;
  status: BionToolUsedEvent['status'];
  last?: BionToolUsedEvent;
}

export function createToolUsedTracker(actionId: string): ToolUsedTracker {
  return { actionId, status: 'start' };
}

export function applyToolUsed(tracker: ToolUsedTracker, ev: BionToolUsedEvent): ToolUsedTracker {
  if (ev.actionId !== tracker.actionId) return tracker;
  tracker.status = ev.status;
  tracker.last = ev;
  return tracker;
}

