/**
 * Vitest Configuration for Integration Tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@mimo/agent-core': new URL('../../packages/@mimo/agent-core/dist', import.meta.url).href,
      '@mimo/agent-core/types': new URL('../../packages/@mimo/agent-core/dist/types', import.meta.url).href,
      '@mimo/agent-core/interfaces': new URL('../../packages/@mimo/agent-core/dist/interfaces', import.meta.url).href,
      '@mimo/agent-tools': new URL('../../packages/@mimo/agent-tools/dist', import.meta.url).href,
      '@mimo/agent-tools/executor': new URL('../../packages/@mimo/agent-tools/dist/executor', import.meta.url).href,
      '@mimo/agent-tools/policy': new URL('../../packages/@mimo/agent-tools/dist/policy', import.meta.url).href,
      '@mimo/llm': new URL('../../packages/@mimo/llm/dist', import.meta.url).href,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        '../../packages/@mimo/agent-core/src/**',
        '../../packages/@mimo/llm/src/**',
        '../../packages/@mimo/agent-tools/src/**',
      ],
    },
  },
});
