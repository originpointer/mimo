import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@mimo/agent-core': path.resolve(__dirname, '../agent-core/src'),
      '@mimo/types': path.resolve(__dirname, '../types/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Load environment variables from .env file
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'dist/**', 'node_modules/**'],
    },
  },
});
