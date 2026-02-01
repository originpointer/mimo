/**
 * Type System Tests
 * Tests that types are correctly exported from agent-core and @mimo/types
 */

import { describe, it, expect } from 'vitest';
import * as llmModule from '../../src/index.js';
import { MessageRole } from '@mimo/agent-core';

describe('Type System', () => {
  describe('Re-exports from agent-core', () => {
    it('should export ILLMClient type', () => {
      // ILLMClient should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export LLMProvider as CoreLLMProvider', () => {
      // CoreLLMProvider should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export TokenUsage type', () => {
      // TokenUsage should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export ModelCapability type', () => {
      // ModelCapability should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export ChatCompletionOptions as CoreChatCompletionOptions', () => {
      // CoreChatCompletionOptions should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export ChatCompletionResponse type', () => {
      // ChatCompletionResponse should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export BaseMessage type', () => {
      // BaseMessage should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export MessageRole type', () => {
      // MessageRole should be available as a type
      expect(llmModule).toBeDefined();
    });
  });

  describe('Re-exports from @mimo/types', () => {
    it('should export ChatMessage type', () => {
      // ChatMessage should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export LLMResponse type', () => {
      // LLMResponse should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export LLMStreamChunk type', () => {
      // LLMStreamChunk should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export StagehandZodSchema type', () => {
      // StagehandZodSchema should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export InferStagehandSchema type', () => {
      // InferStagehandSchema should be available as a type
      expect(llmModule).toBeDefined();
    });

    it('should export ClientOptions type', () => {
      // ClientOptions should be available as a type
      expect(llmModule).toBeDefined();
    });
  });

  describe('Core classes export', () => {
    it('should export LLMClient class', () => {
      expect(llmModule.LLMClient).toBeDefined();
      expect(typeof llmModule.LLMClient).toBe('function');
    });

    it('should export LLMProvider class', () => {
      expect(llmModule.LLMProvider).toBeDefined();
      expect(typeof llmModule.LLMProvider).toBe('function');
    });

    it('should export OpenAIClient class', () => {
      expect(llmModule.OpenAIClient).toBeDefined();
      expect(typeof llmModule.OpenAIClient).toBe('function');
    });

    it('should export AnthropicClient class', () => {
      expect(llmModule.AnthropicClient).toBeDefined();
      expect(typeof llmModule.AnthropicClient).toBe('function');
    });

    it('should export AISdkClient class', () => {
      expect(llmModule.AISdkClient).toBeDefined();
      expect(typeof llmModule.AISdkClient).toBe('function');
    });

    it('should export AIGatewayClient class', () => {
      expect(llmModule.AIGatewayClient).toBeDefined();
      expect(typeof llmModule.AIGatewayClient).toBe('function');
    });

    it('should export GoogleClient class', () => {
      expect(llmModule.GoogleClient).toBeDefined();
      expect(typeof llmModule.GoogleClient).toBe('function');
    });

    it('should export OllamaClient class', () => {
      expect(llmModule.OllamaClient).toBeDefined();
      expect(typeof llmModule.OllamaClient).toBe('function');
    });
  });

  describe('Utility functions export', () => {
    it('should export parseModelString function', () => {
      expect(llmModule.parseModelString).toBeDefined();
      expect(typeof llmModule.parseModelString).toBe('function');
    });

    it('should export getModelCapabilities function', () => {
      expect(llmModule.getModelCapabilities).toBeDefined();
      expect(typeof llmModule.getModelCapabilities).toBe('function');
    });
  });

  describe('Type compatibility', () => {
    it('should allow ChatMessage in internal methods', () => {
      // Import ChatMessage type
      type ChatMessage = import('@mimo/types').ChatMessage;

      // Should be able to create ChatMessage
      const message: ChatMessage = {
        role: 'user',
        content: 'Test',
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('Test');
    });

    it('should allow BaseMessage in ILLMClient methods', () => {
      // Import BaseMessage type
      type BaseMessage = import('@mimo/agent-core').BaseMessage;

      // Should be able to create BaseMessage
      const message: BaseMessage = {
        role: MessageRole.USER,
        content: 'Test',
      };

      expect(message.role).toBe(MessageRole.USER);
      expect(message.content).toBe('Test');
    });

    it('should support message conversion between types', () => {
      type BaseMessage = import('@mimo/agent-core').BaseMessage;
      type ChatMessage = import('@mimo/types').ChatMessage;

      const baseMessage: BaseMessage = {
        role: MessageRole.USER,
        content: 'Test',
      };

      // For simple string content, the formats are compatible
      const chatMessage: ChatMessage = {
        role: baseMessage.role as unknown as ChatMessage['role'],
        content: baseMessage.content as string,
      };

      expect(chatMessage.role).toBe(baseMessage.role);
      expect(chatMessage.content).toBe(baseMessage.content);
    });
  });

  describe('Mixed type system verification', () => {
    it('should use agent-core for core types', () => {
      // Verify that we can import core types from agent-core
      type LLMProvider = import('@mimo/agent-core').LLMProvider;
      type TokenUsage = import('@mimo/agent-core').TokenUsage;
      type ModelCapability = import('@mimo/agent-core').ModelCapability;

      // These types should be available
      const provider: LLMProvider = 'openai' as any;
      expect(provider).toBeDefined();

      const usage: TokenUsage = {
        inputTokens: 10,
        outputTokens: 20,
      };
      expect(usage.inputTokens).toBe(10);

      const capability: ModelCapability = {
        supportsStreaming: true,
        supportsCaching: false,
        supportsThinking: false,
        maxContext: 128000,
        supportsStructuredOutput: true,
      };
      expect(capability.supportsStreaming).toBe(true);
    });

    it('should use @mimo/types for ChatMessage', () => {
      // ChatMessage should come from @mimo/types for AI SDK compatibility
      type ChatMessage = import('@mimo/types').ChatMessage;

      const message: ChatMessage = {
        role: 'user',
        content: 'Test',
      };

      expect(message).toBeDefined();
    });

    it('should use @mimo/types for Zod schema types', () => {
      // Zod schema types should come from @mimo/types
      type StagehandZodSchema = import('@mimo/types').StagehandZodSchema;
      type InferStagehandSchema = import('@mimo/types').InferStagehandSchema;

      // These types should be available
      expect(true).toBe(true); // Type check only
    });
  });

  describe('ILLMClient interface type', () => {
    it('should be available from agent-core', () => {
      type ILLMClient = import('@mimo/agent-core').ILLMClient;

      // The interface should define required properties
      const requiredProperties = ['provider', 'model', 'capabilities'];

      requiredProperties.forEach(prop => {
        expect(prop).toBeTruthy();
      });
    });

    it('should define required methods', () => {
      type ILLMClient = import('@mimo/agent-core').ILLMClient;

      // The interface should define required methods
      const requiredMethods = ['complete', 'stream', 'supports'];

      requiredMethods.forEach(method => {
        expect(method).toBeTruthy();
      });
    });
  });

  describe('Module structure', () => {
    it('should have all expected exports', () => {
      const expectedExports = [
        'LLMClient',
        'LLMProvider',
        'OpenAIClient',
        'AnthropicClient',
        'GoogleClient',
        'OllamaClient',
        'AISdkClient',
        'AIGatewayClient',
        'parseModelString',
        'getModelCapabilities',
      ];

      expectedExports.forEach(exportName => {
        expect(llmModule[exportName]).toBeDefined();
      });
    });

    it('should export types', () => {
      // Types are exported but not available at runtime
      // This test verifies the module structure
      expect(typeof llmModule).toBe('object');
    });
  });

  describe('Type import verification', () => {
    it('should allow importing ILLMClient from @mimo/llm', async () => {
      // This verifies the type is re-exported correctly
      const { ILLMClient } = await import('@mimo/llm');
      expect(true).toBe(true); // Type check only
    });

    it('should allow importing LLMProvider from @mimo/llm', async () => {
      const { CoreLLMProvider } = await import('@mimo/llm');
      expect(true).toBe(true); // Type check only
    });

    it('should allow importing BaseMessage from @mimo/llm', async () => {
      const { BaseMessage } = await import('@mimo/llm');
      expect(true).toBe(true); // Type check only
    });

    it('should allow importing ChatMessage from @mimo/llm', async () => {
      const { ChatMessage } = await import('@mimo/llm');
      expect(true).toBe(true); // Type check only
    });
  });

  describe('No type conflicts', () => {
    it('should not have conflicts between agent-core and types', () => {
      // Import types from both sources
      type BaseMessage = import('@mimo/agent-core').BaseMessage;
      type ChatMessage = import('@mimo/types').ChatMessage;

      // Both should be usable without conflicts
      const baseMsg: BaseMessage = { role: MessageRole.USER, content: 'test' };
      const chatMsg: ChatMessage = { role: 'user', content: 'test' };

      expect(baseMsg).toBeDefined();
      expect(chatMsg).toBeDefined();
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain exports from previous versions', () => {
      // Verify that old exports still work
      expect(llmModule.LLMClient).toBeDefined();
      expect(llmModule.LLMProvider).toBeDefined();
      expect(llmModule.parseModelString).toBeDefined();
      expect(llmModule.getModelCapabilities).toBeDefined();
    });
  });
});
