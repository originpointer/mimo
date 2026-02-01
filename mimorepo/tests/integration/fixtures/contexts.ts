/**
 * Test Context Factories
 *
 * Provides test context creation functions for integration testing.
 */

import type { ToolExecutionContext, BrowserSession, FileSystem, MemoryStore } from '@mimo/agent-core';
import { createLogger } from '@mimo/agent-core/utils/logger';

/**
 * Create minimal test context
 */
export function createMinimalContext(): ToolExecutionContext {
  return {
    logger: createLogger('test'),
  };
}

/**
 * Create a test file system mock
 */
export function createMockFileSystem(): FileSystem {
  const files = new Map<string, string>();

  return {
    read: async (path: string) => {
      return files.get(path) ?? `Content of ${path}`;
    },
    write: async (path: string, content: string) => {
      files.set(path, content);
    },
    edit: async (path: string, edits: { oldText: string; newText: string }[]) => {
      const content = files.get(path) ?? '';
      let newContent = content;
      for (const edit of edits) {
        newContent = newContent.replace(edit.oldText, edit.newText);
      }
      files.set(path, newContent);
    },
    delete: async (path: string) => {
      files.delete(path);
    },
    list: async (path: string) => {
      return Array.from(files.keys()).filter(key => key.startsWith(path));
    },
    exists: async (path: string) => {
      return files.has(path);
    },
  };
}

/**
 * Create a test browser session mock
 */
export function createMockBrowserSession(): BrowserSession {
  return {
    clientId: 'test-client',
    browserName: 'chromium',
    ua: 'test-user-agent',
    allowOtherClient: false,
    currentUrl: 'https://example.com',
    currentTitle: 'Test Page',
    viewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
    connected: true,
  };
}

/**
 * Create a test memory store mock
 */
export function createMockMemoryStore(): MemoryStore {
  const store = new Map<string, { value: any; createdAt: number; updatedAt: number; metadata?: Record<string, any> }>();

  return {
    save: async (key: string, value: any, metadata?: Record<string, any>) => {
      const now = Date.now();
      store.set(key, { value, createdAt: now, updatedAt: now, metadata });
    },
    search: async (query: string, topK?: number) => {
      const results = Array.from(store.entries())
        .filter(([key]) => key.includes(query))
        .map(([key, data]) => ({ key, ...data }))
        .slice(0, topK);
      return results;
    },
    get: async (key: string) => {
      const data = store.get(key);
      if (!data) return null;
      return { key, ...data };
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
  };
}

/**
 * Create full test context with all optional fields
 */
export function createFullContext(): ToolExecutionContext {
  return {
    logger: createLogger('test'),
    fileSystem: createMockFileSystem(),
    browser: createMockBrowserSession(),
    memory: createMockMemoryStore(),
    config: {
      testMode: true,
    },
  };
}

/**
 * Predefined test contexts
 */
export const testContexts = {
  minimal: createMinimalContext(),
  full: createFullContext(),
  withBrowser: {
    ...createMinimalContext(),
    browser: createMockBrowserSession(),
  },
  withMemory: {
    ...createMinimalContext(),
    memory: createMockMemoryStore(),
  },
  withFileSystem: {
    ...createMinimalContext(),
    fileSystem: createMockFileSystem(),
  },
};
