/**
 * Base Client Unit Tests
 * Tests retry logic, token usage normalization, and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LLMClient } from '../../src/client.js';
import type { ChatMessage, ChatCompletionOptions, LLMResponse, LLMStreamChunk } from '@mimo/types';

// Test implementation of LLMClient
class TestLLMClient extends LLMClient {
  public callCount = 0;
  public errors: Error[] = [];
  public shouldFail = false;
  public failUntil = 0;
  public mockResponse: Partial<LLMResponse> = {
    content: 'Test response',
    usage: {
      inputTokens: 10,
      outputTokens: 20,
    },
    model: 'test-model',
  };

  getProviderType(): 'openai' {
    return 'openai';
  }

  protected async doChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<LLMResponse> {
    this.callCount++;

    if (this.shouldFail && this.callCount <= this.failUntil) {
      this.errors.push(new Error('rate_limit: Rate limit exceeded'));
      throw this.errors[this.errors.length - 1];
    }

    return {
      content: this.mockResponse.content || 'Test response',
      usage: this.mockResponse.usage || {
        inputTokens: 10,
        outputTokens: 20,
      },
      model: this.mockResponse.model || 'test-model',
    };
  }

  protected async *doStreamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    yield { content: 'Hello', delta: { content: 'Hello' } };
    yield { content: ' World', delta: { content: ' World' } };
    yield {
      content: '',
      usage: { inputTokens: 10, outputTokens: 20 },
    };
  }

  protected async doGenerateStructure<T>(messages: ChatMessage[], schema: any): Promise<any> {
    this.callCount++;

    if (this.shouldFail && this.callCount <= this.failUntil) {
      this.errors.push(new Error('rate_limit: Rate limit exceeded'));
      throw this.errors[this.errors.length - 1];
    }

    return { test: 'data' };
  }

  // Test helper methods
  public resetTestState(): void {
    this.callCount = 0;
    this.errors = [];
    this.shouldFail = false;
    this.failUntil = 0;
  }

  public testNormalizeUsage(usage: any): any {
    return this.normalizeUsage(usage);
  }

  public testIsRetryable(error: unknown): boolean {
    return this.isRetryable(error);
  }

  public testWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    return this.withRetry(fn);
  }
}

describe('LLMClient Base Class', () => {
  let client: TestLLMClient;
  const testMessages: ChatMessage[] = [{ role: 'user', content: 'Test' }];

  beforeEach(() => {
    client = new TestLLMClient('test-model');
    client.resetTestState();
  });

  describe('chatCompletion', () => {
    it('should call doChatCompletion', async () => {
      const response = await client.chatCompletion(testMessages);

      expect(response.content).toBe('Test response');
      expect(client.callCount).toBe(1);
    });

    it('should normalize usage in response', async () => {
      client.mockResponse.usage = {
        inputTokens: 100,
        outputTokens: 50,
        reasoningTokens: 25,
        cachedInputTokens: 10,
      };

      const response = await client.chatCompletion(testMessages);

      expect(response.usage.inputTokens).toBe(100);
      expect(response.usage.outputTokens).toBe(50);
      expect(response.usage.reasoningTokens).toBe(25);
      expect(response.usage.cachedInputTokens).toBe(10);
    });
  });

  describe('streamChatCompletion', () => {
    it('should stream chunks with SSE format', async () => {
      const events: string[] = [];
      const contents: string[] = [];

      for await (const event of client.streamChatCompletion(testMessages)) {
        events.push(event.type);
        if (event.content) {
          contents.push(event.content);
        }
        if (event.type === 'end') {
          break;
        }
      }

      expect(events).toContain('data');
      expect(events).toContain('end');
      expect(contents.join('')).toBe('Hello World');
    });

    it('should include usage in stream', async () => {
      let usageFound = false;

      for await (const event of client.streamChatCompletion(testMessages)) {
        if (event.usage) {
          usageFound = true;
          expect(event.usage.inputTokens).toBe(10);
          expect(event.usage.outputTokens).toBe(20);
        }
        if (event.type === 'end') {
          break;
        }
      }

      expect(usageFound).toBe(true);
    });

    it('should handle errors in streaming', async () => {
      class FailingTestClient extends TestLLMClient {
        protected override async *doStreamChatCompletion(): AsyncGenerator<LLMStreamChunk> {
          yield { content: 'Start', delta: { content: 'Start' } };
          throw new Error('Stream error');
        }
      }

      const failingClient = new FailingTestClient('failing-model');
      const events: string[] = [];

      for await (const event of failingClient.streamChatCompletion(testMessages)) {
        events.push(event.type);
        if (event.type === 'error') {
          expect(event.error).toBeDefined();
          break;
        }
      }

      expect(events).toContain('error');
    });
  });

  describe('generateStructure', () => {
    let sleepMock: any;

    beforeEach(() => {
      // Mock sleep to avoid delays in retry tests
      sleepMock = vi.spyOn(TestLLMClient.prototype, 'sleep').mockResolvedValue();
    });

    afterEach(() => {
      sleepMock?.mockRestore();
    });

    it('should call doGenerateStructure', async () => {
      const zod = await import('zod');
      const TestSchema = zod.z.object({
        name: zod.z.string(),
      });

      const result = await client.generateStructure(testMessages, TestSchema);

      expect(result).toEqual({ test: 'data' });
    });

    it('should use retry logic', async () => {
      client.shouldFail = true;
      client.failUntil = 2;

      const zod = await import('zod');
      const TestSchema = zod.z.object({ name: zod.z.string() });

      const result = await client.generateStructure(testMessages, TestSchema);

      expect(result).toEqual({ test: 'data' });
      expect(client.callCount).toBe(3); // 2 failures + 1 success
    });
  });

  describe('Retry Logic', () => {
    let sleepMock: any;

    beforeEach(() => {
      // Mock sleep to avoid delays in tests
      sleepMock = vi.spyOn(TestLLMClient.prototype, 'sleep').mockResolvedValue();
    });

    afterEach(() => {
      sleepMock.mockRestore();
    });

    it('should retry on retryable errors', async () => {
      client.shouldFail = true;
      client.failUntil = 2;

      const response = await client.chatCompletion(testMessages);

      expect(response).toBeDefined();
      expect(client.callCount).toBe(3); // 2 failures + 1 success
    });

    it('should not retry on non-retryable errors', async () => {
      client.shouldFail = true;
      client.failUntil = 100; // Always fail

      await expect(client.chatCompletion(testMessages)).rejects.toThrow();

      // Should only try maxRetries + 1 times
      expect(client.callCount).toBe(4); // 3 retries + 1 initial = 4 total
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      sleepMock.mockImplementation((ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });

      client.shouldFail = true;
      client.failUntil = 2;

      await client.chatCompletion(testMessages);

      // Should have 2 delays (after 1st and 2nd failure)
      expect(delays).toHaveLength(2);
      // Each delay should be longer (exponential backoff)
      expect(delays[1]).toBeGreaterThan(delays[0]);
    });

    it('should respect maxRetries option', async () => {
      const customClient = new TestLLMClient('test-model', { maxRetries: 1 });
      // Mock sleep for this client too
      vi.spyOn(customClient, 'sleep').mockResolvedValue();
      customClient.shouldFail = true;
      customClient.failUntil = 100;

      await expect(customClient.chatCompletion(testMessages)).rejects.toThrow();

      // Should try maxRetries + 1 times = 2 times
      expect(customClient.callCount).toBe(2);
    });

    it('should not delay on final attempt', async () => {
      client.shouldFail = true;
      client.failUntil = 1;

      await client.chatCompletion(testMessages);

      // Only 1 failure means only 1 delay
      expect(sleepMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('isRetryable', () => {
    it('should identify rate_limit errors as retryable', () => {
      const error = new Error('rate_limit: Rate limit exceeded');
      expect(client.testIsRetryable(error)).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      const error = new Error('timeout: Request timeout');
      expect(client.testIsRetryable(error)).toBe(true);
    });

    it('should identify server_error as retryable', () => {
      const error = new Error('server_error: Internal server error');
      expect(client.testIsRetryable(error)).toBe(true);
    });

    it('should not retry validation errors', () => {
      const error = new Error('validation: Invalid input');
      expect(client.testIsRetryable(error)).toBe(false);
    });

    it('should not retry authentication errors', () => {
      const error = new Error('authentication: Invalid API key');
      expect(client.testIsRetryable(error)).toBe(false);
    });

    it('should handle non-Error objects', () => {
      expect(client.testIsRetryable('string error')).toBe(false);
      expect(client.testIsRetryable(null)).toBe(false);
      expect(client.testIsRetryable(undefined)).toBe(false);
    });
  });

  describe('normalizeUsage', () => {
    it('should normalize OpenAI usage format', () => {
      const usage = {
        prompt_tokens: 100,
        completion_tokens: 50,
      };

      const normalized = client.testNormalizeUsage(usage);

      expect(normalized.inputTokens).toBe(100);
      expect(normalized.outputTokens).toBe(50);
    });

    it('should normalize Anthropic usage format', () => {
      const usage = {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 25,
      };

      const normalized = client.testNormalizeUsage(usage);

      expect(normalized.inputTokens).toBe(100);
      expect(normalized.outputTokens).toBe(50);
      expect(normalized.cachedReadTokens).toBe(25);
      expect(normalized.cachedInputTokens).toBe(25);
    });

    it('should normalize AI SDK usage format', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
      };

      const normalized = client.testNormalizeUsage(usage);

      expect(normalized.inputTokens).toBe(100);
      expect(normalized.outputTokens).toBe(50);
    });

    it('should handle reasoning tokens', () => {
      const usage = {
        prompt_tokens: 100,
        completion_tokens: 50,
        completion_tokens_details: {
          reasoning_tokens: 25,
        },
      };

      const normalized = client.testNormalizeUsage(usage);

      expect(normalized.inputTokens).toBe(100);
      expect(normalized.outputTokens).toBe(50);
      expect(normalized.reasoningTokens).toBe(25);
    });

    it('should handle already normalized format', () => {
      const usage = {
        inputTokens: 100,
        outputTokens: 50,
        reasoningTokens: 25,
        cachedInputTokens: 10,
      };

      const normalized = client.testNormalizeUsage(usage);

      expect(normalized.inputTokens).toBe(100);
      expect(normalized.outputTokens).toBe(50);
      expect(normalized.reasoningTokens).toBe(25);
      expect(normalized.cachedInputTokens).toBe(10);
    });

    it('should handle missing fields with zeros', () => {
      const normalized = client.testNormalizeUsage({});

      expect(normalized.inputTokens).toBe(0);
      expect(normalized.outputTokens).toBe(0);
    });

    it('should handle undefined usage', () => {
      const normalized = client.testNormalizeUsage(undefined);

      expect(normalized.inputTokens).toBe(0);
      expect(normalized.outputTokens).toBe(0);
    });
  });

  describe('Client Methods', () => {
    it('should return model name', () => {
      expect(client.getModel()).toBe('test-model');
    });

    it('should be extensible for custom clients', () => {
      class CustomClient extends TestLLMClient {
        customMethod(): string {
          return 'custom';
        }
      }

      const custom = new CustomClient('custom-model');
      expect(custom.customMethod()).toBe('custom');
    });
  });

  describe('withRetry', () => {
    let sleepMock: any;

    beforeEach(() => {
      // Mock sleep to avoid delays in retry tests
      sleepMock = vi.spyOn(TestLLMClient.prototype, 'sleep').mockResolvedValue();
    });

    afterEach(() => {
      sleepMock?.mockRestore();
    });

    it('should return result immediately on success', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await client.testWithRetry(fn);

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry until success', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('rate_limit: Try again');
        }
        return 'success';
      };

      const result = await client.testWithRetry(fn);

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      const fn = async () => {
        throw new Error('rate_limit: Always fails');
      };

      await expect(client.testWithRetry(fn)).rejects.toThrow();
    });
  });
});
