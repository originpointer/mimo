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
import type { ToolExecutionContext } from '@mimo/agent-core/types';
import type { ILLMClient } from '@mimo/agent-core';

describe('ExecutionContextManager', () => {
  let manager: ExecutionContextManager;

  beforeEach(() => {
    manager = new ExecutionContextManager();
  });

  afterEach(() => {
    resetExecutionContextManager();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create context with all options', () => {
      const fileSystem = { readFile: vi.fn() };
      const browser = { currentUrl: 'https://example.com' };
      const llm = { chat: vi.fn() } as unknown as ILLMClient;
      const memory = { get: vi.fn(), set: vi.fn() };
      const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
      const config = { apiKey: 'test-key' };

      const options: ContextOptions = {
        fileSystem,
        browser,
        llm,
        memory,
        logger,
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
      expect(typeof context.logger.info).toBe('function');
      expect(typeof context.logger.error).toBe('function');
      expect(typeof context.logger.warn).toBe('function');
    });

    it('should use provided logger when given', () => {
      const customLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
      const context = manager.create({ logger: customLogger });

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
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
        config: { apiKey: 'base-key' },
      };

      const extra: ContextOptions = {
        browser: { currentUrl: 'https://example.com' },
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
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
      };

      const extra: ContextOptions = {
        fileSystem: { writeFile: vi.fn() },
      };

      const merged = manager.merge(base, extra);

      expect(merged.fileSystem).toBe(extra.fileSystem);
    });

    it('should deep merge config objects', () => {
      const base: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
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
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
      };

      const extra: ContextOptions = {
        fileSystem: { readFile: vi.fn() },
        browser: { currentUrl: 'https://example.com' },
      };

      const merged = manager.merge(base, extra);

      expect(merged.fileSystem).toBe(extra.fileSystem);
      expect(merged.browser).toBe(extra.browser);
      expect(merged.logger).toBe(base.logger);
    });

    it('should handle empty extra options', () => {
      const base: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
        browser: { currentUrl: 'https://example.com' },
      };

      const merged = manager.merge(base, {});

      expect(merged.fileSystem).toBe(base.fileSystem);
      expect(merged.browser).toBe(base.browser);
      expect(merged.logger).toBe(base.logger);
    });

    it('should handle missing config in base', () => {
      const base: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
      };

      const extra: ContextOptions = {
        config: { apiKey: 'test-key' },
      };

      const merged = manager.merge(base, extra);

      expect(merged.config).toEqual({ apiKey: 'test-key' });
    });

    it('should handle missing config in extra', () => {
      const base: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        config: { apiKey: 'base-key' },
      };

      const merged = manager.merge(base, {});

      expect(merged.config).toEqual({ apiKey: 'base-key' });
    });
  });

  describe('createChild', () => {
    it('should create child context inheriting from parent', () => {
      const parent: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
        browser: { currentUrl: 'https://example.com' },
        config: { apiKey: 'parent-key' },
      };

      const overrides: ContextOptions = {
        memory: { get: vi.fn(), set: vi.fn() },
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
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
      };

      const child = manager.createChild(parent);

      expect(child.fileSystem).toBe(parent.fileSystem);
      expect(child.logger).toBe(parent.logger);
    });

    it('should not modify parent context', () => {
      const parent: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
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
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
        browser: { currentUrl: 'https://example.com' },
      };

      const valid = manager.validate(context, ['fileSystem', 'browser']);

      expect(valid).toBe(true);
    });

    it('should return false when requirement is missing', () => {
      const context: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
      };

      const valid = manager.validate(context, ['fileSystem', 'browser']);

      expect(valid).toBe(false);
    });

    it('should return false when requirement is undefined', () => {
      const context: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: undefined as any,
      };

      const valid = manager.validate(context, ['fileSystem']);

      expect(valid).toBe(false);
    });

    it('should return true when no requirements', () => {
      const context: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
      };

      const valid = manager.validate(context, []);

      expect(valid).toBe(true);
    });

    it('should handle multiple requirements', () => {
      const context: ToolExecutionContext = {
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
        browser: { currentUrl: 'https://example.com' },
        memory: { get: vi.fn(), set: vi.fn() },
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
        logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
        fileSystem: { readFile: vi.fn() },
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
        fileSystem: { readFile: vi.fn() },
      });

      expect(context.fileSystem).toBeDefined();
      expect(context.logger).toBeDefined();
    });
  });
});
