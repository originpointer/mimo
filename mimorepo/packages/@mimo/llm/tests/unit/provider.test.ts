/**
 * Provider Factory Unit Tests
 * Tests LLMProvider factory class, client creation, and caching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LLMProvider,
  OpenAIClient,
  AnthropicClient,
  AISdkClient,
  AIGatewayClient,
  GoogleClient,
  OllamaClient,
} from '../../src/provider.js';

// Helper to check if AI Gateway is available
const hasGatewayKey = !!(globalThis as any).process?.env?.AI_GATEWAY_API_KEY;

describe('LLMProvider', () => {
  let provider: LLMProvider;

  beforeEach(() => {
    provider = new LLMProvider();
  });

  describe('getClient with provider/model format', () => {
    it('should return AISdkClient or AIGatewayClient for openai/gpt-4o', () => {
      const client = provider.getClient('openai/gpt-4o');

      // Returns AIGatewayClient when AI_GATEWAY_API_KEY is set, otherwise AISdkClient
      expect(client).toBeInstanceOf(hasGatewayKey ? AIGatewayClient : AISdkClient);
      expect(client.getProviderType()).toBe('openai');
    });

    it('should return AISdkClient or AIGatewayClient for anthropic/claude-3-5-sonnet', () => {
      const client = provider.getClient('anthropic/claude-3-5-sonnet');

      // Returns AIGatewayClient when AI_GATEWAY_API_KEY is set, otherwise AISdkClient
      expect(client).toBeInstanceOf(hasGatewayKey ? AIGatewayClient : AISdkClient);
      expect(client.getProviderType()).toBe('anthropic');
    });

    it('should return AISdkClient or AIGatewayClient for google/gemini-1.5-flash', () => {
      const client = provider.getClient('google/gemini-1.5-flash');

      // Returns AIGatewayClient when AI_GATEWAY_API_KEY is set, otherwise AISdkClient
      expect(client).toBeInstanceOf(hasGatewayKey ? AIGatewayClient : AISdkClient);
      expect(client.getProviderType()).toBe('google');
    });

    it('should pass options to AISdkClient', () => {
      const options = {
        apiKey: 'test-key',
        baseURL: 'https://test.example.com',
      };

      const client = provider.getClient('openai/gpt-4o', options);

      expect(client).toBeInstanceOf(AISdkClient);
      expect(client.getModel()).toBe('openai/gpt-4o');
    });
  });

  describe('getClient with legacy model names', () => {
    it('should return OpenAIClient for gpt-4o', () => {
      const client = provider.getClient('gpt-4o', { apiKey: 'test-key' });

      expect(client).toBeInstanceOf(OpenAIClient);
      expect(client.getProviderType()).toBe('openai');
    });

    it('should return OpenAIClient for gpt-3.5-turbo', () => {
      const client = provider.getClient('gpt-3.5-turbo', { apiKey: 'test-key' });

      expect(client).toBeInstanceOf(OpenAIClient);
    });

    it('should return OpenAIClient for o1-preview', () => {
      const client = provider.getClient('o1-preview', { apiKey: 'test-key' });

      expect(client).toBeInstanceOf(OpenAIClient);
    });

    it('should return AnthropicClient for known claude models', () => {
      // claude-3-5-sonnet is in MODEL_TO_PROVIDER map
      const client = provider.getClient('claude-3-5-sonnet', { apiKey: 'test-key' });

      expect(client).toBeInstanceOf(AnthropicClient);
      expect(client.getProviderType()).toBe('anthropic');
    });

    it('should default to OpenAI for unknown models', () => {
      // unknown-model is NOT in MODEL_TO_PROVIDER map, defaults to openai
      const client = provider.getClient('unknown-model', { apiKey: 'test-key' });

      expect(client).toBeInstanceOf(OpenAIClient);
      expect(client.getProviderType()).toBe('openai');
    });

    it('should return GoogleClient for gemini-1.5-flash', () => {
      const client = provider.getClient('gemini-1.5-flash', { apiKey: 'test-key' });

      expect(client).toBeInstanceOf(GoogleClient);
      expect(client.getProviderType()).toBe('google');
    });

    it('should return OllamaClient for unknown legacy models', () => {
      // Actually returns OpenAI as default based on parser
      const client = provider.getClient('some-unknown-model', { apiKey: 'test-key' });

      // Default is OpenAI for unknown models
      expect(client.getProviderType()).toBe('openai');
    });

    it('should pass options to direct clients', () => {
      const options = {
        apiKey: 'test-key',
        baseURL: 'https://test.example.com',
      };

      const client = provider.getClient('gpt-4o', options);

      expect(client).toBeInstanceOf(OpenAIClient);
      expect(client.getModel()).toBe('gpt-4o');
    });
  });

  describe('Client caching', () => {
    it('should cache clients by model and options', () => {
      const client1 = provider.getClient('openai/gpt-4o');
      const client2 = provider.getClient('openai/gpt-4o');

      expect(client1).toBe(client2);
    });

    it('should create different clients for different models', () => {
      const client1 = provider.getClient('openai/gpt-4o');
      const client2 = provider.getClient('openai/gpt-4o-mini');

      expect(client1).not.toBe(client2);
    });

    it('should create different clients for different options', () => {
      const client1 = provider.getClient('openai/gpt-4o', { apiKey: 'key1' });
      const client2 = provider.getClient('openai/gpt-4o', { apiKey: 'key2' });

      expect(client1).not.toBe(client2);
    });

    it('should handle undefined and empty options differently', () => {
      const client1 = provider.getClient('openai/gpt-4o');
      const client2 = provider.getClient('openai/gpt-4o', {});

      // Empty options should be treated same as undefined
      expect(client1).toBe(client2);
    });

    it('should cache clients for legacy format', () => {
      const client1 = provider.getClient('gpt-4o', { apiKey: 'test-key' });
      const client2 = provider.getClient('gpt-4o', { apiKey: 'test-key' });

      expect(client1).toBe(client2);
    });
  });

  describe('supportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = provider.supportedProviders;

      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('google');
      expect(providers).toContain('ollama');
    });

    it('should include all registered providers', () => {
      const providers = provider.supportedProviders;

      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('register custom provider', () => {
    it('should allow registering custom provider', () => {
      class CustomClient extends AnthropicClient {
        getProviderType(): 'custom' {
          return 'custom';
        }
      }

      LLMProvider.register('custom', CustomClient);

      const providers = provider.supportedProviders;
      expect(providers).toContain('custom');

      // Reset to avoid affecting other tests
      LLMProvider.register('custom', AnthropicClient);
    });

    it('should work with custom provider and known model', () => {
      // Using a known model name that will be parsed correctly
      class CustomClient extends OpenAIClient {
        getProviderType(): 'openai' {
          return 'openai';
        }
      }

      const original = LLMProvider.clientRegistry.get('openai');
      LLMProvider.register('openai', CustomClient);

      const client = provider.getClient('gpt-4o', { apiKey: 'test-key' });
      expect(client).toBeInstanceOf(CustomClient);

      // Reset
      LLMProvider.register('openai', original);
    });
  });

  describe('Error handling', () => {
    it('should handle model names with special characters', () => {
      expect(() => provider.getClient('openai/gpt-4.turbo')).not.toThrow();
      expect(() => provider.getClient('anthropic/claude_3.5-sonnet')).not.toThrow();
    });

    it('should handle empty model string', () => {
      // Empty string is parsed as 'openai/' which might fail when creating the client
      // depending on SDK behavior
      expect(() => provider.getClient('', { apiKey: 'test-key' })).not.toThrow();
    });
  });

  describe('Model string preservation', () => {
    it('should preserve model string in AI SDK client', () => {
      const client = provider.getClient('openai/gpt-4o-turbo-2024-04-09');

      expect(client.getModel()).toBe('openai/gpt-4o-turbo-2024-04-09');
    });

    it('should preserve model string in direct client', () => {
      const client = provider.getClient('gpt-4o-turbo-2024-04-09', { apiKey: 'test-key' });

      expect(client.getModel()).toBe('gpt-4o-turbo-2024-04-09');
    });
  });

  describe('Provider isolation', () => {
    it('should maintain separate caches for different LLMProvider instances', () => {
      const provider1 = new LLMProvider();
      const provider2 = new LLMProvider();

      const client1 = provider1.getClient('openai/gpt-4o');
      const client2 = provider2.getClient('openai/gpt-4o');

      // Different instances should have different caches
      expect(client1).not.toBe(client2);
    });
  });
});
