import { describe, it, expect } from 'vitest';
import { MessageManager } from './MessageManager.js';
import { MessageRole } from '@mimo/agent-core';

describe('MessageManager', () => {
  it('adds and returns messages', () => {
    const mgr = new MessageManager({ maxHistoryItems: 10 });
    mgr.addMessage({ role: MessageRole.USER, content: 'hi' });
    expect(mgr.getMessages()).toHaveLength(1);
  });

  it('omits middle history when exceeding maxHistoryItems', () => {
    const mgr = new MessageManager({ maxHistoryItems: 3, omitMiddleStrategy: true });
    mgr.addMessages([
      { role: MessageRole.USER, content: '1' },
      { role: MessageRole.USER, content: '2' },
      { role: MessageRole.USER, content: '3' },
      { role: MessageRole.USER, content: '4' },
    ]);

    const desc = mgr.getHistoryDescription();
    expect(desc).toContain('previous steps omitted');
  });
});

