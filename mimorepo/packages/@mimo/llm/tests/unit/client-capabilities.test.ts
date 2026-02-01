/**
 * Client Capabilities Tests
 * Tests that each client returns correct ModelCapability values
 */

import { describe, it, expect } from 'vitest';
import { LLMProvider } from '@mimo/agent-core';
import { AISdkClient, OpenAIClient, AnthropicClient, AIGatewayClient } from '../../src/provider.js';

describe('Client Capabilities', () => {
  describe('AISdkClient', () => {
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

      it('should handle unknown provider as OPENAI', () => {
        const client = new AISdkClient('unknown/model');
        expect(client.provider).toBe(LLMProvider.OPENAI);
      });
    });

    describe('Capability properties', () => {
      it('should report supportsStreaming=true by default', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.capabilities.supportsStreaming).toBe(true);
      });

      it('should report supportsStructuredOutput=true by default', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.capabilities.supportsStructuredOutput).toBe(true);
      });

      it('should report supportsCaching=false by default', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.capabilities.supportsCaching).toBe(false);
      });

      it('should report maxContext as 128000 by default', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.capabilities.maxContext).toBe(128000);
      });
    });

    describe('Thinking capability detection', () => {
      it('should detect o1 models as thinking models', () => {
        const client = new AISdkClient('openai/o1-preview');
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should detect o3 models as thinking models', () => {
        const client = new AISdkClient('openai/o3-mini');
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should not detect thinking for gpt-4 models', () => {
        const client = new AISdkClient('openai/gpt-4o');
        expect(client.capabilities.supportsThinking).toBe(false);
      });

      it('should not detect thinking for Claude models', () => {
        const client = new AISdkClient('anthropic/claude-3-5-sonnet');
        expect(client.capabilities.supportsThinking).toBe(false);
      });
    });
  });

  describe('OpenAIClient', () => {
    describe('Provider detection', () => {
      it('should return OPENAI provider', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.provider).toBe(LLMProvider.OPENAI);
      });
    });

    describe('Capability properties', () => {
      it('should report supportsStreaming=true', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.capabilities.supportsStreaming).toBe(true);
      });

      it('should report supportsStructuredOutput=true', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.capabilities.supportsStructuredOutput).toBe(true);
      });

      it('should report maxContext correctly', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.capabilities.maxContext).toBeGreaterThan(0);
      });
    });

    describe('Thinking capability for o1/o3 models', () => {
      it('should report supportsThinking=true for o1-preview', () => {
        const client = new OpenAIClient('o1-preview', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should report supportsThinking=true for o1-mini', () => {
        const client = new OpenAIClient('o1-mini', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should report supportsThinking=true for o3-mini', () => {
        const client = new OpenAIClient('o3-mini', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should report supportsThinking=false for gpt-4o', () => {
        const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(false);
      });

      it('should report supportsThinking=false for gpt-4o-mini', () => {
        const client = new OpenAIClient('gpt-4o-mini', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(false);
      });
    });
  });

  describe('AnthropicClient', () => {
    describe('Provider detection', () => {
      it('should return ANTHROPIC provider', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.provider).toBe(LLMProvider.ANTHROPIC);
      });
    });

    describe('Capability properties', () => {
      it('should report supportsStreaming=true', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.capabilities.supportsStreaming).toBe(true);
      });

      it('should report supportsStructuredOutput=true', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.capabilities.supportsStructuredOutput).toBe(true);
      });
    });

    describe('Caching capability detection', () => {
      it('should report supportsCaching based on model', () => {
        // Claude 4-5 models support caching
        const client = new AnthropicClient('claude-opus-4-5', { apiKey: 'test-key' });
        expect(client.capabilities.supportsCaching).toBe(true);
      });

      it('should report supportsCaching=false for non-caching models', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.capabilities.supportsCaching).toBe(false);
      });
    });

    describe('Max context for different models', () => {
      it('should report correct maxContext for Claude 3.5 Sonnet', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.capabilities.maxContext).toBe(200000);
      });

      it('should report correct maxContext for Claude 3 Opus', () => {
        const client = new AnthropicClient('claude-3-opus', { apiKey: 'test-key' });
        expect(client.capabilities.maxContext).toBe(200000);
      });

      it('should report correct maxContext for Claude Haiku', () => {
        const client = new AnthropicClient('claude-3-5-haiku', { apiKey: 'test-key' });
        expect(client.capabilities.maxContext).toBe(200000);
      });
    });

    describe('Thinking capability', () => {
      it('should report supportsThinking=true for Opus 4', () => {
        const client = new AnthropicClient('claude-opus-4', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should report supportsThinking=false for regular Claude models', () => {
        const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
        expect(client.capabilities.supportsThinking).toBe(false);
      });
    });
  });

  describe('AIGatewayClient', () => {
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

      it('should map unknown providers to OPENAI', () => {
        const client = new AIGatewayClient('unknown/model');
        expect(client.provider).toBe(LLMProvider.OPENAI);
      });
    });

    describe('Capability properties', () => {
      it('should report supportsStreaming=true by default', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(client.capabilities.supportsStreaming).toBe(true);
      });

      it('should report supportsStructuredOutput=true by default', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(client.capabilities.supportsStructuredOutput).toBe(true);
      });

      it('should report maxContext correctly', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(client.capabilities.maxContext).toBe(128000);
      });
    });

    describe('Thinking capability through gateway', () => {
      it('should detect o1 thinking capability through gateway', () => {
        const client = new AIGatewayClient('openai/o1-preview');
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should detect o3 thinking capability through gateway', () => {
        const client = new AIGatewayClient('openai/o3-mini');
        expect(client.capabilities.supportsThinking).toBe(true);
      });

      it('should not detect thinking for gpt-4o through gateway', () => {
        const client = new AIGatewayClient('openai/gpt-4o');
        expect(client.capabilities.supportsThinking).toBe(false);
      });
    });
  });

  describe('supports() method', () => {
    describe('AISdkClient supports()', () => {
      const client = new AISdkClient('openai/gpt-4o');

      it('should return true for supportsStreaming', () => {
        expect(client.supports('supportsStreaming')).toBe(true);
      });

      it('should return true for supportsStructuredOutput', () => {
        expect(client.supports('supportsStructuredOutput')).toBe(true);
      });

      it('should return false for supportsCaching', () => {
        expect(client.supports('supportsCaching')).toBe(false);
      });

      it('should return false for supportsThinking', () => {
        expect(client.supports('supportsThinking')).toBe(false);
      });

      it('should return a number for maxContext', () => {
        expect(typeof client.capabilities.maxContext).toBe('number');
      });
    });

    describe('OpenAIClient supports()', () => {
      const gptClient = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
      const o1Client = new OpenAIClient('o1-preview', { apiKey: 'test-key' });

      it('should return correct supportsThinking for different models', () => {
        expect(gptClient.supports('supportsThinking')).toBe(false);
        expect(o1Client.supports('supportsThinking')).toBe(true);
      });
    });

    describe('AnthropicClient supports()', () => {
      const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });

      it('should return true for supportsStreaming', () => {
        expect(client.supports('supportsStreaming')).toBe(true);
      });

      it('should return true for supportsStructuredOutput', () => {
        expect(client.supports('supportsStructuredOutput')).toBe(true);
      });
    });

    describe('AIGatewayClient supports()', () => {
      const client = new AIGatewayClient('openai/gpt-4o');

      it('should return boolean for all capability checks', () => {
        expect(typeof client.supports('supportsStreaming')).toBe('boolean');
        expect(typeof client.supports('supportsCaching')).toBe('boolean');
        expect(typeof client.supports('supportsThinking')).toBe('boolean');
        expect(typeof client.supports('supportsStructuredOutput')).toBe('boolean');
      });
    });
  });

  describe('Model property', () => {
    it('should return the model string for AISdkClient', () => {
      const client = new AISdkClient('openai/gpt-4o-turbo');
      expect(client.model).toBe('openai/gpt-4o-turbo');
    });

    it('should return the model string for OpenAIClient', () => {
      const client = new OpenAIClient('gpt-4o-turbo', { apiKey: 'test-key' });
      expect(client.model).toBe('gpt-4o-turbo');
    });

    it('should return the model string for AnthropicClient', () => {
      const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
      expect(client.model).toBe('claude-3-5-sonnet');
    });

    it('should return the model string for AIGatewayClient', () => {
      const client = new AIGatewayClient('openai/gpt-4o');
      expect(client.model).toBe('openai/gpt-4o');
    });
  });

  describe('Capability consistency', () => {
    it('should have consistent capability structure across all clients', () => {
      const clients = [
        new AISdkClient('openai/gpt-4o'),
        new OpenAIClient('gpt-4o', { apiKey: 'test-key' }),
        new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' }),
        new AIGatewayClient('openai/gpt-4o'),
      ];

      const capabilityKeys = [
        'supportsStreaming',
        'supportsCaching',
        'supportsThinking',
        'maxContext',
        'supportsStructuredOutput',
      ];

      clients.forEach(client => {
        capabilityKeys.forEach(key => {
          expect(client.capabilities).toHaveProperty(key);
        });
      });
    });

    it('should have boolean values for boolean capabilities', () => {
      const client = new AISdkClient('openai/gpt-4o');

      expect(typeof client.capabilities.supportsStreaming).toBe('boolean');
      expect(typeof client.capabilities.supportsCaching).toBe('boolean');
      expect(typeof client.capabilities.supportsThinking).toBe('boolean');
      expect(typeof client.capabilities.supportsStructuredOutput).toBe('boolean');
    });

    it('should have number value for maxContext', () => {
      const client = new AISdkClient('openai/gpt-4o');

      expect(typeof client.capabilities.maxContext).toBe('number');
      expect(client.capabilities.maxContext).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty model string', () => {
      const client = new AISdkClient('');
      expect(client.model).toBe('');
    });

    it('should handle model with special characters', () => {
      const client = new AISdkClient('openai/gpt-4.turbo');
      expect(client.model).toBe('openai/gpt-4.turbo');
    });

    it('should handle very long model names', () => {
      const longModelName = 'openai/' + 'a'.repeat(100);
      const client = new AISdkClient(longModelName);
      expect(client.model).toBe(longModelName);
    });
  });
});
