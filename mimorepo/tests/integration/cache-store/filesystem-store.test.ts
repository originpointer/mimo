import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import { FileSystemStore } from '@mimo/agent-cache/storage';
import { createTempDir, sleep } from '../fixtures/cache';

describe('Stage04 Cache Store - FileSystemStore', () => {
  it('persists entries across store instances (real disk I/O)', async () => {
    const tmp = await createTempDir('mimo-fs-store-');
    try {
      const store1 = new FileSystemStore({ rootDir: tmp.dir, subdir: 'cache' });
      await store1.set('k1', { v: 1 });
      expect(await store1.get('k1')).toEqual({ v: 1 });

      const store2 = new FileSystemStore({ rootDir: tmp.dir, subdir: 'cache' });
      expect(await store2.get('k1')).toEqual({ v: 1 });
      expect(await store2.has('k1')).toBe(true);
    } finally {
      await tmp.cleanup();
    }
  });

  it('expires entries by TTL and removes them from keys()', async () => {
    const tmp = await createTempDir('mimo-fs-store-');
    try {
      const store = new FileSystemStore({ rootDir: tmp.dir, subdir: 'cache' });
      await store.set('k-exp', { ok: true }, 25);
      expect(await store.get('k-exp')).toEqual({ ok: true });

      await sleep(50);
      expect(await store.get('k-exp')).toBeNull();
      expect(await store.has('k-exp')).toBe(false);
      expect(await store.keys()).not.toContain('k-exp');
    } finally {
      await tmp.cleanup();
    }
  });

  it('recovers from a corrupted index file without crashing', async () => {
    const tmp = await createTempDir('mimo-fs-store-');
    try {
      const store1 = new FileSystemStore({ rootDir: tmp.dir, subdir: 'cache' });
      await store1.set('k1', { v: 1 });
      expect(await store1.get('k1')).toEqual({ v: 1 });

      // Corrupt index
      const indexPath = join(tmp.dir, 'cache', '.index.json');
      await fs.writeFile(indexPath, '{ this is not valid json', 'utf8');

      const store2 = new FileSystemStore({ rootDir: tmp.dir, subdir: 'cache' });
      // With a broken index, store should start fresh and not throw
      expect(await store2.get('k1')).toBeNull();
      expect(await store2.keys()).toEqual([]);
    } finally {
      await tmp.cleanup();
    }
  });

  it('updates hit/miss stats based on get()', async () => {
    const tmp = await createTempDir('mimo-fs-store-');
    try {
      const store = new FileSystemStore({ rootDir: tmp.dir, subdir: 'cache' });
      await store.set('k1', { v: 1 });

      // 1 hit, 1 miss
      expect(await store.get('k1')).toEqual({ v: 1 });
      expect(await store.get('nope')).toBeNull();

      const stats = await store.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5, 10);
    } finally {
      await tmp.cleanup();
    }
  });
});

