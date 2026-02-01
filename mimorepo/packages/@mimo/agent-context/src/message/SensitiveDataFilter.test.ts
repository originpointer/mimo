import { describe, it, expect } from 'vitest';
import { SensitiveDataFilter } from './SensitiveDataFilter.js';
import { MessageRole } from '@mimo/agent-core';

describe('SensitiveDataFilter', () => {
  it('replaces sensitive values in string content', () => {
    const f = new SensitiveDataFilter();
    f.setSensitiveData(new Map([['token', 'super-secret-token']]));

    const msg = { role: MessageRole.USER, content: 'my token is super-secret-token' };
    const out = f.filterMessage(msg);

    expect(typeof out.content).toBe('string');
    expect(out.content).toContain('<secret>token</secret>');
  });

  it('does not replace very short values', () => {
    const f = new SensitiveDataFilter();
    f.setSensitiveData(new Map([['pin', '123']]));

    const msg = { role: MessageRole.USER, content: 'pin=123' };
    const out = f.filterMessage(msg);

    expect(out.content).toBe('pin=123');
  });
});

