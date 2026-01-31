/**
 * Google Integration Tests
 * Uses REAL API calls with gemini-1.5-flash via AI SDK
 * Note: Direct GoogleClient is not yet implemented, tests use AISdkClient
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AISdkClient } from '../../src/clients/aisdk.js';
import { Google } from '../helpers/setup.js';
import {
  SIMPLE_TEST_MESSAGE,
  STREAMING_TEST_MESSAGE,
  TOKEN_TRACKING_TEST_MESSAGE,
  SYSTEM_PROMPT_MESSAGES,
  CODE_GENERATION_MESSAGE,
} from '../helpers/messages.js';

// Test model - using gemini-1.5-flash for faster/cheaper testing
const TEST_MODEL = 'google/gemini-1.5-flash';

describe.skipIf(!Google.hasApiKey())('Google Integration Tests (via AI SDK)', () => {
  let client: AISdkClient;

  beforeAll(() => {
    Google.validateApiKey();
    client = new AISdkClient(TEST_MODEL, {
      apiKey: Google.getApiKey(),
      baseURL: Google.getBaseURL(),
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
      expect(response.model).toBeDefined();
    });

    it('should handle system prompts', async () => {
      const response = await client.chatCompletion(SYSTEM_PROMPT_MESSAGES);

      expect(response.content).toBeDefined();
      // Note: Gemini may not strictly follow lowercase rule
      expect(response.usage.inputTokens).toBeGreaterThan(0);
    });

    it('should handle code generation requests', async () => {
      const response = await client.chatCompletion(CODE_GENERATION_MESSAGE);

      expect(response.content).toBeDefined();
      expect(response.content).toMatch(/function|const|let|var|=>|add/);
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
      // Max tokens is a hint, actual may vary
    });

    it('should support temperature option', async () => {
      const response = await client.chatCompletion(
        [{ role: 'user', content: 'Pick a number between 1 and 10' }],
        { temperature: 0.5 }
      );

      expect(response.content).toBeDefined();
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
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model names gracefully', async () => {
      const invalidClient = new AISdkClient('google/invalid-model-name', {
        apiKey: Google.getApiKey(),
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
      const invalidClient = new AISdkClient(TEST_MODEL, {
        apiKey: 'invalid-key',
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
  });

  describe('Client Methods', () => {
    it('should return correct provider type', () => {
      expect(client.getProviderType()).toBe('google');
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

/**
 * TODO: Direct GoogleClient tests
 * These tests are pending the implementation of the direct GoogleClient class
 * Currently, Google integration is only available through AISdkClient
 */
describe.skip('Google Direct Client Tests (Pending Implementation)', () => {
  it('should be implemented when GoogleClient is created', () => {
    expect(true).toBe(true);
  });
});
