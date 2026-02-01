/**
 * Custom error classes for @mimo/agent-tools
 */

import { ToolError as BaseToolError } from '@mimo/agent-core/types';

// Re-export errors from agent-core
export {
  ToolError,
  ToolExecutionError,
  ToolPermissionError,
  ToolNotFoundError,
  AgentError,
  LLMError,
  LLMRateLimitError,
  LLMTimeoutError,
  CacheError,
  AgentExecutionError,
  SocketError,
  SocketConnectionError,
} from '@mimo/agent-core/types';

/**
 * Tool timeout error
 */
export class ToolTimeoutError extends BaseToolError {
  constructor(toolName: string, timeout: number) {
    super(
      `Tool execution timeout: ${toolName}`,
      'TOOL_TIMEOUT',
      408,
      { toolName, timeout }
    );
    this.name = 'ToolTimeoutError';
  }
}

/**
 * Tool parameter validation error
 */
export class ToolValidationError extends BaseToolError {
  constructor(toolName: string, validationErrors: string[]) {
    super(
      `Tool parameter validation failed: ${toolName}`,
      'TOOL_VALIDATION_ERROR',
      400,
      { toolName, validationErrors }
    );
    this.name = 'ToolValidationError';
  }
}

/**
 * Domain not allowed error
 */
export class DomainNotAllowedError extends BaseToolError {
  constructor(toolName: string, currentDomain: string, allowedPatterns: string[]) {
    super(
      `Tool not allowed on domain: ${toolName}`,
      'DOMAIN_NOT_ALLOWED',
      403,
      { toolName, currentDomain, allowedPatterns }
    );
    this.name = 'DomainNotAllowedError';
  }
}

/**
 * Missing context error
 */
export class MissingContextError extends BaseToolError {
  constructor(toolName: string, missingContext: string[]) {
    super(
      `Tool requires context: ${toolName}`,
      'MISSING_CONTEXT',
      400,
      { toolName, missingContext }
    );
    this.name = 'MissingContextError';
  }
}

/**
 * Policy resolution error
 */
export class PolicyResolutionError extends Error {
  constructor(message: string) {
    super(`Policy resolution error: ${message}`);
    this.name = 'PolicyResolutionError';
  }
}

/**
 * Scheduler error
 */
export class SchedulerError extends Error {
  constructor(message: string) {
    super(`Scheduler error: ${message}`);
    this.name = 'SchedulerError';
  }
}
