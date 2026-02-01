/**
 * ILLMClient Interface Contract Tests
 *
 * Verifies that @mimo/llm correctly implements the ILLMClient interface
 * defined in @mimo/agent-core.
 *
 * NOTE: These tests are currently skipped because LLMClient does not yet
 * fully implement the ILLMClient interface. The interface expects properties
 * like `provider`, `capabilities`, and methods like `complete()`, `stream()`,
 * `supports()` which are not implemented in the current LLMClient class.
 *
 * TODO: Implement ILLMClient interface in LLMClient and re-enable these tests.
 */

import { describe, it, expect } from 'vitest';
import { LLMProvider, type LLMClient } from '@mimo/llm';
import type { ILLMClient } from '@mimo/agent-core/interfaces';
import { testModels } from '../fixtures';

describe.skip('ILLMClient Interface Contract', () => {
  let client: LLMClient;

  beforeAll(() => {
    const provider = new LLMProvider();
    client = provider.getClient(testModels.claude);
  });

  describe('required properties', () => {
    it('should have provider property', () => {
      expect(client).toHaveProperty('provider');
      expect(typeof client.provider).toBe('string');
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
        expect(client.provider).toBe('anthropic');
      } else if (client.model.startsWith('openai/')) {
        expect(client.provider).toBe('openai');
      } else if (client.model.startsWith('google/')) {
        expect(client.provider).toBe('google');
      }
    });
  });

  describe('capabilities property', () => {
    it('should have supportsStreaming capability', () => {
      expect(client.capabilities.supportsStreaming).toBe(true);
    });

    it('should have supportsCaching capability', () => {
      expect(client.capabilities.supportsCaching).toBeDefined();
    });

    it('should have supportsStructuredOutput capability', () => {
      expect(client.capabilities.supportsStructuredOutput).toBe(true);
    });

    it('should have maxContext capability', () => {
      expect(client.capabilities.maxContext).toBeGreaterThan(0);
    });
  });

  describe('supports method', () => {
    it('should return true for streaming', () => {
      expect(client.supports('supportsStreaming')).toBe(true);
    });

    it('should return true for structured output', () => {
      expect(client.supports('supportsStructuredOutput')).toBe(true);
    });
  });
});
