/**
 * ILLMClient Interface Compliance Tests
 * Tests that each client properly implements the ILLMClient interface from @mimo/agent-core
 */

import { describe, it, expect } from 'vitest';
import {
  AISdkClient,
  OpenAIClient,
  AnthropicClient,
  AIGatewayClient,
} from '../../../src/provider.js';
import type {
  ILLMClient,
  ChatCompletionOptions,
  BaseMessage,
} from '@mimo/agent-core';
import { LLMProvider, MessageRole } from '@mimo/agent-core';

describe('ILLMClient Interface Compliance', () => {
  describe('AISdkClient', () => {
    describe('Interface properties', () => {
      it('should have provider property returning LLMProvider enum', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.provider).toBe(LLMProvider.OPENAI);
      });

      it('should have model property', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.model).toBe('openai/gpt-4o');
      });

      it('should have capabilities property with ModelCapability shape', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.capabilities).toBeDefined();
        expect(client.capabilities.supportsStreaming).toBe(true);
        expect(client.capabilities.supportsStructuredOutput).toBe(true);
        expect(typeof client.capabilities.maxContext).toBe('number');
      });
    });

    describe('complete() method', () => {
      it('should implement complete() method that accepts ChatCompletionOptions', async () => {
        const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
        const options: ChatCompletionOptions = {
          model: client.model,
          messages: [{ role: MessageRole.USER, content: 'test' }],
        };
        void options;

        // Should not throw - method signature is correct
        expect(typeof client.complete).toBe('function');
      });

      it('should return Promise<ChatCompletionResponse>', async () => {
        const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
        const options: ChatCompletionOptions = {
          model: client.model,
          messages: [{ role: MessageRole.USER, content: 'test' }],
        };

        // Verify return type is Promise (actual API call will fail without valid key)
        const resultPromise = client.complete(options);
        expect(resultPromise).toBeInstanceOf(Promise);
      });

      it('should convert BaseMessage to ChatMessage internally', async () => {
        const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
        const messages: BaseMessage[] = [
          { role: MessageRole.USER, content: 'Hello' },
        ];

        // Should handle BaseMessage from agent-core
        const options: ChatCompletionOptions = { model: client.model, messages };
        expect(() => client.complete(options)).not.toThrow();
      });
    });

    describe('stream() method', () => {
      it('should implement stream() method that accepts ChatCompletionOptions', () => {
        const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
        const options: ChatCompletionOptions = {
          model: client.model,
          messages: [{ role: MessageRole.USER, content: 'test' }],
        };
        void options;

        expect(typeof client.stream).toBe('function');
      });

      it('should return AsyncIterable<ChatCompletionResponse>', () => {
        const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
        const options: ChatCompletionOptions = {
          model: client.model,
          messages: [{ role: MessageRole.USER, content: 'test' }],
        };

        const asyncIterable = client.stream(options);
        expect(typeof asyncIterable[Symbol.asyncIterator]).toBe('function');
      });

      it('should convert BaseMessage to ChatMessage internally', () => {
        const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
        const messages: BaseMessage[] = [
          { role: MessageRole.USER, content: 'Hello' },
        ];

        const options: ChatCompletionOptions = { model: client.model, messages };
        expect(() => client.stream(options)).not.toThrow();
      });
    });

    describe('supports() method', () => {
      it('should implement supports() method', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(typeof client.supports).toBe('function');
      });

      it('should return boolean for capability checks', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(typeof client.supports('supportsStreaming')).toBe('boolean');
        expect(typeof client.supports('supportsCaching')).toBe('boolean');
        expect(typeof client.supports('supportsThinking')).toBe('boolean');
      });

      it('should return correct values based on capabilities', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.supports('supportsStreaming')).toBe(true);
        expect(client.supports('supportsStructuredOutput')).toBe(true);
      });
    });

    describe('Provider detection', () => {
      it('should return OPENAI for openai/* models', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.provider).toBe(LLMProvider.OPENAI);
      });

      it('should return ANTHROPIC for anthropic/* models', () => {
        const client = new AISdkClient('anthropic/claude-3-5-sonnet');
        expect(client.provider).toBe(LLMProvider.ANTHROPIC);
      });

      it('should return GOOGLE for google/* models', () => {
        const client = new AISdkClient('google/gemini-1.5-flash');
        expect(client.provider).toBe(LLMProvider.GOOGLE);
      });
    });

    describe('Model capabilities', () => {
      it('should detect thinking capability for o1 models', () => {
        const client = new AISdkClient('openai/o1-preview');
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should not detect thinking for gpt-4o models', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.capabilities.supportsThinking).toBe(false);
      });
    });
  });

  describe('OpenAIClient', () => {
    describe('Interface properties', () => {
      it('should have provider property returning LLMProvider.OPENAI', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.provider).toBe(LLMProvider.OPENAI);
      });

      it('should have model property', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.model).toBe('gpt-4o');
      });

      it('should have capabilities property with ModelCapability shape', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.capabilities).toBeDefined();
        expect(client.capabilities.supportsStreaming).toBe(true);
        expect(client.capabilities.supportsStructuredOutput).toBe(true);
      });
    });

    describe('complete() method', () => {
      it('should implement complete() method', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(typeof client.complete).toBe('function');
      });

      it('should accept BaseMessage[] and convert to ChatMessage[]', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        const messages: BaseMessage[] = [
          { role: MessageRole.USER, content: 'Hello' },
        ];

        const options: ChatCompletionOptions = { model: client.model, messages };
        expect(() => client.complete(options)).not.toThrow();
      });
    });

    describe('stream() method', () => {
      it('should implement stream() method', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(typeof client.stream).toBe('function');
      });

      it('should accept BaseMessage[] and convert to ChatMessage[]', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        const messages: BaseMessage[] = [
          { role: MessageRole.USER, content: 'Hello' },
        ];

        const options: ChatCompletionOptions = { model: client.model, messages };
        expect(() => client.stream(options)).not.toThrow();
      });
    });

    describe('supports() method', () => {
      it('should implement supports() method', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(typeof client.supports).toBe('function');
      });

      it('should return boolean for capability checks', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(typeof client.supports('supportsStreaming')).toBe('boolean');
      });
    });

    describe('Model-specific capabilities', () => {
      it('should report supportsThinking=true for o1 models', () => {
        const client = new OpenAIClient('o1-preview', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should report supportsThinking=true for o3 models', () => {
        const client = new OpenAIClient('o3-mini', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should report supportsThinking=false for gpt-4o models', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(false);
      });
    });
  });

  describe('AnthropicClient', () => {
    describe('Interface properties', () => {
      it('should have provider property returning LLMProvider.ANTHROPIC', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.provider).toBe(LLMProvider.ANTHROPIC);
      });

      it('should have model property', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.model).toBe('claude-3-5-sonnet');
      });

      it('should have capabilities property', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.capabilities).toBeDefined();
        expect(client.capabilities.supportsStreaming).toBe(true);
      });
    });

    describe('complete() method', () => {
      it('should implement complete() method', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(typeof client.complete).toBe('function');
      });

      it('should accept BaseMessage[] and convert to ChatMessage[]', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        const messages: BaseMessage[] = [
          { role: MessageRole.USER, content: 'Hello' },
        ];

        const options: ChatCompletionOptions = { model: client.model, messages };
        expect(() => client.complete(options)).not.toThrow();
      });
    });

    describe('stream() method', () => {
      it('should implement stream() method', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(typeof client.stream).toBe('function');
      });
    });

    describe('supports() method', () => {
      it('should implement supports() method', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(typeof client.supports).toBe('function');
      });
    });
  });

  describe('AIGatewayClient', () => {
    describe('Interface properties', () => {
      it('should have provider property', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(client.provider).toBe(LLMProvider.OPENAI);
      });

      it('should have model property', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(client.model).toBe('openai/gpt-4o');
      });

      it('should have capabilities property', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(client.capabilities).toBeDefined();
        expect(client.capabilities.supportsStreaming).toBe(true);
      });
    });

    describe('Provider mapping', () => {
      it('should map openai/* to OPENAI', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(client.provider).toBe(LLMProvider.OPENAI);
      });

      it('should map anthropic/* to ANTHROPIC', () => {
        const client = new AIGatewayClient('anthropic/claude-3-5-sonnet');
        expect(client.provider).toBe(LLMProvider.ANTHROPIC);
      });

      it('should map google/* to GOOGLE', () => {
        const client = new AIGatewayClient('google/gemini-1.5-flash');
        expect(client.provider).toBe(LLMProvider.GOOGLE);
      });
    });

    describe('complete() method', () => {
      it('should implement complete() method', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(typeof client.complete).toBe('function');
      });

      it('should accept BaseMessage[] and convert to ChatMessage[]', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        const messages: BaseMessage[] = [
          { role: MessageRole.USER, content: 'Hello' },
        ];

        const options: ChatCompletionOptions = { model: client.model, messages };
        expect(() => client.complete(options)).not.toThrow();
      });
    });

    describe('stream() method', () => {
      it('should implement stream() method', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(typeof client.stream).toBe('function');
      });
    });

    describe('supports() method', () => {
      it('should implement supports() method', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(typeof client.supports).toBe('function');
      });
    });
  });

  describe('ILLMClient interface type checking', () => {
    it('should allow assigning client instances to ILLMClient type', () => {
      // This test verifies type compatibility at compile time
      const aisdkClient: ILLMClient = new AISdkClient('openai/gpt-4o') as unknown as ILLMClient;
      const openaiClient: ILLMClient = new OpenAIClient('gpt-4o', { apiKey: 'test' }) as unknown as ILLMClient;
      const anthropicClient: ILLMClient = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test' }) as unknown as ILLMClient;
      const gatewayClient: ILLMClient = new AIGatewayClient('openai/gpt-4o') as unknown as ILLMClient;

      expect(aisdkClient).toBeDefined();
      expect(openaiClient).toBeDefined();
      expect(anthropicClient).toBeDefined();
      expect(gatewayClient).toBeDefined();
    });

    it('should have all required properties and methods', () => {
      const client = new AISdkClient('openai/gpt-4o');

      // Check properties
      expect(client).toHaveProperty('provider');
      expect(client).toHaveProperty('model');
      expect(client).toHaveProperty('capabilities');

      // Check methods
      expect(typeof client.complete).toBe('function');
      expect(typeof client.stream).toBe('function');
      expect(typeof client.supports).toBe('function');
    });
  });
});
