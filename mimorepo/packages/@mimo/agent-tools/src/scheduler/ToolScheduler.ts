/**
 * Tool Scheduler - Type-grouped parallel execution
 * Same-group tools execute serially, different groups execute in parallel
 */

import type {
  ToolDefinition,
  ToolExecutionContext,
} from '@mimo/agent-core/types';
import type { ExecutionResult } from '../executor/ToolExecutor.js';
import { ToolQueue } from './ToolQueue.js';

/**
 * Scheduler options
 */
export interface SchedulerOptions {
  /** Default group for tools without a group specified */
  defaultGroup?: string;
}

/**
 * Tool Scheduler
 * Manages type-grouped parallel execution of tools
 */
export class ToolScheduler {
  private queues: Map<string, ToolQueue> = new Map();
  private defaultGroup: string;

  constructor(options: SchedulerOptions = {}) {
    this.defaultGroup = options.defaultGroup ?? 'default';
  }

  /**
   * Execute a single tool
   * @param tool - Tool definition
   * @param params - Tool parameters
   * @param context - Execution context
   * @returns Execution result
   */
  async execute(
    tool: ToolDefinition,
    params: any,
    context: ToolExecutionContext
  ): Promise<ExecutionResult> {
    const group = tool.group || this.defaultGroup;
    const queue = this.getQueue(group);

    return new Promise((resolve, reject) => {
      queue.enqueue({
        tool,
        params,
        context,
        resolve,
        reject,
      });
      queue.start();
    });
  }

  /**
   * Execute multiple tools with type-grouped parallel execution
   * @param items - Tools to execute
   * @param context - Execution context
   * @returns Array of execution results
   */
  async executeBatch(
    items: Array<{
      tool: ToolDefinition;
      params: any;
    }>,
    context: ToolExecutionContext
  ): Promise<ExecutionResult[]> {
    // Group tools by group name
    const grouped = new Map<string, Array<typeof items[0]>>();

    for (const item of items) {
      const group = item.tool.group || this.defaultGroup;
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(item);
    }

    // Execute each group serially, groups in parallel
    const groupPromises = Array.from(grouped.entries()).map(
      ([group, groupItems]) => this.executeGroup(group, groupItems, context)
    );

    const results = await Promise.all(groupPromises);
    return results.flat();
  }

  /**
   * Execute all tools in a group (serial execution)
   */
  private async executeGroup(
    _group: string,
    items: Array<{
      tool: ToolDefinition;
      params: any;
    }>,
    context: ToolExecutionContext
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const item of items) {
      const result = await this.execute(item.tool, item.params, context);
      results.push(result);
    }

    return results;
  }

  /**
   * Get or create a queue for a group
   */
  private getQueue(group: string): ToolQueue {
    if (!this.queues.has(group)) {
      this.queues.set(group, new ToolQueue(group));
    }
    return this.queues.get(group)!;
  }

  /**
   * Get all active group names
   */
  getGroups(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Get queue status for a group
   */
  getQueueStatus(group: string): { length: number; running: boolean } | null {
    const queue = this.queues.get(group);
    if (!queue) {
      return null;
    }
    return {
      length: queue.length,
      running: queue.isRunning,
    };
  }

  /**
   * Wait for all queues to finish processing
   */
  async shutdown(): Promise<void> {
    const promises = Array.from(this.queues.values()).map(q => q.shutdown());
    await Promise.all(promises);
    this.queues.clear();
  }

  /**
   * Clear all queues
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.clear();
    }
    this.queues.clear();
  }
}
