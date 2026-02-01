/**
 * Tool Queue - Serial execution queue for same-group tools
 */

import type { ToolDefinition, ToolExecutionContext, ToolCall } from '@mimo/agent-core/types';
import type { ExecutionResult } from '../executor/ToolExecutor.js';
import { ToolExecutor } from '../executor/ToolExecutor.js';

/**
 * Queue task
 */
interface QueueTask {
  tool: ToolDefinition;
  params: any;
  context: ToolExecutionContext;
  resolve: (result: ExecutionResult) => void;
  reject: (error: Error) => void;
}

/**
 * Tool Queue
 * Executes tasks serially within a group
 */
export class ToolQueue {
  private queue: QueueTask[] = [];
  private running = false;
  private executor = new ToolExecutor();

  constructor(public readonly group: string) {}

  /**
   * Add a task to the queue
   */
  enqueue(task: QueueTask): void {
    this.queue.push(task);
  }

  /**
   * Get current queue length
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is currently processing
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Start processing the queue
   */
  start(): void {
    if (this.running) {
      return;
    }
    this.process();
  }

  /**
   * Process queue (serial execution)
   */
  private async process(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;

      try {
        const result = await this.executor.execute(
          task.tool,
          task.params,
          task.context
        );
        // Always resolve - the result contains success status
        task.resolve(result);
      } catch (error) {
        // Wrap in ExecutionResult for consistency
        task.resolve({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: 0,
          toolCall: {
            id: this.generateCallId(),
            name: task.tool.name,
            parameters: task.params,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    this.running = false;
  }

  /**
   * Generate unique call ID
   */
  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Wait for queue to finish processing
   */
  async shutdown(): Promise<void> {
    while (this.running || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }
}
