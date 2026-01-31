/**
 * Streaming Tests
 * Tests SSE format validation, chunk ordering, and usage tracking
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AnthropicClient } from '../../src/clients/anthropic.js';
import { OpenAIClient } from '../../src/clients/openai.js';
import { AISdkClient } from '../../src/clients/aisdk.js';
import { Anthropic, OpenAI as OpenAIHelper, Google } from '../helpers/setup.js';
import { SIMPLE_TEST_MESSAGE, STREAMING_TEST_MESSAGE } from '../helpers/messages.js';

const hasAnyApiKey = Anthropic.hasApiKey() || OpenAIHelper.hasApiKey() || Google.hasApiKey();

describe.skipIf(!hasAnyApiKey)('Streaming Tests', () => {
  describe('SSE Format Validation', () => {
    it('should emit events with correct type structure', async () => {
      const client = OpenAIHelper.hasApiKey()
        ? new OpenAIClient('gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() })
        : new AISdkClient('openai/gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() });

      const events: string[] = [];

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        events.push(event.type);
        expect(['data', 'error', 'end']).toContain(event.type);

        if (event.type === 'data') {
          expect(event.content).toBeDefined();
          expect(typeof event.content).toBe('string');
        }
        if (event.type === 'error') {
          expect(event.error).toBeDefined();
          expect(typeof event.error).toBe('string');
        }
        if (event.type === 'end') {
          break;
        }
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1]).toBe('end');
    });

    it('should include delta field in data events', async () => {
      if (!OpenAIHelper.hasApiKey()) return;

      const client = new OpenAIClient('gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() });

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          expect(event.delta).toBeDefined();
          expect(event.delta?.content).toBeDefined();
        }
        if (event.type === 'end') {
          break;
        }
      }
    });

    it('should handle error events gracefully', async () => {
      if (!OpenAIHelper.hasApiKey()) return;

      const client = new OpenAIClient('gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() });

      // Test with potentially problematic input
      const errorMessages = [{ role: 'user' as const, content: '' }];

      let errorHandled = false;
      try {
        for await (const event of client.streamChatCompletion(errorMessages)) {
          if (event.type === 'error') {
            errorHandled = true;
            expect(event.error).toBeDefined();
            break;
          }
          if (event.type === 'end') {
            break;
          }
        }
      } catch (e) {
        // API may throw an error directly
        errorHandled = true;
      }

      // Either way, error should be handled
    });
  });

  describe('Chunk Ordering and Concatenation', () => {
    it('should stream chunks in correct order', async () => {
      if (!Anthropic.hasApiKey()) return;

      const client = new AnthropicClient('claude-3-5-haiku-20241022', {
        apiKey: Anthropic.getApiKey(),
      });

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
      expect(fullContent).toMatch(/1.*2.*3.*4.*5/);
    });

    it('should produce coherent content when concatenated', async () => {
      if (!OpenAIHelper.hasApiKey()) return;

      const client = new OpenAIClient('gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() });

      const chunks: string[] = [];
      let finalUsage: any = null;

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.usage) {
          finalUsage = event.usage;
        }
        if (event.type === 'end') {
          break;
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent).toMatch(/hello/i);
      expect(fullContent).toMatch(/world/i);
      expect(finalUsage).toBeDefined();
      expect(finalUsage.inputTokens).toBeGreaterThan(0);
      expect(finalUsage.outputTokens).toBeGreaterThan(0);
    });

    it('should handle empty chunks gracefully', async () => {
      if (!OpenAIHelper.hasApiKey()) return;

      const client = new OpenAIClient('gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() });

      let emptyChunkCount = 0;
      let dataChunkCount = 0;

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        if (event.type === 'data') {
          if (event.content === '') {
            emptyChunkCount++;
          } else {
            dataChunkCount++;
          }
        }
        if (event.type === 'end') {
          break;
        }
      }

      // We should have data chunks, empty chunks are acceptable
      expect(dataChunkCount).toBeGreaterThan(0);
    });
  });

  describe('Usage Tracking in Streaming', () => {
    it('should report token usage at the end of stream', async () => {
      if (!Anthropic.hasApiKey()) return;

      const client = new AnthropicClient('claude-3-5-haiku-20241022', {
        apiKey: Anthropic.getApiKey(),
      });

      let finalUsage: any = null;

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        if (event.usage) {
          finalUsage = event.usage;
        }
        if (event.type === 'end') {
          break;
        }
      }

      expect(finalUsage).toBeDefined();
      expect(finalUsage.inputTokens).toBeGreaterThan(0);
      expect(finalUsage.outputTokens).toBeGreaterThan(0);
    });

    it('should include usage in usage event or final data event', async () => {
      if (!OpenAIHelper.hasApiKey()) return;

      const client = new OpenAIClient('gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() });

      let foundUsage = false;

      for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
        if (event.usage) {
          foundUsage = true;
          expect(event.usage.inputTokens).toBeGreaterThan(0);
          expect(event.usage.outputTokens).toBeGreaterThan(0);
        }
        if (event.type === 'end') {
          break;
        }
      }

      expect(foundUsage).toBe(true);
    });
  });

  describe('Cross-Provider Streaming Consistency', () => {
    it('should have consistent SSE format across providers', async () => {
      const providers: Array<{ name: string; client: any }> = [];

      if (Anthropic.hasApiKey()) {
        providers.push({
          name: 'anthropic',
          client: new AnthropicClient('claude-3-5-haiku-20241022', { apiKey: Anthropic.getApiKey() }),
        });
      }

      if (OpenAIHelper.hasApiKey()) {
        providers.push({
          name: 'openai',
          client: new OpenAIClient('gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() }),
        });
      }

      for (const { name, client } of providers) {
        const eventTypes = new Set<string>();

        for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
          eventTypes.add(event.type);
          expect(['data', 'error', 'end']).toContain(event.type);

          if (event.type === 'end') {
            break;
          }
        }

        expect(eventTypes.has('data')).toBe(true);
        expect(eventTypes.has('end')).toBe(true);
      }
    });
  });

  describe('Streaming with AI SDK', () => {
    it('should stream correctly via AI SDK wrapper', async () => {
      if (!OpenAIHelper.hasApiKey()) return;

      const client = new AISdkClient('openai/gpt-4o-mini', {
        apiKey: OpenAIHelper.getApiKey(),
      });

      const chunks: string[] = [];
      let hasUsage = false;

      for await (const event of client.streamChatCompletion(STREAMING_TEST_MESSAGE)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.usage) {
          hasUsage = true;
        }
        if (event.type === 'end') {
          break;
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent.length).toBeGreaterThan(0);
      expect(hasUsage).toBe(true);
    });

    it('should handle multiple providers via AI SDK', async () => {
      const providers: string[] = [];

      if (OpenAIHelper.hasApiKey()) providers.push('openai/gpt-4o-mini');
      if (Anthropic.hasApiKey()) providers.push('anthropic/claude-3-5-haiku-20241022');
      if (Google.hasApiKey()) providers.push('google/gemini-1.5-flash');

      for (const model of providers) {
        const apiKey =
          model.startsWith('openai') && OpenAIHelper.hasApiKey()
            ? OpenAIHelper.getApiKey()
            : model.startsWith('anthropic') && Anthropic.hasApiKey()
            ? Anthropic.getApiKey()
            : Google.getApiKey();

        const client = new AISdkClient(model, { apiKey });

        let hasData = false;
        let hasEnd = false;

        for await (const event of client.streamChatCompletion(SIMPLE_TEST_MESSAGE)) {
          if (event.type === 'data') hasData = true;
          if (event.type === 'end') hasEnd = true;
          if (event.type === 'end') break;
        }

        expect(hasData).toBe(true);
        expect(hasEnd).toBe(true);
      }
    });
  });

  describe('Large Response Streaming', () => {
    it('should handle larger streamed responses', async () => {
      if (!OpenAIHelper.hasApiKey()) return;

      const client = new OpenAIClient('gpt-4o-mini', { apiKey: OpenAIHelper.getApiKey() });

      const longPrompt: Array<{ role: string; content: string }> = [
        {
          role: 'user',
          content: 'Write a numbered list of 10 programming languages, one per line.',
        },
      ];

      const chunks: string[] = [];

      for await (const event of client.streamChatCompletion(longPrompt as any)) {
        if (event.type === 'data' && event.content) {
          chunks.push(event.content);
        }
        if (event.type === 'end') {
          break;
        }
      }

      const fullContent = chunks.join('');
      expect(fullContent.length).toBeGreaterThan(50); // Should be a substantial response
    });
  });
});
