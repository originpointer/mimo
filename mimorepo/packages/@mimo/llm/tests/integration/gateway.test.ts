/**
 * Vercel AI Gateway Integration Tests
 * Tests multiple providers through unified AI Gateway
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LLMProvider, AIGatewayClient } from '../../src/provider.js';
import { AIGateway } from '../helpers/setup.js';
import {
  SIMPLE_TEST_MESSAGE,
  STREAMING_TEST_MESSAGE,
  TOKEN_TRACKING_TEST_MESSAGE,
  MULTI_TURN_MESSAGES,
} from '../helpers/messages.js';

// Only run tests if AI Gateway API key is configured
const hasApiKey = AIGateway.hasApiKey();

describe.skipIf(!hasApiKey)('Vercel AI Gateway Integration Tests', () => {
  let provider: LLMProvider;

  beforeAll(() => {
    AIGateway.validateApiKey();
    provider = new LLMProvider();
  });

  describe('Anthropic through Gateway', () => {
    it('should complete chat with claude-3-5-haiku', async () => {
      const client = provider.getClient('anthropic/claude-3-5-haiku') as AIGatewayClient;

      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response.content).toBeTruthy();
      expect(response.content.toLowerCase()).toContain('hello');
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
    });

    it('should stream with claude-3-5-haiku', async () => {
      const client = provider.getClient('anthropic/claude-3-5-haiku') as AIGatewayClient;

      const chunks: string[] = [];

      for await (const event of client.streamChatCompletion(STREAMING_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.type === 'end') {
          break;
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent).toBeTruthy();
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAI through Gateway', () => {
    it('should complete chat with gpt-4o-mini', async () => {
      const client = provider.getClient('openai/gpt-4o-mini') as AIGatewayClient;

      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response.content).toBeTruthy();
      expect(response.content.toLowerCase()).toContain('hello');
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
    });

    it('should stream with gpt-4o-mini', async () => {
      const client = provider.getClient('openai/gpt-4o-mini') as AIGatewayClient;

      const chunks: string[] = [];

      for await (const event of client.streamChatCompletion(STREAMING_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.type === 'end') {
          break;
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent).toBeTruthy();
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should complete chat with gpt-5.2', async () => {
      const client = provider.getClient('openai/gpt-5.2') as AIGatewayClient;

      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response.content).toBeTruthy();
      expect(response.content.toLowerCase()).toContain('hello');
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
    });

    it('should stream with gpt-5.2', async () => {
      const client = provider.getClient('openai/gpt-5.2') as AIGatewayClient;

      const chunks: string[] = [];

      for await (const event of client.streamChatCompletion(STREAMING_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.type === 'end') {
          break;
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent).toBeTruthy();
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should track token usage for gpt-5.2', async () => {
      const client = provider.getClient('openai/gpt-5.2') as AIGatewayClient;

      const response = await client.chatCompletion(TOKEN_TRACKING_TEST_MESSAGE);

      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
    });

    it('should handle multi-turn conversations with gpt-5.2', async () => {
      const client = provider.getClient('openai/gpt-5.2') as AIGatewayClient;

      const response = await client.chatCompletion(MULTI_TURN_MESSAGES);

      expect(response.content).toBeTruthy();
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
    });
  });

  describe('Google through Gateway', () => {
    // Note: Google models through Gateway require Vertex AI provider configuration
    // The model ID format is: google/gemini-<version>-<variant>
    // Common models: google/gemini-2.0-flash, google/gemini-1.5-flash-exp
    // If Google provider is not configured in AI Gateway, these tests will be skipped

    it('should complete chat with gemini-2.0-flash-exp', async () => {
      const client = provider.getClient('google/gemini-2.0-flash') as AIGatewayClient;

      const response = await client.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response.content).toBeTruthy();
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
    });

    it('should stream with gemini-2.0-flash-exp', async () => {
      const client = provider.getClient('google/gemini-2.0-flash') as AIGatewayClient;

      const chunks: string[] = [];

      for await (const event of client.streamChatCompletion(STREAMING_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.type === 'end') {
          break;
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent).toBeTruthy();
    });
  });

  describe('Gateway features', () => {
    it('should handle multiple providers in same session', async () => {
      const anthropicClient = provider.getClient('anthropic/claude-3-5-haiku') as AIGatewayClient;

      const openaiClient = provider.getClient('openai/gpt-4o-mini') as AIGatewayClient;

      const response1 = await anthropicClient.chatCompletion(SIMPLE_TEST_MESSAGE);
      const response2 = await openaiClient.chatCompletion(SIMPLE_TEST_MESSAGE);

      expect(response1.content).toBeTruthy();
      expect(response2.content).toBeTruthy();
    });

    it('should track token usage for all providers', async () => {
      const client = provider.getClient('openai/gpt-4o-mini') as AIGatewayClient;

      const response = await client.chatCompletion(TOKEN_TRACKING_TEST_MESSAGE);

      expect(response.usage?.inputTokens).toBeGreaterThan(0);
      expect(response.usage?.outputTokens).toBeGreaterThan(0);
    });
  });

  describe('Provider factory with Gateway', () => {
    it('should return AIGatewayClient when AI_GATEWAY_API_KEY is set', () => {
      const client = provider.getClient('anthropic/claude-3-5-haiku');

      expect(client).toBeInstanceOf(AIGatewayClient);
    });

    it('should cache gateway clients', () => {
      const client1 = provider.getClient('openai/gpt-4o-mini');
      const client2 = provider.getClient('openai/gpt-4o-mini');

      expect(client1).toBe(client2);
    });

    it('should create different clients for different models', () => {
      const client1 = provider.getClient('anthropic/claude-3-5-haiku');
      const client2 = provider.getClient('openai/gpt-4o-mini');

      expect(client1).not.toBe(client2);
    });
  });

  describe('Multi-turn conversations', () => {
    it('should handle multi-turn through gateway', async () => {
      const client = provider.getClient('anthropic/claude-3-5-haiku') as AIGatewayClient;

      const response = await client.chatCompletion(MULTI_TURN_MESSAGES);

      expect(response.content).toBeTruthy();
      expect(response.usage?.inputTokens).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle streaming errors gracefully', async () => {
      const client = provider.getClient('openai/gpt-4o-mini') as AIGatewayClient;

      const events: string[] = [];

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        events.push(event.type);
        if (event.type === 'error' || event.type === 'end') {
          break;
        }
      }

      expect(events).toContain('end');
    });
  });
});
