/**
 * Tests for scheduler/ToolQueue.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolQueue } from './ToolQueue.js';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';
import type { ExecutionResult } from '../executor/ToolExecutor.js';

describe('ToolQueue', () => {
  let queue: ToolQueue;
  let mockTool: ToolDefinition;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    queue = new ToolQueue('test-group');
    mockTool = {
      name: 'test_tool',
      execute: vi.fn().mockResolvedValue({ success: true, data: 'test' }),
      description: 'Test tool',
      parameters: {},
    };
    mockContext = {
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    };
  });

  describe('constructor', () => {
    it('should create queue with group name', () => {
      expect(queue.group).toBe('test-group');
    });

    it('should start not running', () => {
      expect(queue.isRunning).toBe(false);
    });

    it('should start empty', () => {
      expect(queue.length).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('should add task to queue', () => {
      const task = {
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      };

      queue.enqueue(task);
      expect(queue.length).toBe(1);
    });

    it('should add multiple tasks to queue', () => {
      const task1 = {
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      };
      const task2 = {
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      };

      queue.enqueue(task1);
      queue.enqueue(task2);
      expect(queue.length).toBe(2);
    });
  });

  describe('start', () => {
    it('should process tasks in queue', async () => {
      const resolveSpy = vi.fn();
      const rejectSpy = vi.fn();

      queue.enqueue({
        tool: mockTool,
        params: { test: 'value' },
        context: mockContext,
        resolve: resolveSpy,
        reject: rejectSpy,
      });

      queue.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(resolveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          toolCall: expect.objectContaining({
            name: 'test_tool',
            parameters: { test: 'value' },
          }),
        })
      );
      expect(queue.length).toBe(0);
    });

    it('should process multiple tasks serially', async () => {
      const results: string[] = [];

      const tool1: ToolDefinition = {
        name: 'tool1',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { tool: 'tool1' };
        }),
        description: 'Tool 1',
        parameters: {},
      };

      const tool2: ToolDefinition = {
        name: 'tool2',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { tool: 'tool2' };
        }),
        description: 'Tool 2',
        parameters: {},
      };

      queue.enqueue({
        tool: tool1,
        params: {},
        context: mockContext,
        resolve: (result: ExecutionResult) => results.push(result.result.tool),
        reject: vi.fn(),
      });

      queue.enqueue({
        tool: tool2,
        params: {},
        context: mockContext,
        resolve: (result: ExecutionResult) => results.push(result.result.tool),
        reject: vi.fn(),
      });

      queue.start();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(results).toEqual(['tool1', 'tool2']);
    });

    it('should handle task errors and continue', async () => {
      const errorTool: ToolDefinition = {
        name: 'error_tool',
        execute: vi.fn().mockRejectedValue(new Error('Task failed')),
        description: 'Error tool',
        parameters: {},
      };

      const successTool: ToolDefinition = {
        name: 'success_tool',
        execute: vi.fn().mockResolvedValue({ success: true }),
        description: 'Success tool',
        parameters: {},
      };

      const errorResolveSpy = vi.fn();
      const successResolveSpy = vi.fn();

      queue.enqueue({
        tool: errorTool,
        params: {},
        context: mockContext,
        resolve: errorResolveSpy,
        reject: vi.fn(),
      });

      queue.enqueue({
        tool: successTool,
        params: {},
        context: mockContext,
        resolve: successResolveSpy,
        reject: vi.fn(),
      });

      queue.start();

      await new Promise(resolve => setTimeout(resolve, 200));

      // Both tasks should resolve with ExecutionResult
      // First task resolves with success: false
      expect(errorResolveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Task failed',
        })
      );
      // Second task resolves with success: true
      expect(successResolveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: { success: true },
        })
      );
    });

    it('should not start if already running', () => {
      queue.start();

      const initialRunningState = queue.isRunning;

      queue.start();

      expect(queue.isRunning).toBe(initialRunningState);
    });
  });

  describe('shutdown', () => {
    it('should wait for queue to finish processing', async () => {
      queue.enqueue({
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      queue.start();

      await queue.shutdown();

      expect(queue.isRunning).toBe(false);
      expect(queue.length).toBe(0);
    });

    it('should return immediately when queue is empty', async () => {
      const start = Date.now();
      await queue.shutdown();
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should wait for current task to complete', async () => {
      let taskComplete = false;

      const slowTool: ToolDefinition = {
        name: 'slow_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          taskComplete = true;
          return { done: true };
        }),
        description: 'Slow tool',
        parameters: {},
      };

      queue.enqueue({
        tool: slowTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      queue.start();

      await queue.shutdown();

      expect(taskComplete).toBe(true);
      expect(queue.isRunning).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all tasks from queue', () => {
      queue.enqueue({
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      });
      queue.enqueue({
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      expect(queue.length).toBe(2);

      queue.clear();

      expect(queue.length).toBe(0);
    });

    it('should not affect running state', async () => {
      queue.enqueue({
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      queue.start();
      queue.clear();

      expect(queue.isRunning).toBe(true);

      await queue.shutdown();
    });
  });

  describe('properties', () => {
    it('should expose queue length', () => {
      expect(queue.length).toBe(0);

      queue.enqueue({
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      expect(queue.length).toBe(1);
    });

    it('should expose running state', () => {
      expect(queue.isRunning).toBe(false);

      queue.enqueue({
        tool: mockTool,
        params: {},
        context: mockContext,
        resolve: vi.fn(),
        reject: vi.fn(),
      });

      queue.start();

      expect(queue.isRunning).toBe(true);

      return queue.shutdown().then(() => {
        expect(queue.isRunning).toBe(false);
      });
    });
  });
});
