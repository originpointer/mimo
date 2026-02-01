/**
 * Vitest Configuration for Integration Tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@bion/protocol': new URL('../../packages/@bion/protocol/src', import.meta.url).href,
      '@bion/client': new URL('../../packages/@bion/client/src', import.meta.url).href,
      '@mimo/agent-cache': new URL('../../packages/@mimo/agent-cache/src', import.meta.url).href,
      '@mimo/agent-cache/storage': new URL('../../packages/@mimo/agent-cache/src/storage', import.meta.url).href,
      '@mimo/agent-context': new URL('../../packages/@mimo/agent-context/src', import.meta.url).href,
      '@mimo/agent-core': new URL('../../packages/@mimo/agent-core/src', import.meta.url).href,
      '@mimo/agent-core/types': new URL('../../packages/@mimo/agent-core/src/types', import.meta.url).href,
      '@mimo/agent-core/interfaces': new URL('../../packages/@mimo/agent-core/src/interfaces', import.meta.url).href,
      '@mimo/agent-multi': new URL('../../packages/@mimo/agent-multi/src', import.meta.url).href,
      '@mimo/agent-tools': new URL('../../packages/@mimo/agent-tools/src', import.meta.url).href,
      '@mimo/agent-tools/executor': new URL('../../packages/@mimo/agent-tools/src/executor', import.meta.url).href,
      '@mimo/agent-tools/policy': new URL('../../packages/@mimo/agent-tools/src/policy', import.meta.url).href,
      '@mimo/llm': new URL('../../packages/@mimo/llm/src', import.meta.url).href,
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
        '../../packages/@mimo/agent-cache/src/**',
        '../../packages/@mimo/agent-context/src/**',
        '../../packages/@mimo/agent-core/src/**',
        '../../packages/@mimo/agent-multi/src/**',
        '../../packages/@mimo/llm/src/**',
        '../../packages/@mimo/agent-tools/src/**',
      ],
    },
  },
});
