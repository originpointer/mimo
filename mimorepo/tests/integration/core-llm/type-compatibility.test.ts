/**
 * Type Compatibility Tests
 *
 * Verifies that types from @mimo/agent-core can be correctly
 * imported and used in @mimo/llm context.
 */

import { describe, it, expect } from 'vitest';
import {
  ToolDefinition,
  ToolExecutionContext,
  ToolPolicy,
  ToolCall,
  BaseMessage,
  MessageRole,
  TokenUsage,
  ChatCompletionOptions,
} from '@mimo/agent-core';
import { z } from 'zod';

describe('Type Compatibility - agent-core types in agent-llm context', () => {
  describe('ToolDefinition type', () => {
    it('should accept tool definition with zod schema', () => {
      const tool: ToolDefinition = {
        name: 'test_tool',
        description: 'Test tool',
        parameters: z.object({
          input: z.string(),
        }),
        execute: async () => ({ result: 'ok' }),
      };

      expect(tool.name).toBe('test_tool');
      expect(tool.parameters).toBeDefined();
    });
  });

  describe('ToolExecutionContext type', () => {
    it('should accept minimal context', () => {
      const context: ToolExecutionContext = {
        logger: {
          info: () => {},
          error: () => {},
          warn: () => {},
          debug: () => {},
          context: () => ({}),
          level: 'info',
          hasExplicitLevel: false,
          setLevel: () => {},
        } as any,
      };

      expect(context.logger).toBeDefined();
    });

    it('should accept full context with all optional fields', () => {
      const context: ToolExecutionContext = {
        logger: {
          info: () => {},
          error: () => {},
          warn: () => {},
          debug: () => {},
          context: () => ({}),
          level: 'info',
          hasExplicitLevel: false,
          setLevel: () => {},
        } as any,
        fileSystem: {
          read: async () => 'content',
          write: async () => {},
          edit: async () => {},
          delete: async () => {},
          list: async () => [],
          exists: async () => true,
        },
        browser: {
          clientId: 'test-client',
          browserName: 'chrome',
          ua: 'test',
          allowOtherClient: false,
          connected: true,
          currentUrl: 'https://example.com',
        },
        memory: {
          save: async () => {},
          search: async () => [],
          get: async () => null,
          delete: async () => {},
          clear: async () => {},
        },
        config: {
          testMode: true,
        },
      };

      expect(context.logger).toBeDefined();
      expect(context.fileSystem).toBeDefined();
      expect(context.browser).toBeDefined();
      expect(context.memory).toBeDefined();
      expect(context.config).toBeDefined();
    });
  });

  describe('ToolPolicy type', () => {
    it('should accept static policy', () => {
      const policy: ToolPolicy = {
        allow: ['tool1', 'tool2'],
        deny: ['dangerous_*'],
      };

      expect(policy.allow).toContain('tool1');
      expect(policy.deny).toContain('dangerous_*');
    });

    it('should accept empty policy', () => {
      const policy: ToolPolicy = {};

      expect(policy).toBeDefined();
    });
  });

  describe('ToolCall type', () => {
    it('should accept successful tool call', () => {
      const call: ToolCall = {
        id: 'call_123_abc',
        name: 'test_tool',
        parameters: { input: 'test' },
        success: true,
        result: { output: 'result' },
      };

      expect(call.success).toBe(true);
      expect(call.result).toBeDefined();
    });

    it('should accept failed tool call', () => {
      const call: ToolCall = {
        id: 'call_123_abc',
        name: 'test_tool',
        parameters: { input: 'test' },
        success: false,
        error: 'Execution failed',
      };

      expect(call.success).toBe(false);
      expect(call.error).toBeDefined();
    });
  });

  describe('BaseMessage type', () => {
    it('should accept user message', () => {
      const message: BaseMessage = {
        role: MessageRole.USER,
        content: 'Hello',
      };

      expect(message.role).toBe(MessageRole.USER);
    });

    it('should accept assistant message', () => {
      const message: BaseMessage = {
        role: MessageRole.ASSISTANT,
        content: 'Hi there!',
      };

      expect(message.role).toBe(MessageRole.ASSISTANT);
    });

    it('should accept system message', () => {
      const message: BaseMessage = {
        role: MessageRole.SYSTEM,
        content: 'You are a helpful assistant.',
      };

      expect(message.role).toBe(MessageRole.SYSTEM);
    });
  });

  describe('TokenUsage type', () => {
    it('should accept token usage', () => {
      const usage: TokenUsage = {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      };

      expect(usage.totalTokens).toBe(30);
      expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
    });
  });

  describe('ChatCompletionOptions type', () => {
    it('should accept basic request', () => {
      const request: ChatCompletionOptions = {
        model: 'test-model',
        messages: [
          { role: MessageRole.USER, content: 'Hello' },
        ],
      };

      expect(request.messages).toHaveLength(1);
    });

    it('should accept request with tools', () => {
      const testTool: ToolDefinition = {
        name: 'test_tool',
        description: 'Test tool',
        parameters: z.object({
          input: z.string(),
        }),
        execute: async () => ({ result: 'ok' }),
      };

      const request: ChatCompletionOptions = {
        model: 'test-model',
        messages: [
          { role: MessageRole.USER, content: 'Hello' },
        ],
        tools: {
          test_tool: testTool,
        },
      };

      expect(request.tools?.test_tool).toBeDefined();
    });
  });
});
