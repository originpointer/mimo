import { describe, it, expect } from 'vitest';
import { MessageCompressor } from './MessageCompressor.js';
import { MessageRole } from '@mimo/agent-core';

describe('MessageCompressor', () => {
  it('keeps messages when under budget', () => {
    const c = new MessageCompressor();
    const msgs = [{ role: MessageRole.USER, content: 'hello' }];
    const out = c.compress(msgs, { maxTokens: 100 });
    expect(out).toHaveLength(1);
  });

  it('drops earliest messages when over budget', () => {
    const c = new MessageCompressor();
    const msgs = [
      { role: MessageRole.USER, content: 'a'.repeat(400) },
      { role: MessageRole.USER, content: 'b'.repeat(400) },
      { role: MessageRole.USER, content: 'c'.repeat(400) },
    ];

    const out = c.compress(msgs, { maxTokens: 50, threshold: 1, keepLatest: true });
    expect(out.length).toBeLessThan(msgs.length);
    expect(out[out.length - 1]?.content).toContain('c');
  });
});

