/**
 * Tests for executor/ParamInjector.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParamInjector } from './ParamInjector.js';
import type { ToolDefinition, ToolExecutionContext, SpecialInjectParam } from '@mimo/agent-core/types';

describe('ParamInjector', () => {
  let injector: ParamInjector;

  beforeEach(() => {
    injector = new ParamInjector();
  });

  const createMockContext = (
    overrides: Partial<ToolExecutionContext> = {}
  ): ToolExecutionContext => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    fileSystem: { readFile: vi.fn() },
    browser: { currentUrl: 'https://example.com' },
    llm: { chat: vi.fn() },
    memory: { get: vi.fn(), set: vi.fn() },
    config: { apiKey: 'test-key' },
    ...overrides,
  });

  describe('detectRequiredParams', () => {
    it('should use injectConfig to detect params', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const { fileSystem } = context;
          return fileSystem;
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem'],
      };

      const detected = injector.detectRequiredParams(tool);
      expect(detected).toEqual(['fileSystem']);
    });

    it('should use injectConfig with multiple params', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const { fileSystem, browser, logger } = context;
          return { fileSystem, browser, logger };
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem', 'browser', 'logger'],
      };

      const detected = injector.detectRequiredParams(tool);
      expect(detected).toEqual(['fileSystem', 'browser', 'logger']);
    });

    it('should return empty array when no injectConfig', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async () => ({}),
        description: 'Test tool',
        parameters: {},
      };

      const detected = injector.detectRequiredParams(tool);
      expect(detected).toEqual([]);
    });
  });

  describe('inject', () => {
    it('should inject params from injectConfig', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const { fileSystem, browser } = context;
          return { fileSystem, browser };
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem', 'browser'],
      };

      const params = { input: 'test' };
      const context = createMockContext();

      const injected = injector.inject(params, context, tool);

      expect(injected).toEqual({
        input: 'test',
        fileSystem: context.fileSystem,
        browser: context.browser,
      });
    });

    it('should not override existing params', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const { fileSystem } = context;
          return { fileSystem };
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem'],
      };

      const params = { input: 'test', fileSystem: { custom: 'value' } };
      const context = createMockContext();

      const injected = injector.inject(params, context, tool);

      expect(injected.fileSystem).toEqual({ custom: 'value' });
      expect(injected.fileSystem).not.toBe(context.fileSystem);
    });

    it('should handle empty injectConfig', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async () => ({}),
        description: 'Test tool',
        parameters: {},
        injectConfig: [],
      };

      const params = { input: 'test' };
      const context = createMockContext();

      const injected = injector.inject(params, context, tool);

      expect(injected).toEqual({ input: 'test' });
    });

    it('should handle no injectConfig', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async () => ({}),
        description: 'Test tool',
        parameters: {},
      };

      const params = { input: 'test' };
      const context = createMockContext();

      const injected = injector.inject(params, context, tool);

      expect(injected).toEqual({ input: 'test' });
    });
  });

  describe('validate', () => {
    it('should return valid when all required params exist', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const { fileSystem, browser } = context;
          return { fileSystem, browser };
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem', 'browser'],
      };

      const context = createMockContext();
      const result = injector.validate(tool, context);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid when params are missing', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const { fileSystem, browser, llm } = context;
          return { fileSystem, browser, llm };
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem', 'browser', 'llm'],
      };

      const context = createMockContext({ llm: undefined });
      const result = injector.validate(tool, context);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('llm');
    });

    it('should return invalid when params are undefined', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const { fileSystem } = context;
          return { fileSystem };
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem'],
      };

      const context = createMockContext({ fileSystem: undefined });
      const result = injector.validate(tool, context);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('fileSystem');
    });

    it('should return valid when no params required', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async () => ({}),
        description: 'Test tool',
        parameters: {},
      };

      const context = createMockContext();
      const result = injector.validate(tool, context);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should list all missing params', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const { fileSystem, browser, llm, memory } = context;
          return { fileSystem, browser, llm, memory };
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem', 'browser', 'llm', 'memory'],
      };

      const context = createMockContext({
        fileSystem: undefined,
        browser: undefined,
      });

      const result = injector.validate(tool, context);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('fileSystem');
      expect(result.missing).toContain('browser');
    });
  });

  describe('specialParamTypes', () => {
    it('should support all special param types', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: async (params: any, context: ToolExecutionContext) => {
          const {
            fileSystem,
            browser,
            llm,
            memory,
            logger,
            config,
          } = context;
          return {
            fileSystem,
            browser,
            llm,
            memory,
            logger,
            config,
          };
        },
        description: 'Test tool',
        parameters: {},
        injectConfig: ['fileSystem', 'browser', 'llm', 'memory', 'logger', 'config'],
      };

      const detected = injector.detectRequiredParams(tool) as SpecialInjectParam[];

      expect(detected).toContain('fileSystem');
      expect(detected).toContain('browser');
      expect(detected).toContain('llm');
      expect(detected).toContain('memory');
      expect(detected).toContain('logger');
      expect(detected).toContain('config');
    });
  });
});
