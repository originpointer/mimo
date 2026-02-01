/**
 * Execution Context Manager
 */

import type {
  ToolExecutionContext,
  FileSystem,
  BrowserSession,
  MemoryStore,
} from '@mimo/agent-core/types';
import type { ILLMClient } from '@mimo/agent-core';
import type { Logger } from '@mimo/agent-core/types';
import { createLogger } from '@mimo/agent-core';

/**
 * Context options
 */
export interface ContextOptions {
  fileSystem?: FileSystem;
  browser?: BrowserSession;
  llm?: ILLMClient;
  memory?: MemoryStore;
  logger?: Logger;
  config?: Record<string, any>;
}

/**
 * Execution Context Manager
 * Creates and manages tool execution contexts
 */
export class ExecutionContextManager {
  /**
   * Create a new execution context
   * @param options - Context options
   * @returns Execution context
   */
  create(options: ContextOptions = {}): ToolExecutionContext {
    const context: ToolExecutionContext = {
      ...options,
    };

    // Create default logger if not provided
    if (!context.logger) {
      context.logger = this.createDefaultLogger();
    }

    return context;
  }

  /**
   * Merge multiple contexts
   * @param base - Base context
   * @param extra - Additional context options
   * @returns Merged context
   */
  merge(base: ToolExecutionContext, extra: ContextOptions): ToolExecutionContext {
    return {
      ...base,
      ...extra,
      config: {
        ...base.config,
        ...extra.config,
      },
    };
  }

  /**
   * Create a child context (inherits from parent)
   * @param parent - Parent context
   * @param overrides - Override values
   * @returns Child context
   */
  createChild(parent: ToolExecutionContext, overrides: ContextOptions = {}): ToolExecutionContext {
    return this.merge(parent, overrides);
  }

  /**
   * Validate that context has required fields
   * @param context - Context to validate
   * @param requirements - Required field names
   * @returns true if valid
   */
  validate(context: ToolExecutionContext, requirements: string[]): boolean {
    for (const req of requirements) {
      if (!(req in context) || context[req as keyof ToolExecutionContext] === undefined) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create a default logger
   */
  private createDefaultLogger() {
    return createLogger('Tool');
  }
}

/**
 * Global manager instance
 */
let globalManager: ExecutionContextManager | null = null;

/**
 * Get global context manager
 */
export function getExecutionContextManager(): ExecutionContextManager {
  if (!globalManager) {
    globalManager = new ExecutionContextManager();
  }
  return globalManager;
}

/**
 * Reset global manager
 */
export function resetExecutionContextManager(): void {
  globalManager = null;
}
