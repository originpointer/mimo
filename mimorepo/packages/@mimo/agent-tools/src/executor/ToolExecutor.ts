/**
 * Tool Executor - Execute tools with timeout and error handling
 */

import type {
  ToolDefinition,
  ToolExecutionContext,
} from '@mimo/agent-core/types';
import type { ToolCall } from '@mimo/agent-core/types';
import { ParamInjector } from './ParamInjector.js';
import { DomainGuard } from './DomainGuard.js';
import {
  ToolExecutionError,
  ToolTimeoutError,
  MissingContextError,
} from '../utils/errors.js';

/**
 * Execution options
 */
export interface ExecutionOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Number of retries */
  retries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  toolCall: ToolCall;
}

/**
 * Tool Executor
 * Executes tools with timeout, retries, and error handling
 */
export class ToolExecutor {
  private injector = new ParamInjector();
  private guard = new DomainGuard();

  /**
   * Execute a single tool
   * @param tool - Tool definition
   * @param params - Tool parameters
   * @param context - Execution context
   * @param options - Execution options
   * @returns Execution result
   */
  async execute(
    tool: ToolDefinition,
    params: any,
    context: ToolExecutionContext,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const toolCall: ToolCall = {
      id: this.generateCallId(),
      name: tool.name,
      parameters: params,
    };

    try {
      // Validate context parameters first (before domain check)
      const validation = this.injector.validate(tool, context);
      if (!validation.valid) {
        throw new MissingContextError(tool.name, validation.missing);
      }

      // Domain check
      if (tool.domains) {
        await this.guard.validate(tool, context.browser);
      }

      // Inject parameters
      const injected = this.injector.inject(params, context, tool);

      // Execute with timeout and retries
      const result = await this.executeWithRetries(
        tool,
        injected,
        context,
        options
      );

      return {
        success: true,
        result,
        duration: Date.now() - startTime,
        toolCall: {
          ...toolCall,
          result,
          success: true,
        },
      };
    } catch (error) {
      // Get original error message if wrapped in ToolExecutionError
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Extract original error from ToolExecutionError
      if (error instanceof Error && error.name === 'ToolExecutionError') {
        const details = (error as any).details;
        if (details?.originalError) {
          errorMessage = details.originalError;
        }
      }
      // Preserve ToolTimeoutError message (contains 'timeout' keyword)
      else if (error instanceof Error && error.name === 'ToolTimeoutError') {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        toolCall: {
          ...toolCall,
          success: false,
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Execute multiple tools in batch
   * @param items - Tools to execute
   * @param context - Execution context
   * @param options - Execution options
   * @returns Array of execution results
   */
  async executeBatch(
    items: Array<{
      tool: ToolDefinition;
      params: any;
    }>,
    context: ToolExecutionContext,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const item of items) {
      const result = await this.execute(
        item.tool,
        item.params,
        context,
        options
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Execute with retries
   */
  private async executeWithRetries(
    tool: ToolDefinition,
    params: any,
    context: ToolExecutionContext,
    options: ExecutionOptions
  ): Promise<any> {
    const maxRetries = options.retries ?? 0;
    const retryDelay = options.retryDelay ?? 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeWithTimeout(
          tool,
          params,
          context,
          options
        );
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof MissingContextError) {
          throw error;
        }

        // Don't retry on timeout errors
        if (error instanceof Error && error.name === 'ToolTimeoutError') {
          throw error;
        }

        // Retry if we have attempts left
        if (attempt < maxRetries) {
          await this.delay(retryDelay);
        }
      }
    }

    throw new ToolExecutionError(tool.name, lastError!);
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    tool: ToolDefinition,
    params: any,
    context: ToolExecutionContext,
    options: ExecutionOptions
  ): Promise<any> {
    const timeout = options.timeout ?? tool.timeout ?? 30000;

    return Promise.race([
      tool.execute(params, context),
      this.createTimeoutPromise(timeout, tool.name),
    ]);
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number, toolName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ToolTimeoutError(toolName, timeout));
      }, timeout);
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique call ID
   */
  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
