import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    projects: [
      // Node.js 模式
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/**/*.browser.test.ts'],
        },
      } as const,
      // Browser 模式
      {
        test: {
          name: 'browser',
          // setupFiles: ['./tests/setup/browser-setup.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              { browser: 'chromium' },
            ],
            headless: true,
          },
          include: ['tests/**/*.browser.test.ts'],
        },
      } as const,
    ],
  },
});
