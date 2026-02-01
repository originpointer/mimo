/**
 * Tests for monitor/ToolMonitor.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ToolMonitor,
  getToolMonitor,
  resetToolMonitor,
} from './ToolMonitor.js';
import type { ExecutionResult } from '../executor/ToolExecutor.js';
import type { ToolCall } from '@mimo/agent-core/types';

describe('ToolMonitor', () => {
  let monitor: ToolMonitor;

  const createMockExecutionResult = (
    name: string,
    success: boolean,
    duration: number
  ): ExecutionResult => ({
    success,
    result: success ? { data: 'test' } : undefined,
    error: success ? '' : 'Test error',
    duration,
    toolCall: {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      parameters: {},
      success,
      error: success ? undefined : 'Test error',
    } as ToolCall,
  });

  beforeEach(() => {
    monitor = new ToolMonitor();
  });

  afterEach(() => {
    resetToolMonitor();
  });

  describe('record', () => {
    it('should record execution result', () => {
      const result = createMockExecutionResult('test_tool', true, 100);

      monitor.record(result);

      expect(monitor.size).toBe(1);
    });

    it('should limit records to maxRecords', () => {
      const smallMonitor = new ToolMonitor();
      smallMonitor.setMaxRecords(5);

      for (let i = 0; i < 10; i++) {
        smallMonitor.record(createMockExecutionResult(`tool_${i}`, true, 100));
      }

      expect(smallMonitor.size).toBe(5);
    });

    it('should remove oldest records when exceeding maxRecords', () => {
      monitor.setMaxRecords(3);

      monitor.record(createMockExecutionResult('tool1', true, 100));
      monitor.record(createMockExecutionResult('tool2', true, 100));
      monitor.record(createMockExecutionResult('tool3', true, 100));
      monitor.record(createMockExecutionResult('tool4', true, 100));

      expect(monitor.size).toBe(3);

      const history = monitor.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0]?.toolCall.name).toBe('tool2');
      expect(history[2]?.toolCall.name).toBe('tool4');
    });

    it('should store timestamp with record', () => {
      const beforeTime = Date.now();
      monitor.record(createMockExecutionResult('test_tool', true, 100));
      const afterTime = Date.now();

      const records = monitor.getHistory();
      expect(records[0]?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(records[0]?.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      monitor.record(createMockExecutionResult('tool1', true, 100));
      monitor.record(createMockExecutionResult('tool2', true, 200));
      monitor.record(createMockExecutionResult('tool1', false, 50));
      monitor.record(createMockExecutionResult('tool3', true, 150));
    });

    it('should return all records', () => {
      const history = monitor.getHistory();

      expect(history).toHaveLength(4);
    });

    it('should filter by tool name', () => {
      const history = monitor.getHistory('tool1');

      expect(history).toHaveLength(2);
      expect(history.every(r => r.toolCall.name === 'tool1')).toBe(true);
    });

    it('should limit results', () => {
      const history = monitor.getHistory(undefined, 2);

      expect(history).toHaveLength(2);
    });

    it('should filter and limit together', () => {
      const history = monitor.getHistory('tool1', 1);

      expect(history).toHaveLength(1);
      expect(history[0]?.toolCall.name).toBe('tool1');
    });

    it('should return empty array for non-existent tool', () => {
      const history = monitor.getHistory('non_existent');

      expect(history).toEqual([]);
    });

    it('should return most recent records when limited', () => {
      monitor.record(createMockExecutionResult('tool_recent', true, 100));
      monitor.record(createMockExecutionResult('tool_very_recent', true, 100));

      const history = monitor.getHistory(undefined, 2);

      expect(history).toHaveLength(2);
      expect(history[0]?.toolCall.name).toBe('tool_recent');
      expect(history[1]?.toolCall.name).toBe('tool_very_recent');
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      monitor.record(createMockExecutionResult('tool1', true, 100));
      monitor.record(createMockExecutionResult('tool1', true, 200));
      monitor.record(createMockExecutionResult('tool1', false, 50));
      monitor.record(createMockExecutionResult('tool2', true, 150));
    });

    it('should calculate overall stats', () => {
      const stats = monitor.getStats();

      expect(stats.total).toBe(4);
      expect(stats.successful).toBe(3);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(0.75);
      expect(stats.avgDuration).toBeCloseTo(125);
    });

    it('should calculate stats for specific tool', () => {
      const stats = monitor.getStats('tool1');

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(2 / 3);
      expect(stats.avgDuration).toBeCloseTo(116.67, 1);
    });

    it('should include min and max duration', () => {
      const stats = monitor.getStats('tool1');

      expect(stats.minDuration).toBe(50);
      expect(stats.maxDuration).toBe(200);
    });

    it('should return zero stats when no records', () => {
      const emptyMonitor = new ToolMonitor();
      const stats = emptyMonitor.getStats();

      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgDuration).toBe(0);
      expect(stats.minDuration).toBeUndefined();
      expect(stats.maxDuration).toBeUndefined();
    });

    it('should return zero stats for non-existent tool', () => {
      const stats = monitor.getStats('non_existent');

      expect(stats.total).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('getAllStats', () => {
    beforeEach(() => {
      monitor.record(createMockExecutionResult('tool1', true, 100));
      monitor.record(createMockExecutionResult('tool1', false, 50));
      monitor.record(createMockExecutionResult('tool2', true, 150));
      monitor.record(createMockExecutionResult('tool3', true, 200));
    });

    it('should return stats for all tools', () => {
      const allStats = monitor.getAllStats();

      expect(allStats.size).toBe(3);
      expect(allStats.has('tool1')).toBe(true);
      expect(allStats.has('tool2')).toBe(true);
      expect(allStats.has('tool3')).toBe(true);
    });

    it('should calculate correct stats per tool', () => {
      const allStats = monitor.getAllStats();

      const tool1Stats = allStats.get('tool1')!;
      expect(tool1Stats.total).toBe(2);
      expect(tool1Stats.successful).toBe(1);
      expect(tool1Stats.failed).toBe(1);

      const tool2Stats = allStats.get('tool2')!;
      expect(tool2Stats.total).toBe(1);
      expect(tool2Stats.successful).toBe(1);
    });
  });

  describe('getRecentFailures', () => {
    beforeEach(() => {
      monitor.record(createMockExecutionResult('tool1', true, 100));
      monitor.record(createMockExecutionResult('tool2', false, 50));
      monitor.record(createMockExecutionResult('tool3', false, 75));
      monitor.record(createMockExecutionResult('tool4', false, 100));
      monitor.record(createMockExecutionResult('tool5', true, 150));
    });

    it('should return recent failures', () => {
      const failures = monitor.getRecentFailures();

      expect(failures).toHaveLength(3);
      expect(failures.every(f => !f.result.success)).toBe(true);
    });

    it('should limit number of failures', () => {
      const failures = monitor.getRecentFailures(2);

      expect(failures).toHaveLength(2);
    });

    it('should return empty array when no failures', () => {
      const successMonitor = new ToolMonitor();
      successMonitor.record(createMockExecutionResult('tool1', true, 100));
      successMonitor.record(createMockExecutionResult('tool2', true, 200));

      const failures = successMonitor.getRecentFailures();

      expect(failures).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all records', () => {
      monitor.record(createMockExecutionResult('tool1', true, 100));
      monitor.record(createMockExecutionResult('tool2', true, 200));

      expect(monitor.size).toBe(2);

      monitor.clear();

      expect(monitor.size).toBe(0);
      expect(monitor.getHistory()).toEqual([]);
    });
  });

  describe('setMaxRecords', () => {
    it('should update max records', () => {
      monitor.setMaxRecords(5);

      for (let i = 0; i < 10; i++) {
        monitor.record(createMockExecutionResult(`tool_${i}`, true, 100));
      }

      expect(monitor.size).toBe(5);
    });

    it('should trim existing records when reducing max', () => {
      for (let i = 0; i < 10; i++) {
        monitor.record(createMockExecutionResult(`tool_${i}`, true, 100));
      }

      monitor.setMaxRecords(3);

      expect(monitor.size).toBe(3);
    });
  });

  describe('size', () => {
    it('should return 0 when empty', () => {
      expect(monitor.size).toBe(0);
    });

    it('should return record count', () => {
      monitor.record(createMockExecutionResult('tool1', true, 100));
      monitor.record(createMockExecutionResult('tool2', true, 200));

      expect(monitor.size).toBe(2);
    });
  });

  describe('global instance', () => {
    it('should return same instance', () => {
      const instance1 = getToolMonitor();
      const instance2 = getToolMonitor();

      expect(instance1).toBe(instance2);
    });

    it('should reset global instance', () => {
      const instance1 = getToolMonitor();
      instance1.record(createMockExecutionResult('tool1', true, 100));

      resetToolMonitor();
      const instance2 = getToolMonitor();

      expect(instance1).not.toBe(instance2);
      expect(instance2.size).toBe(0);
    });
  });
});
