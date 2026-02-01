import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function createCacheNamespace(testName: string): string {
  const safe = testName
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');

  const rand = Math.random().toString(36).slice(2, 10);
  return `it:${safe || 'test'}:${process.pid}:${Date.now()}:${rand}`;
}

export async function createTempDir(prefix = 'mimo-integration-') {
  const dir = await fs.mkdtemp(join(tmpdir(), prefix));
  return {
    dir,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

export async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

