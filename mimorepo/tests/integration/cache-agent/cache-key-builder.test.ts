import { describe, it, expect } from 'vitest';
import { CacheKeyBuilder } from '@mimo/agent-cache';

describe('Stage04 Cache Agent - CacheKeyBuilder', () => {
  it('builds a stable key regardless of tools ordering', () => {
    const builder = new CacheKeyBuilder();

    const key1 = builder.buildFromInstruction('Login', {
      instruction: 'Login',
      startUrl: 'https://example.com',
      model: 'openai/gpt-4o-mini',
      tools: ['browser_click', 'browser_fill'],
    });

    const key2 = builder.buildFromInstruction('Login', {
      instruction: 'Login',
      startUrl: 'https://example.com',
      model: 'openai/gpt-4o-mini',
      tools: ['browser_fill', 'browser_click'], // swapped
    });

    expect(key1).toBe(key2);
    expect(builder.isValidKey(key1)).toBe(true);
  });

  it('normalizes strings (trim + lowercase) to reduce false cache misses', () => {
    const builder = new CacheKeyBuilder();

    const key1 = builder.build({
      instruction: '  LOGIN to GitHub  ',
      startUrl: ' HTTPS://GitHub.com ',
      model: 'OpenAI/GPT-4o-mini',
      tools: ['Browser_Click', 'browser_fill'],
    });

    const key2 = builder.build({
      instruction: 'login to github',
      startUrl: 'https://github.com',
      model: 'openai/gpt-4o-mini',
      tools: ['browser_fill', 'browser_click'],
    });

    expect(key1).toBe(key2);
    expect(builder.isValidKey(key1)).toBe(true);
  });
});

