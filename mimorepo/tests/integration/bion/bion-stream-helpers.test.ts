import { describe, expect, it } from 'vitest';

import { applyChatDelta, createChatDeltaAccumulator, applyToolUsed, createToolUsedTracker } from '@bion/client';

describe('bion stream helpers', () => {
  it('accumulates chatDelta content', () => {
    const acc = createChatDeltaAccumulator('evt1');
    applyChatDelta(acc, {
      id: 'm1',
      type: 'chatDelta',
      timestamp: 1,
      delta: { content: 'hello ' },
      finished: false,
      sender: 'assistant',
      targetEventId: 'evt1',
    });
    applyChatDelta(acc, {
      id: 'm2',
      type: 'chatDelta',
      timestamp: 2,
      delta: { content: 'world' },
      finished: true,
      sender: 'assistant',
      targetEventId: 'evt1',
    });

    expect(acc.content).toBe('hello world');
    expect(acc.finished).toBe(true);
  });

  it('tracks toolUsed status', () => {
    const tracker = createToolUsedTracker('tooluse_1');
    applyToolUsed(tracker, {
      id: 'e1',
      type: 'toolUsed',
      timestamp: 1,
      tool: 'browser',
      actionId: 'tooluse_1',
      status: 'start',
      planStepId: 'p1',
    });
    applyToolUsed(tracker, {
      id: 'e2',
      type: 'toolUsed',
      timestamp: 2,
      tool: 'browser',
      actionId: 'tooluse_1',
      status: 'success',
      planStepId: 'p1',
    });

    expect(tracker.status).toBe('success');
  });
});

