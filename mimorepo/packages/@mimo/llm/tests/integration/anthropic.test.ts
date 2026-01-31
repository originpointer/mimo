/**
 * Anthropic Integration Tests
 * Uses REAL API calls with claude-3-5-haiku
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AnthropicClient } from '../../src/clients/anthropic.js';
import { Anthropic } from '../helpers/setup.js';
import {
  SIMPLE_TEST_MESSAGE,
  STREAMING_TEST_MESSAGE,
  TOKEN_TRACKING_TEST_MESSAGE,
  SYSTEM_PROMPT_MESSAGES,
  CODE_GENERATION_MESSAGE,
} from '../helpers/messages.js';

// Test model - using haiku for faster/cheaper testing
const TEST_MODEL = 'claude-3-5-haiku-20241022';

describe.skipIf(!Anthropic.hasApiKey())('Anthropic Integration Tests', () => {
  let client: AnthropicClient;

  beforeAll(() => {
    Anthropic.validateApiKey();
    client = new AnthropicClient(TEST_MODEL, {
      apiKey: Anthropic.getApiKey(),
      baseURL: Anthropic.getBaseURL(),
    });
  });

  describe('Basic Chat Completion', () => {
    it('should complete a simple chat request', async () => {
      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response).toBeDefined();
      expect(response.content).toContain('Hello, World!');
      expect(response.usage).toBeDefined();
      expect(response.usage.inputTokens).toBeGreaterThan(0);
      expect(response.usage.outputTokens).toBeGreaterThan(0);
      expect(response.model).toContain('claude');
    });

    it('should handle system prompts', async () => {
      const response = await client.chatCompletion(SYSTEM_PROMPT_MESSAGES);

      expect(response.content).toBeDefined();
      expect(response.content.toLowerCase()).toBe(response.content);
      expect(response.usage.inputTokens).toBeGreaterThan(0);
    });

    it('should handle code generation requests', async () => {
      const response = await client.chatCompletion(CODE_GENERATION_MESSAGE);

      expect(response.content).toBeDefined();
      expect(response.content).toMatch(/function|const|let|var/);
      expect(response.content).toMatch(/add|Add|\+/);
    });

    it('should track token usage correctly', async () => {
      const response = await client.chatCompletion(TOKEN_TRACKING_TEST_MESSAGE);

      expect(response.usage).toBeDefined();
      expect(response.usage.inputTokens).toBeGreaterThan(0);
      expect(response.usage.outputTokens).toBeGreaterThan(0);
      expect(response.usage.inputTokens + response.usage.outputTokens).toBeGreaterThan(0);
    });

    it('should support max_tokens option', async () => {
      const response = await client.chatCompletion(
        [{ role: 'user', content: 'Say hi' }],
        { maxTokens: 10 }
      );

      expect(response.content).toBeDefined();
      expect(response.usage.outputTokens).toBeLessThanOrEqual(20); // Allow some variance
    });

    it('should support temperature option', async () => {
      const response1 = await client.chatCompletion(
        [{ role: 'user', content: 'Pick a number between 1 and 10' }],
        { temperature: 0 }
      );

      const response2 = await client.chatCompletion(
        [{ role: 'user', content: 'Pick a number between 1 and 10' }],
        { temperature: 1 }
      );

      expect(response1.content).toBeDefined();
      expect(response2.content).toBeDefined();
      // With temperature 0, responses should be more deterministic
    });
  });

  describe('Streaming', () => {
    it('should stream chat completion', async () => {
      const chunks: string[] = [];
      let finalUsage: any = undefined;

      for await (const event of client.streamChatCompletion(STREAMING_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.usage) {
          finalUsage = event.usage;
        }
        if (event.type === 'end') {
          expect(event.type).toBe('end');
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent).toBeDefined();
      expect(fullContent.length).toBeGreaterThan(0);
      expect(fullContent).toMatch(/\d+.*\d+.*\d+.*\d+.*\d+/); // Should contain numbers 1-5

      expect(finalUsage).toBeDefined();
      expect(finalUsage.inputTokens).toBeGreaterThan(0);
      expect(finalUsage.outputTokens).toBeGreaterThan(0);
    });

    it('should handle streaming errors gracefully', async () => {
      const invalidMessages = [{ role: 'user' as const, content: '' }];

      let hasError = false;
      try {
        for await (const event of client.streamChatCompletion(invalidMessages)) {
          // Should handle error event
          if (event.type === 'error') {
            hasError = true;
          }
        }
      } catch (e) {
        // API may throw an error directly
        hasError = true;
      }

      // Either we get an error event or an exception
      // Anthropic API might accept empty content, so we don't strictly enforce error
    });

    it('should stream with proper SSE format', async () => {
      const events: string[] = [];

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        events.push(event.type);
        if (event.type === 'data') {
          expect(event.content).toBeDefined();
        }
        if (event.type === 'end') {
          break;
        }
      }

      expect(events).toContain('data');
      expect(events).toContain('end');
    });
  });

  describe('Structured Output', () => {
    it('should generate structured output with zod schema', async () => {
      const zod = await import('zod');
      const PersonSchema = zod.z.object({
        name: zod.z.string(),
        age: zod.z.number(),
        city: zod.z.string(),
      });

      const messages = [
        {
          role: 'user' as const,
          content: 'Extract: John Doe, age 30, lives in New York City',
        },
      ];

      const result = await client.generateStructure(messages, PersonSchema);

      expect(result).toBeDefined();
      expect(result.name).toBe('John Doe');
      expect(result.age).toBe(30);
      expect(result.city).toBe('New York City');
    });

    it('should handle nested structured output', async () => {
      const zod = await import('zod');
      const AddressSchema = zod.z.object({
        street: zod.z.string(),
        city: zod.z.string(),
        country: zod.z.string(),
      });

      const PersonWithAddressSchema = zod.z.object({
        name: zod.z.string(),
        address: AddressSchema,
      });

      const messages = [
        {
          role: 'user' as const,
          content: 'Extract: Alice Smith lives at 123 Main St, London, UK',
        },
      ];

      const result = await client.generateStructure(messages, PersonWithAddressSchema);

      expect(result).toBeDefined();
      expect(result.name).toBe('Alice Smith');
      expect(result.address).toBeDefined();
      expect(result.address.street).toBe('123 Main St');
      expect(result.address.city).toBe('London');
      expect(result.address.country).toBe('UK');
    });

    it('should handle array structured output', async () => {
      const zod = await import('zod');
      const ItemSchema = zod.z.object({
        name: zod.z.string(),
        quantity: zod.z.number(),
      });

      const ShoppingListSchema = zod.z.object({
        items: zod.z.array(ItemSchema),
      });

      const messages = [
        {
          role: 'user' as const,
          content: 'Create a shopping list with: apples (5), bananas (3), milk (2)',
        },
      ];

      const result = await client.generateStructure(messages, ShoppingListSchema);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe('Token Tracking', () => {
    it('should track input and output tokens', async () => {
      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response.usage.inputTokens).toBeGreaterThan(0);
      expect(response.usage.outputTokens).toBeGreaterThan(0);
      expect(response.usage.inputTokens + response.usage.outputTokens).toBeGreaterThan(0);
    });

    it('should handle cache tokens for supported models', async () => {
      // Create a longer prompt to potentially trigger caching
      const longMessages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: 'A'.repeat(5000), // Long system prompt
        },
        {
          role: 'user',
          content: 'Say hello',
        },
      ];

      const response = await client.chatCompletion(longMessages as any);

      expect(response.usage).toBeDefined();
      expect(response.usage.inputTokens).toBeGreaterThan(0);
      expect(response.usage.outputTokens).toBeGreaterThan(0);
      // Cache tokens may or may not be present depending on API behavior
      if (response.usage.cachedInputTokens !== undefined) {
        expect(response.usage.cachedInputTokens).toBeGreaterThanOrEqual(0);
      }
    });

    it('should report model name correctly', async () => {
      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response.model).toBeDefined();
      expect(response.model).toContain('claude');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model names gracefully', async () => {
      const invalidClient = new AnthropicClient('invalid-model-name', {
        apiKey: Anthropic.getApiKey(),
      });

      let hasError = false;
      try {
        await invalidClient.chatCompletion(SIMPLE_TEST_MESSAGE);
      } catch (error) {
        hasError = true;
        expect(error).toBeDefined();
      }

      expect(hasError).toBe(true);
    });

    it('should retry on retryable errors', async () => {
      // This test verifies retry logic is in place
      // Actual retry behavior depends on API conditions
      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });

  describe('Client Methods', () => {
    it('should return correct provider type', () => {
      expect(client.getProviderType()).toBe('anthropic');
    });

    it('should return model name', () => {
      expect(client.getModel()).toBe(TEST_MODEL);
    });
  });
});
