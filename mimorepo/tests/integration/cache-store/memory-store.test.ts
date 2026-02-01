import { describe, it, expect } from 'vitest';
import { MemoryStore } from '@mimo/agent-cache/storage';
import { sleep } from '../fixtures/cache';

describe('Stage04 Cache Store - MemoryStore', () => {
  it('evicts entries when maxSize is reached (createdAt-based LRU)', async () => {
    const store = new MemoryStore({ maxSize: 2 });

    store.set('k1', { v: 1 });
    await sleep(2);
    store.set('k2', { v: 2 });
    await sleep(2);
    store.set('k3', { v: 3 }); // should evict k1

    expect(await store.has('k1')).toBe(false);
    expect(await store.get('k1')).toBeNull();

    expect(await store.has('k2')).toBe(true);
    expect(await store.has('k3')).toBe(true);
  });

  it('expires entries by TTL and can cleanupExpired()', async () => {
    const store = new MemoryStore();
    store.set('k-exp', { ok: true }, 20);
    expect(await store.get('k-exp')).toEqual({ ok: true });

    await sleep(40);
    store.cleanupExpired();

    expect(await store.get('k-exp')).toBeNull();
    expect(await store.keys()).not.toContain('k-exp');
  });

  it('supports save/load for restoring non-expired entries', async () => {
    const store1 = new MemoryStore();
    store1.set('k1', { v: 1 });
    const saved = store1.save();

    const store2 = new MemoryStore();
    store2.load(saved);

    expect(await store2.get('k1')).toEqual({ v: 1 });
    expect(await store2.has('k1')).toBe(true);
  });
});

