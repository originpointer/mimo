import { describe, it, expect } from 'vitest';
import { AgentCache, type CachedAgentExecution } from '@mimo/agent-cache';
import { MemoryStore } from '@mimo/agent-cache/storage';
import { createCacheNamespace } from '../fixtures/cache';

function buildExecution(key: string, instruction: string): CachedAgentExecution {
  return {
    version: 1,
    key,
    instruction,
    startUrl: 'http://127.0.0.1:1234/',
    options: {
      instruction,
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['goto', 'click', 'type', 'screenshot'],
    },
    configSignature: 'sig',
    steps: [
      { action: { type: 'goto', url: 'http://127.0.0.1:1234/' }, result: { ok: true } },
      { action: { type: 'click' }, selector: '#btn', result: { screenshot: 'data:image/png;base64,AAA...' } },
    ],
    result: { success: true, actions: [{ type: 'screenshot', screenshot: 'data:image/png;base64,BBB...' }] },
    timestamp: Date.now(),
  };
}

describe('Stage04 Cache Agent - AgentCache (e2e)', () => {
  it('save → get records a hit, and missing get records a miss', async () => {
    const store = new MemoryStore();
    const namespace = createCacheNamespace('agent-cache');
    const cache = new AgentCache({ store, namespace });

    const key = cache.buildKey('task-1', {
      instruction: 'task-1',
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['goto', 'click'],
    });

    await cache.save(key, buildExecution(key, 'task-1'));

    expect(await cache.get(key)).toBeTruthy();
    expect(await cache.get('agent:does-not-exist')).toBeNull();

    const stats = await cache.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('entries(filter) returns only matching executions', async () => {
    const store = new MemoryStore();
    const namespace = createCacheNamespace('agent-cache-filter');
    const cache = new AgentCache({ store, namespace });

    const key1 = cache.buildKey('login', {
      instruction: 'login',
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['click'],
    });
    const key2 = cache.buildKey('search', {
      instruction: 'search',
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['type'],
    });

    await cache.save(key1, buildExecution(key1, 'login'));
    await cache.save(key2, buildExecution(key2, 'search'));

    const loginOnly = await cache.entries({ instruction: 'login' });
    expect(loginOnly).toHaveLength(1);
    expect(loginOnly[0]?.instruction).toContain('login');
  });

  it('invalidate(pattern) removes matching entries only', async () => {
    const store = new MemoryStore();
    const namespace = createCacheNamespace('agent-cache-invalidate');
    const cache = new AgentCache({ store, namespace });

    const key1 = cache.buildKey('a', {
      instruction: 'a',
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['click'],
    });
    const key2 = cache.buildKey('b', {
      instruction: 'b',
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['type'],
    });
    await cache.save(key1, buildExecution(key1, 'a'));
    await cache.save(key2, buildExecution(key2, 'b'));

    const pattern = key1.slice(-8);
    const count = await cache.invalidate(pattern);
    expect(count).toBe(1);

    expect(await cache.get(key1)).toBeNull();
    expect(await cache.get(key2)).toBeTruthy();
  });

  it('export/import migrates cached executions', async () => {
    const store1 = new MemoryStore();
    const namespace1 = createCacheNamespace('agent-cache-export');
    const cache1 = new AgentCache({ store: store1, namespace: namespace1 });

    const key1 = cache1.buildKey('export-1', {
      instruction: 'export-1',
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['goto'],
    });
    const key2 = cache1.buildKey('export-2', {
      instruction: 'export-2',
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['click'],
    });
    await cache1.save(key1, buildExecution(key1, 'export-1'));
    await cache1.save(key2, buildExecution(key2, 'export-2'));

    const data = await cache1.export();
    expect(Object.keys(data)).toHaveLength(2);

    const store2 = new MemoryStore();
    const namespace2 = createCacheNamespace('agent-cache-import');
    const cache2 = new AgentCache({ store: store2, namespace: namespace2 });

    const imported = await cache2.import(data);
    expect(imported).toBe(2);
    expect(await cache2.get(key1)).toBeTruthy();
    expect(await cache2.get(key2)).toBeTruthy();
  });
});

