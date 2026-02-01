/**
 * Tests for scheduler/ToolScheduler.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolScheduler } from './ToolScheduler.js';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';
import type { ExecutionResult } from '../executor/ToolExecutor.js';

describe('ToolScheduler', () => {
  let scheduler: ToolScheduler;
  let mockContext: ToolExecutionContext;

  const createMockTool = (name: string, group?: string): ToolDefinition => ({
    name,
    execute: vi.fn().mockResolvedValue({ tool: name }),
    description: `Test tool ${name}`,
    parameters: {},
    group,
  });

  beforeEach(() => {
    scheduler = new ToolScheduler();
    mockContext = {
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    };
  });

  describe('constructor', () => {
    it('should create with default group', () => {
      const s = new ToolScheduler();
      // Queues are created lazily, so getGroups() returns empty at first
      expect(s.getGroups()).toHaveLength(0);
    });

    it('should create with custom default group', () => {
      const s = new ToolScheduler({ defaultGroup: 'custom' });
      // Queues are created lazily, so getGroups() returns empty at first
      expect(s.getGroups()).toHaveLength(0);
    });

    it('should start with no active queues', () => {
      expect(scheduler.getGroups()).toHaveLength(0);
    });
  });

  describe('execute', () => {
    it('should execute a tool', async () => {
      const tool = createMockTool('test_tool', 'browser');
      const result = await scheduler.execute(tool, {}, mockContext);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ tool: 'test_tool' });
    });

    it('should use tool group if specified', async () => {
      const tool = createMockTool('browser_tool', 'browser');
      await scheduler.execute(tool, {}, mockContext);

      expect(scheduler.getGroups()).toContain('browser');
    });

    it('should use default group if tool has no group', async () => {
      const tool = createMockTool('ungrouped_tool');
      await scheduler.execute(tool, {}, mockContext);

      expect(scheduler.getGroups()).toContain('default');
    });

    it('should queue same-group tools serially', async () => {
      const tool1 = createMockTool('tool1', 'browser');
      const tool2 = createMockTool('tool2', 'browser');

      let executionOrder: string[] = [];

      const promise1 = scheduler.execute(tool1, {}, mockContext).then(result => {
        executionOrder.push('tool1');
        return result;
      });

      const promise2 = scheduler.execute(tool2, {}, mockContext).then(result => {
        executionOrder.push('tool2');
        return result;
      });

      await Promise.all([promise1, promise2]);

      expect(executionOrder).toEqual(['tool1', 'tool2']);
    });

    it('should execute different-group tools in parallel', async () => {
      const browserTool = createMockTool('browser_tool', 'browser');
      const fsTool = createMockTool('fs_tool', 'filesystem');

      let browserComplete = false;
      let fsComplete = false;

      const slowBrowserTool: ToolDefinition = {
        name: 'browser_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          browserComplete = true;
          return { tool: 'browser_tool' };
        }),
        description: 'Browser tool',
        parameters: {},
        group: 'browser',
      };

      const slowFsTool: ToolDefinition = {
        name: 'fs_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          fsComplete = true;
          return { tool: 'fs_tool' };
        }),
        description: 'FS tool',
        parameters: {},
        group: 'filesystem',
      };

      await Promise.all([
        scheduler.execute(slowBrowserTool, {}, mockContext),
        scheduler.execute(slowFsTool, {}, mockContext),
      ]);

      expect(browserComplete).toBe(true);
      expect(fsComplete).toBe(true);
    });

    it('should handle execution errors', async () => {
      const errorTool: ToolDefinition = {
        name: 'error_tool',
        execute: vi.fn().mockRejectedValue(new Error('Execution failed')),
        description: 'Error tool',
        parameters: {},
        group: 'browser',
      };

      const result = await scheduler.execute(errorTool, {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
    });
  });

  describe('executeBatch', () => {
    it('should execute multiple tools', async () => {
      const items = [
        { tool: createMockTool('tool1', 'browser'), params: {} },
        { tool: createMockTool('tool2', 'filesystem'), params: {} },
        { tool: createMockTool('tool3', 'browser'), params: {} },
      ];

      const results = await scheduler.executeBatch(items, mockContext);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should execute same-group tools serially', async () => {
      let executionOrder: string[] = [];

      const tool1: ToolDefinition = {
        name: 'tool1',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 30));
          executionOrder.push('tool1');
          return { tool: 'tool1' };
        }),
        description: 'Tool 1',
        parameters: {},
        group: 'browser',
      };

      const tool2: ToolDefinition = {
        name: 'tool2',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          executionOrder.push('tool2');
          return { tool: 'tool2' };
        }),
        description: 'Tool 2',
        parameters: {},
        group: 'browser',
      };

      const items = [
        { tool: tool1, params: {} },
        { tool: tool2, params: {} },
      ];

      await scheduler.executeBatch(items, mockContext);

      expect(executionOrder).toEqual(['tool1', 'tool2']);
    });

    it('should execute different-group tools in parallel', async () => {
      let browserComplete = false;
      let fsComplete = false;

      const browserTool: ToolDefinition = {
        name: 'browser_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          browserComplete = true;
          return { tool: 'browser_tool' };
        }),
        description: 'Browser tool',
        parameters: {},
        group: 'browser',
      };

      const fsTool: ToolDefinition = {
        name: 'fs_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          fsComplete = true;
          return { tool: 'fs_tool' };
        }),
        description: 'FS tool',
        parameters: {},
        group: 'filesystem',
      };

      const items = [
        { tool: browserTool, params: {} },
        { tool: fsTool, params: {} },
      ];

      await scheduler.executeBatch(items, mockContext);

      expect(browserComplete).toBe(true);
      expect(fsComplete).toBe(true);
    });

    it('should handle empty batch', async () => {
      const results = await scheduler.executeBatch([], mockContext);
      expect(results).toEqual([]);
    });

    it('should handle partial failures', async () => {
      const successTool = createMockTool('success_tool', 'browser');
      const errorTool: ToolDefinition = {
        name: 'error_tool',
        execute: vi.fn().mockRejectedValue(new Error('Failed')),
        description: 'Error tool',
        parameters: {},
        group: 'filesystem',
      };

      const items = [
        { tool: successTool, params: {} },
        { tool: errorTool, params: {} },
      ];

      const results = await scheduler.executeBatch(items, mockContext);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('getGroups', () => {
    it('should return active group names', async () => {
      await scheduler.execute(createMockTool('tool1', 'browser'), {}, mockContext);
      await scheduler.execute(createMockTool('tool2', 'filesystem'), {}, mockContext);

      const groups = scheduler.getGroups();
      expect(groups).toContain('browser');
      expect(groups).toContain('filesystem');
    });

    it('should return empty array when no queues', () => {
      expect(scheduler.getGroups()).toEqual([]);
    });
  });

  describe('getQueueStatus', () => {
    it('should return status for existing queue', async () => {
      const tool: ToolDefinition = {
        name: 'slow_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { done: true };
        }),
        description: 'Slow tool',
        parameters: {},
        group: 'browser',
      };

      scheduler.execute(tool, {}, mockContext);

      await new Promise(resolve => setTimeout(resolve, 10));

      const status = scheduler.getQueueStatus('browser');
      expect(status).not.toBeNull();
      expect(status?.running).toBe(true);
    });

    it('should return null for non-existent queue', () => {
      const status = scheduler.getQueueStatus('non_existent');
      expect(status).toBeNull();
    });
  });

  describe('shutdown', () => {
    it('should wait for all queues to finish', async () => {
      const tool: ToolDefinition = {
        name: 'slow_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { done: true };
        }),
        description: 'Slow tool',
        parameters: {},
        group: 'browser',
      };

      scheduler.execute(tool, {}, mockContext);

      await scheduler.shutdown();

      const status = scheduler.getQueueStatus('browser');
      expect(status).toBeNull();
    });

    it('should clear all queues after shutdown', async () => {
      await scheduler.execute(createMockTool('tool1', 'browser'), {}, mockContext);
      await scheduler.execute(createMockTool('tool2', 'filesystem'), {}, mockContext);

      await scheduler.shutdown();

      expect(scheduler.getGroups()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all queues', async () => {
      const slowTool: ToolDefinition = {
        name: 'slow_tool',
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { done: true };
        }),
        description: 'Slow tool',
        parameters: {},
        group: 'browser',
      };

      scheduler.execute(slowTool, {}, mockContext);

      await new Promise(resolve => setTimeout(resolve, 10));

      scheduler.clear();

      expect(scheduler.getGroups()).toEqual([]);
    });
  });
});
