/**
 * Real LLM Integration Tests
 *
 * Tests actual LLM calls through Vercel AI Gateway.
 * These tests will be skipped if AI_GATEWAY_API_KEY is not configured.
 */

import { describe, it, expect } from 'vitest';
import { describeWithAIGateway, createLLMClient, testModels } from '../fixtures/llm';

describeWithAIGateway('Real LLM Integration', () => {
  describe('Anthropic Claude via AI Gateway', () => {
    it('should complete chat with claude-3-5-haiku', async () => {
      const client = createLLMClient(testModels.claude);

      const response = await client.chatCompletion([
        { role: 'user', content: 'Say "Hello!"' },
      ]);

      expect(response.content).toBeDefined();
      expect(response.content.toLowerCase()).toContain('hello');
      expect(response.usage).toBeDefined();
    });

    it('should support streaming with claude-3-5-haiku', async () => {
      const client = createLLMClient(testModels.claude);

      const chunks: string[] = [];
      for await (const chunk of client.streamChatCompletion([
        { role: 'user', content: 'Count to 3: 1, 2, 3' },
      ])) {
        if (chunk.type === 'data' && chunk.delta) {
          chunks.push(chunk.delta);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullContent = chunks.join('');
      expect(fullContent).toBeDefined();
    });

    // Tool calls test skipped - tool calls not currently supported in LLMResponse type
    it.skip('should handle tool calls with claude-3-5-haiku', async () => {
      const client = createLLMClient(testModels.claude);

      const response = await client.chatCompletion(
        [{ role: 'user', content: 'What is 2 + 3? Use the calculate tool.' }],
        {}
      );

      expect(response.content).toBeDefined();
    });
  });

  describe('OpenAI via AI Gateway', () => {
    it('should complete chat with gpt-4o-mini', async () => {
      const client = createLLMClient(testModels.gpt4o);

      const response = await client.chatCompletion([
        { role: 'user', content: 'Say "Hello!"' },
      ]);

      expect(response.content).toBeDefined();
      expect(response.content.toLowerCase()).toContain('hello');
    });

    it('should support streaming with gpt-4o-mini', async () => {
      const client = createLLMClient(testModels.gpt4o);

      const chunks: string[] = [];
      for await (const chunk of client.streamChatCompletion([
        { role: 'user', content: 'Say "Streaming test!"' },
      ])) {
        if (chunk.type === 'data' && chunk.delta) {
          chunks.push(chunk.delta);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullContent = chunks.join('');
      expect(fullContent).toBeDefined();
    });
  });

  describe('Multi-turn conversations', () => {
    it('should handle conversation history with claude-3-5-haiku', async () => {
      const client = createLLMClient(testModels.claude);

      const response = await client.chatCompletion([
        { role: 'user', content: 'My name is Alice' },
        { role: 'assistant', content: 'Nice to meet you, Alice!' },
        { role: 'user', content: 'What is my name?' },
      ]);

      expect(response.content).toBeDefined();
      // Should remember the name
      expect(response.content.toLowerCase()).toContain('alice');
    });
  });

  describe('Token tracking', () => {
    it('should track token usage for claude-3-5-haiku', async () => {
      const client = createLLMClient(testModels.claude);

      const response = await client.chatCompletion([
        { role: 'user', content: 'Tell me a short joke' },
      ]);

      expect(response.usage).toBeDefined();
      expect(response.usage.inputTokens).toBeGreaterThan(0);
      expect(response.usage.outputTokens).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should reject empty messages (provider validation)', async () => {
      const client = createLLMClient(testModels.claude);

      await expect(
        client.chatCompletion([{ role: 'user', content: '' }])
      ).rejects.toBeDefined();
    });
  });
});
