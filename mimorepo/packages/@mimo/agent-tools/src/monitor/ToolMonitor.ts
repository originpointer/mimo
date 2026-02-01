/**
 * Tool Monitor - Execution monitoring and statistics
 */

import type { ToolCall } from '@mimo/agent-core/types';
import type { ExecutionResult } from '../executor/ToolExecutor.js';

/**
 * Execution record
 */
export interface ExecutionRecord {
  toolCall: ToolCall;
  result: ExecutionResult;
  timestamp: number;
}

/**
 * Execution statistics
 */
export interface ExecutionStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgDuration: number;
  minDuration?: number;
  maxDuration?: number;
}

/**
 * Tool Monitor
 * Records and analyzes tool executions
 */
export class ToolMonitor {
  private records: ExecutionRecord[] = [];
  private maxRecords = 1000;

  /**
   * Record an execution
   * @param result - Execution result
   */
  record(result: ExecutionResult): void {
    this.records.push({
      toolCall: result.toolCall,
      result,
      timestamp: Date.now(),
    });

    // Limit records to maxRecords
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }
  }

  /**
   * Get execution history
   * @param toolName - Optional tool name to filter by
   * @param limit - Maximum number of records to return
   * @returns Execution records
   */
  getHistory(toolName?: string, limit?: number): ExecutionRecord[] {
    let records = this.records;

    if (toolName) {
      records = records.filter(r => r.toolCall.name === toolName);
    }

    if (limit) {
      records = records.slice(-limit);
    }

    return records;
  }

  /**
   * Get execution statistics
   * @param toolName - Optional tool name to filter by
   * @returns Execution statistics
   */
  getStats(toolName?: string): ExecutionStats {
    let records = this.records;

    if (toolName) {
      records = records.filter(r => r.toolCall.name === toolName);
    }

    const total = records.length;
    const successful = records.filter(r => r.result.success).length;
    const failed = total - successful;

    const durations = records
      .filter(r => r.result.duration !== undefined)
      .map(r => r.result.duration!);

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const result: ExecutionStats = {
      total,
      successful,
      failed,
      successRate: total > 0 ? successful / total : 0,
      avgDuration,
    };

    if (durations.length > 0) {
      result.minDuration = Math.min(...durations);
      result.maxDuration = Math.max(...durations);
    }

    return result;
  }

  /**
   * Get statistics for all tools
   * @returns Map of tool name to stats
   */
  getAllStats(): Map<string, ExecutionStats> {
    const stats = new Map<string, ExecutionStats>();
    const toolNames = new Set(this.records.map(r => r.toolCall.name));

    for (const name of toolNames) {
      stats.set(name, this.getStats(name));
    }

    return stats;
  }

  /**
   * Get recent failures
   * @param limit - Maximum number of failures to return
   * @returns Failed execution records
   */
  getRecentFailures(limit = 10): ExecutionRecord[] {
    return this.records
      .filter(r => !r.result.success)
      .slice(-limit);
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
  }

  /**
   * Set maximum records to keep
   * @param max - Maximum number of records
   */
  setMaxRecords(max: number): void {
    this.maxRecords = max;

    // Trim if necessary
    while (this.records.length > this.maxRecords) {
      this.records.shift();
    }
  }

  /**
   * Get current record count
   */
  get size(): number {
    return this.records.length;
  }
}

/**
 * Global monitor instance
 */
let globalMonitor: ToolMonitor | null = null;

/**
 * Get global monitor instance
 */
export function getToolMonitor(): ToolMonitor {
  if (!globalMonitor) {
    globalMonitor = new ToolMonitor();
  }
  return globalMonitor;
}

/**
 * Reset global monitor
 */
export function resetToolMonitor(): void {
  globalMonitor = null;
}
