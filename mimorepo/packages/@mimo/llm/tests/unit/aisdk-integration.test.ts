/**
 * AI SDK Integration Tests
 * Tests AISdkClient integration with Vercel AI SDK
 */

import { describe, it, expect } from 'vitest';
import { AISdkClient } from '../../src/provider.js';
import { LLMProvider, MessageRole } from '@mimo/agent-core';

describe('AISdkClient Integration', () => {
  describe('Initialization', () => {
    it('should initialize with provider/model format', () => {
      const client = new AISdkClient('openai/gpt-4o');
      expect(client.model).toBe('openai/gpt-4o');
    });

    it('should accept options parameter', () => {
      const options = {
        apiKey: 'test-key',
        baseURL: 'https://test.example.com',
      };

      const client = new AISdkClient('openai/gpt-4o', options);
      expect(client.model).toBe('openai/gpt-4o');
    });

    it('should initialize for different providers', () => {
      const openaiClient = new AISdkClient('openai/gpt-4o');
      const anthropicClient = new AISdkClient('anthropic/claude-3-5-sonnet');
      const googleClient = new AISdkClient('google/gemini-1.5-flash');

      expect(openaiClient.getProviderType()).toBe('openai');
      expect(anthropicClient.getProviderType()).toBe('anthropic');
      expect(googleClient.getProviderType()).toBe('google');
    });
  });

  describe('Chat completion methods', () => {
    it('should have chatCompletion method', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      expect(typeof client.chatCompletion).toBe('function');
    });

    it('should have streamChatCompletion method', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      expect(typeof client.streamChatCompletion).toBe('function');
    });

    it('should have generateStructure method', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      expect(typeof client.generateStructure).toBe('function');
    });
  });

  describe('ILLMClient interface methods', () => {
    it('should have complete() method', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      expect(typeof client.complete).toBe('function');
    });

    it('should have stream() method', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      expect(typeof client.stream).toBe('function');
    });

    it('should have supports() method', () => {
      const client = new AISdkClient('openai/gpt-4o');
      expect(typeof client.supports).toBe('function');
    });
  });

  describe('Message formatting', () => {
    it('should accept ChatMessage format for internal methods', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      expect(() => {
        client.chatCompletion(messages);
      }).not.toThrow();
    });

    it('should handle array content with images', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image', image: 'https://example.com/image.jpg' },
          ],
        },
      ];

      expect(() => {
        client.chatCompletion(messages);
      }).not.toThrow();
    });

    it('should handle system messages', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ];

      expect(() => {
        client.chatCompletion(messages);
      }).not.toThrow();
    });
  });

  describe('Options handling', () => {
    it('should accept temperature option', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      expect(() => {
        client.chatCompletion([{ role: 'user', content: 'test' }], {
          temperature: 0.7,
        });
      }).not.toThrow();
    });

    it('should accept maxTokens option', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      expect(() => {
        client.chatCompletion([{ role: 'user', content: 'test' }], {
          maxTokens: 1000,
        });
      }).not.toThrow();
    });

    it('should accept multiple options', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      expect(() => {
        client.chatCompletion([{ role: 'user', content: 'test' }], {
          temperature: 0.5,
          maxTokens: 2000,
        });
      }).not.toThrow();
    });
  });

  describe('BaseMessage conversion in ILLMClient methods', () => {
    it('should accept BaseMessage in complete()', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      const baseMessages = [
        { role: MessageRole.USER, content: 'Hello' },
      ];

      expect(() => {
        client.complete({ model: client.model, messages: baseMessages });
      }).not.toThrow();
    });

    it('should accept BaseMessage in stream()', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      const baseMessages = [
        { role: MessageRole.USER, content: 'Hello' },
      ];

      expect(() => {
        const stream = client.stream({ model: client.model, messages: baseMessages });
        expect(typeof stream[Symbol.asyncIterator]).toBe('function');
      }).not.toThrow();
    });
  });

  describe('Streaming', () => {
    it('should return async generator for streamChatCompletion', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      const stream = client.streamChatCompletion([{ role: 'user', content: 'test' }]);

      expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    });

    it('should return async iterable for stream()', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      const stream = client.stream({
        model: client.model,
        messages: [{ role: MessageRole.USER, content: 'test' }],
      });

      expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    });
  });

  describe('Provider-specific behavior', () => {
    it('should handle OpenAI provider correctly', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      expect(client.getProviderType()).toBe('openai');
      expect(client.provider).toBe(LLMProvider.OPENAI);
    });

    it('should handle Anthropic provider correctly', () => {
      const client = new AISdkClient('anthropic/claude-3-5-sonnet', { apiKey: 'test-key' });

      expect(client.getProviderType()).toBe('anthropic');
      expect(client.provider).toBe(LLMProvider.ANTHROPIC);
    });

    it('should handle Google provider correctly', () => {
      const client = new AISdkClient('google/gemini-1.5-flash', { apiKey: 'test-key' });

      expect(client.getProviderType()).toBe('google');
      expect(client.provider).toBe(LLMProvider.GOOGLE);
    });
  });

  describe('Model string handling', () => {
    it('should preserve full model string', () => {
      const client = new AISdkClient('openai/gpt-4o-turbo-2024-04-09');
      expect(client.model).toBe('openai/gpt-4o-turbo-2024-04-09');
    });

    it('should handle models with version numbers', () => {
      const client = new AISdkClient('anthropic/claude-3-5-sonnet-20241022');
      expect(client.model).toBe('anthropic/claude-3-5-sonnet-20241022');
    });

    it('should handle models with special characters', () => {
      const client = new AISdkClient('openai/gpt-4.turbo');
      expect(client.model).toBe('openai/gpt-4.turbo');
    });
  });

  describe('Capabilities reporting', () => {
    it('should report correct capabilities for different models', () => {
      const gpt4Client = new AISdkClient('openai/gpt-4o');
      const o1Client = new AISdkClient('openai/o1-preview');

      expect(gpt4Client.capabilities.supportsThinking).toBe(false);
      expect(o1Client.capabilities.supportsThinking).toBe(true);
    });

    it('should report supports() correctly', () => {
      const client = new AISdkClient('openai/gpt-4o');

      expect(client.supports('supportsStreaming')).toBe(true);
      expect(client.supports('supportsStructuredOutput')).toBe(true);
      expect(client.supports('supportsThinking')).toBe(false);
    });
  });

  describe('Backward compatibility', () => {
    it('should provide getModel() method', () => {
      const client = new AISdkClient('openai/gpt-4o');
      expect(client.getModel()).toBe('openai/gpt-4o');
    });

    it('should provide getProviderType() method', () => {
      const client = new AISdkClient('openai/gpt-4o');
      expect(client.getProviderType()).toBe('openai');
    });
  });

  describe('Dynamic AI SDK imports', () => {
    it('should import AI SDK modules at runtime', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      // The client should be able to call methods that use dynamic imports
      expect(() => {
        client.chatCompletion([{ role: 'user', content: 'test' }]);
      }).not.toThrow();
    });

    it('should handle different provider SDK imports', () => {
      const openaiClient = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const anthropicClient = new AISdkClient('anthropic/claude-3-5-sonnet', { apiKey: 'test-key' });
      const googleClient = new AISdkClient('google/gemini-1.5-flash', { apiKey: 'test-key' });

      // All should be initialized without errors
      expect(openaiClient).toBeDefined();
      expect(anthropicClient).toBeDefined();
      expect(googleClient).toBeDefined();
    });
  });
});
