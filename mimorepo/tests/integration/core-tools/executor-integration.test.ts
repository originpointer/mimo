/**
 * Tool Executor Integration Tests
 *
 * Verifies ToolExecutor integration with agent-core types and real tool execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '@mimo/agent-tools';
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { testTools, testContexts } from '../fixtures';
import { expectSuccess, expectFailure, expectToolCall, expectDuration } from '../fixtures/assertions';
import { z } from 'zod';

describe('ToolExecutor Integration', () => {
  let registry: ToolRegistry;
  let executor: ToolExecutor;

  beforeEach(() => {
    registry = new ToolRegistry();
    executor = new ToolExecutor();
  });

  describe('basic tool execution', () => {
    it('should execute tool successfully', async () => {
      registry.register(testTools[0]); // calculateTool
      const tool = registry.getTool('calculate');

      const result = await executor.execute(
        tool!,
        { expression: '2 + 3' },
        testContexts.minimal
      );

      expectSuccess(result);
      expect(result.result.result).toBe(5);
      expectToolCall(result, 'calculate', { expression: '2 + 3' });
    });

    it('should execute string tool', async () => {
      registry.register(testTools[1]); // stringTool
      const tool = registry.getTool('string_operations');

      const result = await executor.execute(
        tool!,
        { text: 'Hello', operation: 'upper' },
        testContexts.minimal
      );

      expectSuccess(result);
      expect(result.result.result).toBe('HELLO');
    });

    it('should execute echo tool', async () => {
      registry.register(testTools[4]); // echoTool
      const tool = registry.getTool('echo');

      const result = await executor.execute(
        tool!,
        { text: 'Test echo' },
        testContexts.minimal
      );

      expectSuccess(result);
      expect(result.result.echo).toBe('Test echo');
    });

    it('should execute array tool', async () => {
      registry.register(testTools[5]); // arrayTool
      const tool = registry.getTool('array_operations');

      const result = await executor.execute(
        tool!,
        { numbers: [1, 2, 3, 4, 5], operation: 'sum' },
        testContexts.minimal
      );

      expectSuccess(result);
      expect(result.result.result).toBe(15);
    });
  });

  describe('context parameter injection', () => {
    it('should inject special parameters when available', async () => {
      const tool = {
        name: 'context_test',
        description: 'Test context injection',
        parameters: z.object({}),
        execute: async (_params: any, context: any) => {
          return {
            hasBrowser: !!context.browser,
            hasLogger: !!context.logger,
          };
        },
      };

      registry.register(tool);

      const result = await executor.execute(
        tool,
        {},
        testContexts.withBrowser
      );

      expectSuccess(result);
      expect(result.result.hasBrowser).toBe(true);
      expect(result.result.hasLogger).toBe(true);
    });
  });

  describe('timeout handling', () => {
    it('should use tool timeout', async () => {
      registry.register(testTools[2]); // delayTool with 5000ms timeout

      const result = await executor.execute(
        registry.getTool('delay')!,
        { ms: 200 },
        testContexts.minimal
      );

      // Should succeed since 200ms < 5000ms timeout
      expectSuccess(result);
      expect(result.result.delayed).toBe(200);
    }, 10000);

    it('should use options timeout', async () => {
      registry.register(testTools[2]); // delayTool

      const result = await executor.execute(
        registry.getTool('delay')!,
        { ms: 10000 },
        testContexts.minimal,
        { timeout: 100 }
      );

      expectFailure(result, 'timeout');
    }, 15000);
  });

  describe('retry handling', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const flakyTool = {
        name: 'flaky_tool',
        description: 'Tool that fails before succeeding',
        parameters: z.object({}),
        execute: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return { success: true, attempts };
        },
      };

      registry.register(flakyTool);

      const result = await executor.execute(
        flakyTool,
        {},
        testContexts.minimal,
        { retries: 3, retryDelay: 10 }
      );

      expectSuccess(result);
      expect(result.result.attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const failingTool = {
        name: 'failing_tool',
        description: 'Tool that always fails',
        parameters: z.object({}),
        execute: async () => {
          throw new Error('Permanent failure');
        },
      };

      registry.register(failingTool);

      const result = await executor.execute(
        failingTool,
        {},
        testContexts.minimal,
        { retries: 2, retryDelay: 10 }
      );

      expectFailure(result, 'Permanent failure');
    });
  });

  describe('error handling', () => {
    it('should handle tool errors', async () => {
      registry.register(testTools[3]); // errorTool
      const tool = registry.getTool('raise_error');

      const result = await executor.execute(
        tool!,
        { message: 'Test error' },
        testContexts.minimal
      );

      expectFailure(result, 'Test error');
    });

    it('should handle execution errors', async () => {
      const errorTool = {
        name: 'error_tool',
        description: 'Throws error',
        parameters: z.object({}),
        execute: async () => {
          throw new Error('Execution error');
        },
      };

      registry.register(errorTool);

      const result = await executor.execute(
        errorTool,
        {},
        testContexts.minimal
      );

      expectFailure(result, 'Execution error');
    });
  });

  describe('execution tracking', () => {
    it('should generate unique call IDs', async () => {
      registry.register(testTools[0]); // calculateTool

      const result1 = await executor.execute(
        registry.getTool('calculate')!,
        { expression: '1 + 1' },
        testContexts.minimal
      );

      const result2 = await executor.execute(
        registry.getTool('calculate')!,
        { expression: '2 + 2' },
        testContexts.minimal
      );

      expect(result1.toolCall.id).not.toBe(result2.toolCall.id);
      expect(result1.toolCall.id).toMatch(/^call_\d+_[a-z0-9]+$/);
      expect(result2.toolCall.id).toMatch(/^call_\d+_[a-z0-9]+$/);
    });

    it('should track execution duration', async () => {
      registry.register(testTools[2]); // delayTool

      const result = await executor.execute(
        registry.getTool('delay')!,
        { ms: 100 },
        testContexts.minimal
      );

      expectSuccess(result);
      expectDuration(result, 90, 200);
    });
  });

  describe('batch execution', () => {
    it('should execute multiple tools', async () => {
      registry.registerBatch([testTools[0], testTools[1], testTools[4]]);

      const items = [
        { tool: registry.getTool('calculate')!, params: { expression: '1 + 1' } },
        { tool: registry.getTool('string_operations')!, params: { text: 'test', operation: 'upper' } },
        { tool: registry.getTool('echo')!, params: { text: 'echo test' } },
      ];

      const results = await executor.executeBatch(items, testContexts.minimal);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results[0].result.result).toBe(2);
      expect(results[1].result.result).toBe('TEST');
      expect(results[2].result.echo).toBe('echo test');
    });

    it('should handle partial failures in batch', async () => {
      registry.registerBatch([testTools[0], testTools[3]]); // calculateTool, errorTool

      const items = [
        { tool: registry.getTool('calculate')!, params: { expression: '1 + 1' } },
        { tool: registry.getTool('raise_error')!, params: { message: 'Batch error' } },
      ];

      const results = await executor.executeBatch(items, testContexts.minimal);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Batch error');
    });
  });
});
