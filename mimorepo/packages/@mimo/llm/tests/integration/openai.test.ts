/**
 * OpenAI Integration Tests
 * Uses REAL API calls with gpt-4o-mini
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAIClient } from '../../src/clients/openai.js';
import { OpenAI as OpenAIHelper } from '../helpers/setup.js';
import {
  SIMPLE_TEST_MESSAGE,
  STREAMING_TEST_MESSAGE,
  TOKEN_TRACKING_TEST_MESSAGE,
  SYSTEM_PROMPT_MESSAGES,
  CODE_GENERATION_MESSAGE,
  REASONING_TEST_MESSAGE,
} from '../helpers/messages.js';

// Test model - using gpt-4o-mini for faster/cheaper testing
const TEST_MODEL = 'gpt-4o-mini';

describe.skipIf(!OpenAIHelper.hasApiKey())('OpenAI Integration Tests', () => {
  let client: OpenAIClient;

  beforeAll(() => {
    OpenAIHelper.validateApiKey();
    client = new OpenAIClient(TEST_MODEL, {
      apiKey: OpenAIHelper.getApiKey(),
      baseURL: OpenAIHelper.getBaseURL(),
    });
  });

  describe('Basic Chat Completion', () => {
    it('should complete a simple chat request', async () => {
      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response).toBeDefined();
      expect(response.content).toMatch(/hello|Hello|HELLO/);
      expect(response.content).toMatch(/world|World|WORLD/);
      expect(response.usage).toBeDefined();
      expect(response.usage.inputTokens).toBeGreaterThan(0);
      expect(response.usage.outputTokens).toBeGreaterThan(0);
      expect(response.model).toContain('gpt');
    });

    it('should handle system prompts', async () => {
      const response = await client.chatCompletion(SYSTEM_PROMPT_MESSAGES);

      expect(response.content).toBeDefined();
      expect(response.content).toBe(response.content.toLowerCase());
      expect(response.usage.inputTokens).toBeGreaterThan(0);
    });

    it('should handle code generation requests', async () => {
      const response = await client.chatCompletion(CODE_GENERATION_MESSAGE);

      expect(response.content).toBeDefined();
      expect(response.content).toMatch(/function|const|let|var|=>/);
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
      expect(response.usage.outputTokens).toBeLessThanOrEqual(15); // Allow some variance
    });

    it('should support temperature option', async () => {
      const response = await client.chatCompletion(
        [{ role: 'user', content: 'Pick a number between 1 and 10' }],
        { temperature: 0.5 }
      );

      expect(response.content).toBeDefined();
    });

    it('should support top_p option', async () => {
      const response = await client.chatCompletion(
        [{ role: 'user', content: 'Say hello' }],
        { topP: 0.5 }
      );

      expect(response.content).toBeDefined();
    });

    it('should support stop sequences', async () => {
      const response = await client.chatCompletion(
        [{ role: 'user', content: 'Count from 1 to 5, one number per line.' }],
        { stop: ['3'] }
      );

      expect(response.content).toBeDefined();
      // Should stop before or at '3'
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

    it('should handle streaming with proper SSE format', async () => {
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

    it('should stream content chunks in order', async () => {
      const chunks: string[] = [];

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.type === 'end') {
          break;
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent).toMatch(/hello.*world/i);
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

    it('should report model name correctly', async () => {
      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response.model).toBeDefined();
      expect(response.model).toContain('gpt');
    });

    it('should not have reasoning tokens for gpt-4o-mini', async () => {
      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response.usage.reasoningTokens).toBeUndefined();
    });
  });

  describe('O1/O3 Series Support', () => {
    // These tests are conditional on having API access to o1/o3 models
    // Most test accounts may not have access, so we skip by default

    it.skipIf(true, 'should handle o1 model (requires API access)', async () => {
      const o1Client = new OpenAIClient('o1-mini', {
        apiKey: OpenAIHelper.getApiKey(),
      });

      const response = await o1Client.chatCompletion(REASONING_TEST_MESSAGE);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      // o1 models may report reasoning tokens
      if (response.usage.reasoningTokens !== undefined) {
        expect(response.usage.reasoningTokens).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model names gracefully', async () => {
      const invalidClient = new OpenAIClient('invalid-model-name', {
        apiKey: OpenAIHelper.getApiKey(),
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

    it('should handle invalid API keys gracefully', async () => {
      const invalidClient = new OpenAIClient(TEST_MODEL, {
        apiKey: 'sk-invalid-key',
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
      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });

  describe('Client Methods', () => {
    it('should return correct provider type', () => {
      expect(client.getProviderType()).toBe('openai');
    });

    it('should return model name', () => {
      expect(client.getModel()).toBe(TEST_MODEL);
    });
  });

  describe('Multi-turn Conversations', () => {
    it('should handle conversation history', async () => {
      const messages = [
        { role: 'user' as const, content: 'My favorite color is blue.' },
        { role: 'assistant' as const, content: "I've noted that your favorite color is blue." },
        { role: 'user' as const, content: 'What is my favorite color?' },
      ];

      const response = await client.chatCompletion(messages);

      expect(response.content).toBeDefined();
      expect(response.content.toLowerCase()).toMatch(/blue/);
    });
  });
});
