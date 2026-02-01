/**
 * Tests for utils/errors.ts
 */

import { describe, it, expect } from 'vitest';
import {
  ToolTimeoutError,
  ToolValidationError,
  DomainNotAllowedError,
  MissingContextError,
  PolicyResolutionError,
  SchedulerError,
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
} from './errors.js';

describe('utils/errors', () => {
  describe('ToolTimeoutError', () => {
    it('should create error with correct properties', () => {
      const error = new ToolTimeoutError('testTool', 5000);

      expect(error.name).toBe('ToolTimeoutError');
      expect(error.message).toBe('Tool execution timeout: testTool');
      expect(error.code).toBe('TOOL_TIMEOUT');
      expect(error.statusCode).toBe(408);
      expect(error.details).toEqual({ toolName: 'testTool', timeout: 5000 });
    });

    it('should be instanceof Error', () => {
      const error = new ToolTimeoutError('testTool', 5000);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ToolValidationError', () => {
    it('should create error with validation errors', () => {
      const validationErrors = ['param1 is required', 'param2 must be a string'];
      const error = new ToolValidationError('testTool', validationErrors);

      expect(error.name).toBe('ToolValidationError');
      expect(error.message).toBe('Tool parameter validation failed: testTool');
      expect(error.code).toBe('TOOL_VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ toolName: 'testTool', validationErrors });
    });
  });

  describe('DomainNotAllowedError', () => {
    it('should create error with domain info', () => {
      const error = new DomainNotAllowedError(
        'testTool',
        'example.com',
        ['*.allowed.com', 'allowed.com']
      );

      expect(error.name).toBe('DomainNotAllowedError');
      expect(error.message).toBe('Tool not allowed on domain: testTool');
      expect(error.code).toBe('DOMAIN_NOT_ALLOWED');
      expect(error.statusCode).toBe(403);
      expect(error.details).toEqual({
        toolName: 'testTool',
        currentDomain: 'example.com',
        allowedPatterns: ['*.allowed.com', 'allowed.com'],
      });
    });
  });

  describe('MissingContextError', () => {
    it('should create error with missing context', () => {
      const missingContext = ['fileSystem', 'browser'];
      const error = new MissingContextError('testTool', missingContext);

      expect(error.name).toBe('MissingContextError');
      expect(error.message).toBe('Tool requires context: testTool');
      expect(error.code).toBe('MISSING_CONTEXT');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ toolName: 'testTool', missingContext });
    });
  });

  describe('PolicyResolutionError', () => {
    it('should create error with message', () => {
      const error = new PolicyResolutionError('invalid configuration');

      expect(error.name).toBe('PolicyResolutionError');
      expect(error.message).toBe('Policy resolution error: invalid configuration');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('SchedulerError', () => {
    it('should create error with message', () => {
      const error = new SchedulerError('queue is full');

      expect(error.name).toBe('SchedulerError');
      expect(error.message).toBe('Scheduler error: queue is full');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Re-exported errors from agent-core', () => {
    it('should export ToolExecutionError', () => {
      const error = new ToolExecutionError('testTool', new Error('test'));
      expect(error.name).toBe('ToolExecutionError');
    });

    it('should export ToolPermissionError', () => {
      const error = new ToolPermissionError('testTool', 'not allowed');
      expect(error.name).toBe('ToolPermissionError');
    });

    it('should export ToolNotFoundError', () => {
      const error = new ToolNotFoundError('missingTool');
      expect(error.name).toBe('ToolNotFoundError');
    });

    it('should export AgentError', () => {
      const error = new AgentError('agent error');
      expect(error.name).toBe('AgentError');
    });

    it('should export LLMError', () => {
      const error = new LLMError('LLM error');
      expect(error.name).toBe('LLMError');
    });

    it('should export LLMRateLimitError', () => {
      const error = new LLMRateLimitError('rate limited');
      expect(error.name).toBe('LLMRateLimitError');
    });

    it('should export LLMTimeoutError', () => {
      const error = new LLMTimeoutError('timeout');
      expect(error.name).toBe('LLMTimeoutError');
    });

    it('should export CacheError', () => {
      const error = new CacheError('cache error');
      expect(error.name).toBe('CacheError');
    });

    it('should export AgentExecutionError', () => {
      const error = new AgentExecutionError('execution error');
      expect(error.name).toBe('AgentExecutionError');
    });

    it('should export SocketError', () => {
      const error = new SocketError('socket error');
      expect(error.name).toBe('SocketError');
    });

    it('should export SocketConnectionError', () => {
      const error = new SocketConnectionError('connection error');
      expect(error.name).toBe('SocketConnectionError');
    });
  });
});
