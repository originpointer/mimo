/**
 * Tests for executor/ToolExecutor.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolExecutor } from './ToolExecutor.js';
import type { ToolDefinition, ToolExecutionContext, FileSystem, BrowserSession, Logger } from '@mimo/agent-core/types';
import { z } from 'zod';

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

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    executor = new ToolExecutor();
    mockContext = {
      logger: createMockLogger() as Logger,
      fileSystem: createMockFileSystem() as FileSystem,
      browser: createMockBrowser() as BrowserSession,
    };
  });

  const createMockTool = (
    name: string,
    domains?: string[],
    timeout?: number
  ): ToolDefinition => {
    const tool: ToolDefinition = {
      name,
      execute: vi.fn().mockResolvedValue({ success: true, data: 'test' }),
      description: `Test tool ${name}`,
      parameters: z.object({}),
    };
    if (domains !== undefined) {
      (tool as any).domains = domains;
    }
    if (timeout !== undefined) {
      (tool as any).timeout = timeout;
    }
    return tool;
  };

  describe('execute', () => {
    it('should execute tool successfully', async () => {
      const tool = createMockTool('test_tool');
      const params = { input: 'test' };

      const result = await executor.execute(tool, params, mockContext);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ success: true, data: 'test' });
      expect(result.toolCall.name).toBe('test_tool');
      expect(result.toolCall.parameters).toEqual(params);
      expect(tool.execute).toHaveBeenCalledWith(params, mockContext);
    });

    it('should handle execution errors', async () => {
      const tool: ToolDefinition = {
        name: 'error_tool',
        execute: vi.fn().mockRejectedValue(new Error('Execution failed')),
        description: 'Error tool',
        parameters: z.object({}),
      };

      const result = await executor.execute(tool, {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
      expect(result.toolCall.success).toBe(false);
    });

    it('should generate unique call ID', async () => {
      const tool = createMockTool('test_tool');

      const result1 = await executor.execute(tool, {}, mockContext);
      const result2 = await executor.execute(tool, {}, mockContext);

      expect(result1.toolCall.id).not.toBe(result2.toolCall.id);
      expect(result1.toolCall.id).toMatch(/^call_\d+_[a-z0-9]+$/);
    });

    it('should track execution duration', async () => {
      const tool: ToolDefinition = {
        name: 'slow_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { done: true };
        }),
        description: 'Slow tool',
        parameters: z.object({}),
      };

      const result = await executor.execute(tool, {}, mockContext);

      expect(result.duration).toBeGreaterThanOrEqual(40);
    });

    describe('timeout handling', () => {
      it('should use tool timeout', async () => {
        const tool: ToolDefinition = {
          name: 'timeout_tool',
          execute: vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return { done: true };
          }),
          description: 'Timeout tool',
          parameters: z.object({}),
          timeout: 100,
        };

        const result = await executor.execute(tool, {}, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain('timeout');
      });

      it('should use options timeout', async () => {
        const tool: ToolDefinition = {
          name: 'slow_tool',
          execute: vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return { done: true };
          }),
          description: 'Slow tool',
          parameters: z.object({}),
          timeout: 5000,
        };

        const result = await executor.execute(tool, {}, mockContext, { timeout: 100 });

        expect(result.success).toBe(false);
        expect(result.error).toContain('timeout');
      });

      it('should use default timeout when not specified', async () => {
        const tool: ToolDefinition = {
          name: 'slow_tool',
          execute: vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return { done: true };
          }),
          description: 'Slow tool',
          parameters: z.object({}),
        };

        const result = await executor.execute(tool, {}, mockContext);

        expect(result.success).toBe(true);
      });
    });

    describe('retry handling', () => {
      it('should retry on failure', async () => {
        let attempts = 0;
        const tool: ToolDefinition = {
          name: 'flaky_tool',
          execute: vi.fn(async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error('Temporary failure');
            }
            return { success: true };
          }),
          description: 'Flaky tool',
          parameters: z.object({}),
        };

        const result = await executor.execute(tool, {}, mockContext, {
          retries: 3,
          retryDelay: 10,
        });

        expect(result.success).toBe(true);
        expect(attempts).toBe(3);
      });

      it('should fail after max retries', async () => {
        const tool: ToolDefinition = {
          name: 'failing_tool',
          execute: vi.fn().mockRejectedValue(new Error('Permanent failure')),
          description: 'Failing tool',
          parameters: z.object({}),
        };

        const result = await executor.execute(tool, {}, mockContext, {
          retries: 2,
          retryDelay: 10,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Permanent failure');
        expect(tool.execute).toHaveBeenCalledTimes(3);
      });

      it('should not retry on MissingContextError', async () => {
        const tool: ToolDefinition = {
          name: 'context_tool',
          execute: vi.fn(async (_params: any, context: ToolExecutionContext) => {
            const { fileSystem } = context;
            return { success: true, fileSystem };
          }),
          description: 'Context tool',
          parameters: z.object({}),
          injectConfig: ['fileSystem'],
        };

        const contextWithoutFs = {
          logger: createMockLogger() as Logger,
        };

        const result = await executor.execute(tool, {}, contextWithoutFs, {
          retries: 3,
        });

        expect(result.success).toBe(false);
        expect(tool.execute).toHaveBeenCalledTimes(0); // Should not execute at all due to MissingContextError
      });
    });

    describe('domain validation', () => {
      it('should validate domain when tool has restrictions', async () => {
        const tool = createMockTool('restricted_tool', ['*.allowed.com']);

        const result = await executor.execute(tool, {}, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not allowed on domain');
      });

      it('should skip domain validation when tool has no restrictions', async () => {
        const tool = createMockTool('unrestricted_tool');

        const result = await executor.execute(tool, {}, mockContext);

        expect(result.success).toBe(true);
      });
    });

    describe('parameter injection', () => {
      it('should inject special parameters', async () => {
        const tool: ToolDefinition = {
          name: 'inject_tool',
          execute: vi.fn(async (_params: any, context: ToolExecutionContext) => {
            const { fileSystem, browser } = context;
            return { fileSystem, browser };
          }),
          description: 'Inject tool',
          parameters: z.object({}),
        };

        const result = await executor.execute(tool, {}, mockContext);

        expect(result.success).toBe(true);
      });

      it('should fail when required context is missing', async () => {
        const tool: ToolDefinition = {
          name: 'context_tool',
          execute: vi.fn(async (_params: any, context: ToolExecutionContext) => {
            const { fileSystem } = context;
            return fileSystem;
          }),
          description: 'Context tool',
          parameters: z.object({}),
          injectConfig: ['fileSystem'],
        };

        const emptyContext = {
          logger: createMockLogger() as Logger,
        };

        const result = await executor.execute(tool, {}, emptyContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain('requires context');
      });
    });
  });

  describe('executeBatch', () => {
    it('should execute multiple tools', async () => {
      const items = [
        { tool: createMockTool('tool1'), params: {} },
        { tool: createMockTool('tool2'), params: {} },
        { tool: createMockTool('tool3'), params: {} },
      ];

      const results = await executor.executeBatch(items, mockContext);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle partial failures', async () => {
      const successTool = createMockTool('success_tool');
      const errorTool: ToolDefinition = {
        name: 'error_tool',
        execute: vi.fn().mockRejectedValue(new Error('Failed')),
        description: 'Error tool',
        parameters: z.object({}),
      };

      const items = [
        { tool: successTool, params: {} },
        { tool: errorTool, params: {} },
      ];

      const results = await executor.executeBatch(items, mockContext);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(false);
    });

    it('should execute tools in order', async () => {
      let executionOrder: string[] = [];

      const tool1: ToolDefinition = {
        name: 'tool1',
        execute: vi.fn(async () => {
          executionOrder.push('tool1');
          return { tool: 'tool1' };
        }),
        description: 'Tool 1',
        parameters: z.object({}),
      };

      const tool2: ToolDefinition = {
        name: 'tool2',
        execute: vi.fn(async () => {
          executionOrder.push('tool2');
          return { tool: 'tool2' };
        }),
        description: 'Tool 2',
        parameters: z.object({}),
      };

      const items = [
        { tool: tool1, params: {} },
        { tool: tool2, params: {} },
      ];

      await executor.executeBatch(items, mockContext);

      expect(executionOrder).toEqual(['tool1', 'tool2']);
    });

    it('should apply options to all executions', async () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        execute: vi.fn().mockResolvedValue({ result: 'test' }),
        description: 'Test tool',
        parameters: z.object({}),
      };

      const items = [
        { tool, params: { test: 1 } },
        { tool, params: { test: 2 } },
      ];

      const options = { timeout: 5000, retries: 2 };
      await executor.executeBatch(items, mockContext, options);

      expect(tool.execute).toHaveBeenCalledTimes(2);
    });
  });
});
