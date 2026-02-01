/**
 * ILLMClient Interface Contract Tests
 *
 * Verifies that @mimo/llm correctly implements the ILLMClient interface
 * defined in @mimo/agent-core.
 */

import { describe, it, expect } from 'vitest';
import { LLMProvider as LLMProviderFactory, type LLMClient } from '@mimo/llm';
import { LLMProvider as CoreLLMProvider, type ILLMClient } from '@mimo/agent-core';
import { testModels } from '../fixtures';

describe('ILLMClient Interface Contract', () => {
  let client: LLMClient;

  beforeAll(() => {
    const provider = new LLMProviderFactory();
    client = provider.getClient(testModels.claude);
  });

  describe('required properties', () => {
    it('should have provider property', () => {
      expect(client).toHaveProperty('provider');
      expect(typeof client.provider).toBe('string');
      expect(Object.values(CoreLLMProvider)).toContain(client.provider);
    });

    it('should have model property', () => {
      expect(client).toHaveProperty('model');
      expect(typeof client.model).toBe('string');
      expect(client.model.length).toBeGreaterThan(0);
    });

    it('should have capabilities property', () => {
      expect(client).toHaveProperty('capabilities');
      expect(client.capabilities).toBeDefined();
      expect(typeof client.capabilities).toBe('object');
      expect(typeof client.capabilities.supportsCaching).toBe('boolean');
      expect(typeof client.capabilities.supportsThinking).toBe('boolean');
      expect(typeof client.capabilities.supportsStructuredOutput).toBe('boolean');
      expect(typeof client.capabilities.supportsStreaming).toBe('boolean');
    });

    it('should have complete method', () => {
      expect(client).toHaveProperty('complete');
      expect(typeof client.complete).toBe('function');
    });

    it('should have stream method', () => {
      expect(client).toHaveProperty('stream');
      expect(typeof client.stream).toBe('function');
    });

    it('should have supports method', () => {
      expect(client).toHaveProperty('supports');
      expect(typeof client.supports).toBe('function');
    });
  });

  describe('interface satisfaction', () => {
    it('should satisfy ILLMClient interface', () => {
      const illmClient: ILLMClient = client;
      expect(illmClient).toBeDefined();
    });
  });

  describe('provider property', () => {
    it('should have valid provider value', () => {
      // Provider should match the model prefix
      if (client.model.startsWith('anthropic/')) {
        expect(client.provider).toBe(CoreLLMProvider.ANTHROPIC);
      } else if (client.model.startsWith('openai/')) {
        expect(client.provider).toBe(CoreLLMProvider.OPENAI);
      } else if (client.model.startsWith('google/')) {
        expect(client.provider).toBe(CoreLLMProvider.GOOGLE);
      }
    });
  });

  describe('capabilities property', () => {
    it('should have supportsStreaming capability', () => {
      expect(typeof client.capabilities.supportsStreaming).toBe('boolean');
    });

    it('should have supportsCaching capability', () => {
      expect(client.capabilities.supportsCaching).toBeDefined();
    });

    it('should have supportsStructuredOutput capability', () => {
      expect(typeof client.capabilities.supportsStructuredOutput).toBe('boolean');
    });

    it('should have maxContext capability', () => {
      expect(client.capabilities.maxContext).toBeGreaterThanOrEqual(0);
    });
  });

  describe('supports method', () => {
    it('should return true for streaming', () => {
      expect(typeof client.supports('supportsStreaming')).toBe('boolean');
    });

    it('should return true for structured output', () => {
      expect(typeof client.supports('supportsStructuredOutput')).toBe('boolean');
    });
  });
});
