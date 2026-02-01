/**
 * Tests for context/ExecutionContextManager.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ExecutionContextManager,
  getExecutionContextManager,
  resetExecutionContextManager,
  type ContextOptions,
} from './ExecutionContextManager.js';
import type { ToolExecutionContext, FileSystem, BrowserSession, MemoryStore } from '@mimo/agent-core/types';
import type { ILLMClient } from '@mimo/agent-core';
import type { Logger } from '@mimo/agent-core/utils';

describe('ExecutionContextManager', () => {
  let manager: ExecutionContextManager;

  const createMockLogger = (): Partial<Logger> => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  });

  const createMockFileSystem = (): Partial<FileSystem> => ({
    read: vi.fn(),
    write: vi.fn(),
    edit: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  });

  const createMockBrowser = (): Partial<BrowserSession> => ({
    clientId: 'test-client',
    browserName: 'chrome',
    ua: 'test-ua',
    allowOtherClient: false,
    connected: true,
    currentUrl: 'https://example.com',
  });

  const createMockMemory = (): Partial<MemoryStore> => ({
    save: vi.fn(),
    search: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  });

  beforeEach(() => {
    manager = new ExecutionContextManager();
  });

  afterEach(() => {
    resetExecutionContextManager();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create context with all options', () => {
      const fileSystem = createMockFileSystem();
      const browser = createMockBrowser();
      const llm = { chat: vi.fn() } as unknown as ILLMClient;
      const memory = createMockMemory();
      const logger = createMockLogger();
      const config = { apiKey: 'test-key' };

      const options: ContextOptions = {
        fileSystem: fileSystem as FileSystem,
        browser: browser as BrowserSession,
        llm,
        memory: memory as MemoryStore,
        logger: logger as Logger,
        config,
      };

      const context = manager.create(options);

      expect(context.fileSystem).toBe(fileSystem);
      expect(context.browser).toBe(browser);
      expect(context.llm).toBe(llm);
      expect(context.memory).toBe(memory);
      expect(context.logger).toBe(logger);
      expect(context.config).toBe(config);
    });

    it('should create default logger when not provided', () => {
      const context = manager.create({});

      expect(context.logger).toBeDefined();
      expect(typeof context.logger?.info).toBe('function');
      expect(typeof context.logger?.error).toBe('function');
      expect(typeof context.logger?.warn).toBe('function');
    });

    it('should use provided logger when given', () => {
      const customLogger = createMockLogger();
      const context = manager.create({ logger: customLogger as Logger });

      expect(context.logger).toBe(customLogger);
    });

    it('should create empty context when no options', () => {
      const context = manager.create({});

      expect(context.logger).toBeDefined();
      expect(context.fileSystem).toBeUndefined();
      expect(context.browser).toBeUndefined();
      expect(context.llm).toBeUndefined();
      expect(context.memory).toBeUndefined();
    });
  });

  describe('merge', () => {
    it('should merge two contexts', () => {
      const base: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
        config: { apiKey: 'base-key' },
      };

      const extra: ContextOptions = {
        browser: createMockBrowser() as BrowserSession,
        config: { endpoint: 'https://api.example.com' },
      };

      const merged = manager.merge(base, extra);

      expect(merged.fileSystem).toBe(base.fileSystem);
      expect(merged.browser).toBe(extra.browser);
      expect(merged.logger).toBe(base.logger);
      expect(merged.config).toEqual({
        apiKey: 'base-key',
        endpoint: 'https://api.example.com',
      });
    });

    it('should override base values with extra values', () => {
      const base: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
      };

      const extra: ContextOptions = {
        fileSystem: createMockFileSystem() as FileSystem,
      };

      const merged = manager.merge(base, extra);

      expect(merged.fileSystem).toBe(extra.fileSystem);
    });

    it('should deep merge config objects', () => {
      const base: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        config: {
          apiKey: 'key1',
          timeout: 5000,
        },
      };

      const extra: ContextOptions = {
        config: {
          endpoint: 'https://api.example.com',
          timeout: 10000,
        },
      };

      const merged = manager.merge(base, extra);

      expect(merged.config).toEqual({
        apiKey: 'key1',
        timeout: 10000,
        endpoint: 'https://api.example.com',
      });
    });

    it('should handle empty base context', () => {
      const base: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
      };

      const extra: ContextOptions = {
        fileSystem: createMockFileSystem() as FileSystem,
        browser: createMockBrowser() as BrowserSession,
      };

      const merged = manager.merge(base, extra);

      expect(merged.fileSystem).toBe(extra.fileSystem);
      expect(merged.browser).toBe(extra.browser);
      expect(merged.logger).toBe(base.logger);
    });

    it('should handle empty extra options', () => {
      const base: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
        browser: createMockBrowser() as BrowserSession,
      };

      const merged = manager.merge(base, {});

      expect(merged.fileSystem).toBe(base.fileSystem);
      expect(merged.browser).toBe(base.browser);
      expect(merged.logger).toBe(base.logger);
    });

    it('should handle missing config in base', () => {
      const base: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
      };

      const extra: ContextOptions = {
        config: { apiKey: 'test-key' },
      };

      const merged = manager.merge(base, extra);

      expect(merged.config).toEqual({ apiKey: 'test-key' });
    });

    it('should handle missing config in extra', () => {
      const base: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        config: { apiKey: 'base-key' },
      };

      const merged = manager.merge(base, {});

      expect(merged.config).toEqual({ apiKey: 'base-key' });
    });
  });

  describe('createChild', () => {
    it('should create child context inheriting from parent', () => {
      const parent: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
        browser: createMockBrowser() as BrowserSession,
        config: { apiKey: 'parent-key' },
      };

      const overrides: ContextOptions = {
        memory: createMockMemory() as MemoryStore,
        config: { timeout: 5000 },
      };

      const child = manager.createChild(parent, overrides);

      expect(child.fileSystem).toBe(parent.fileSystem);
      expect(child.browser).toBe(parent.browser);
      expect(child.memory).toBe(overrides.memory);
      expect(child.config).toEqual({
        apiKey: 'parent-key',
        timeout: 5000,
      });
    });

    it('should create child without overrides', () => {
      const parent: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
      };

      const child = manager.createChild(parent);

      expect(child.fileSystem).toBe(parent.fileSystem);
      expect(child.logger).toBe(parent.logger);
    });

    it('should not modify parent context', () => {
      const parent: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        config: { apiKey: 'parent-key' },
      };

      const child = manager.createChild(parent, {
        config: { timeout: 5000 },
      });

      expect(parent.config).toEqual({ apiKey: 'parent-key' });
      expect(child.config).toEqual({
        apiKey: 'parent-key',
        timeout: 5000,
      });
    });
  });

  describe('validate', () => {
    it('should return true when all requirements are met', () => {
      const context: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
        browser: createMockBrowser() as BrowserSession,
      };

      const valid = manager.validate(context, ['fileSystem', 'browser']);

      expect(valid).toBe(true);
    });

    it('should return false when requirement is missing', () => {
      const context: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
      };

      const valid = manager.validate(context, ['fileSystem', 'browser']);

      expect(valid).toBe(false);
    });

    it('should return false when requirement is undefined', () => {
      const context: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: undefined as any,
      };

      const valid = manager.validate(context, ['fileSystem']);

      expect(valid).toBe(false);
    });

    it('should return true when no requirements', () => {
      const context: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
      };

      const valid = manager.validate(context, []);

      expect(valid).toBe(true);
    });

    it('should handle multiple requirements', () => {
      const context: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
        browser: createMockBrowser() as BrowserSession,
        memory: createMockMemory() as MemoryStore,
      };

      const valid = manager.validate(context, [
        'fileSystem',
        'browser',
        'memory',
      ]);

      expect(valid).toBe(true);
    });

    it('should return false for first missing requirement', () => {
      const context: ToolExecutionContext = {
        logger: createMockLogger() as Logger,
        fileSystem: createMockFileSystem() as FileSystem,
      };

      const valid = manager.validate(context, ['fileSystem', 'browser', 'memory']);

      expect(valid).toBe(false);
    });
  });

  describe('global instance', () => {
    it('should return same instance', () => {
      const instance1 = getExecutionContextManager();
      const instance2 = getExecutionContextManager();

      expect(instance1).toBe(instance2);
    });

    it('should reset global instance', () => {
      const instance1 = getExecutionContextManager();

      resetExecutionContextManager();

      const instance2 = getExecutionContextManager();

      expect(instance1).not.toBe(instance2);
    });

    it('should create functional contexts through global instance', () => {
      const globalManager = getExecutionContextManager();
      const context = globalManager.create({
        fileSystem: createMockFileSystem() as FileSystem,
      });

      expect(context.fileSystem).toBeDefined();
      expect(context.logger).toBeDefined();
    });
  });
});
