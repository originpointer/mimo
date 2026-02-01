/**
 * LLMClient - Enhanced base class for LLM clients
 * Adds retry logic, token tracking, and streaming support
 *
 * Note: Subclasses should implement ILLMClient interface from @mimo/agent-core
 */

// 从 agent-core 导入核心类型（不包括消息类型）
import type {
  TokenUsage as CoreTokenUsage,
  LLMProvider,
  ModelCapability,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from '@mimo/agent-core';

// 从 @mimo/types 导入消息类型（保持与 AI SDK 兼容）
import type {
  ChatMessage,
  ChatCompletionOptions as TypesChatCompletionOptions,
  LLMResponse,
  LLMStreamChunk,
  StagehandZodSchema,
  InferStagehandSchema,
} from '@mimo/types';

// 内部类型
import type { StreamEvent, StreamUsage, LLMProviderType, RetryConfig } from './types.js';

// 为了兼容性
type TokenUsage = CoreTokenUsage;

/**
 * Enhanced abstract base class for LLM clients
 *
 * Note: This class provides base functionality. Subclasses should implement
 * ILLMClient interface from @mimo/agent-core which requires BaseMessage.
 * This class uses ChatMessage from @mimo/types for AI SDK compatibility.
 */
export abstract class LLMClient {
  protected retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['rate_limit', 'timeout', 'server_error'],
  };

  constructor(
    protected _model: string,
    protected options?: {
      apiKey?: string;
      baseURL?: string;
      timeout?: number;
      maxRetries?: number;
    }
  ) {
    // Override retry config if provided
    if (options?.maxRetries !== undefined) {
      this.retryConfig.maxRetries = options.maxRetries;
    }
  }

  /**
   * Get provider type
   */
  abstract getProviderType(): LLMProviderType;

  /**
   * Get model name
   */
  get model(): string {
    return this._model;
  }

  /**
   * Get model name (backward compatibility)
   * @deprecated Use the `model` property instead
   */
  getModel(): string {
    return this._model;
  }

  /**
   * Execute chat completion with retry logic
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: TypesChatCompletionOptions
  ): Promise<LLMResponse> {
    return this.withRetry(async () => {
      const response = await this.doChatCompletion(messages, options);

      return {
        ...response,
        usage: this.normalizeUsage(response.usage),
      };
    });
  }

  /**
   * Stream chat completion (SSE format)
   */
  async *streamChatCompletion(
    messages: ChatMessage[],
    options?: TypesChatCompletionOptions
  ): AsyncGenerator<StreamEvent> {
    try {
      const stream = this.doStreamChatCompletion(messages, options);

      for await (const chunk of stream) {
        yield {
          type: 'data',
          content: chunk.content,
          delta: chunk.delta?.content,
          usage: chunk.usage ? this.normalizeStreamUsage(chunk.usage) : undefined,
        };
      }

      yield { type: 'end' };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate structured output
   */
  async generateStructure<T>(
    messages: ChatMessage[],
    schema: StagehandZodSchema<T>
  ): Promise<InferStagehandSchema<T>> {
    return this.withRetry(async () => {
      return this.doGenerateStructure(messages, schema);
    });
  }

  /**
   * Abstract methods to implement
   */
  protected abstract doChatCompletion(
    messages: ChatMessage[],
    options?: TypesChatCompletionOptions
  ): Promise<LLMResponse>;

  protected abstract doStreamChatCompletion(
    messages: ChatMessage[],
    options?: TypesChatCompletionOptions
  ): AsyncGenerator<LLMStreamChunk>;

  protected abstract doGenerateStructure<T>(
    messages: ChatMessage[],
    schema: StagehandZodSchema<T>
  ): Promise<InferStagehandSchema<T>>;

  /**
   * Retry logic with exponential backoff
   */
  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryable(error) || attempt === this.retryConfig.maxRetries) {
          throw error;
        }

        // Wait before retry
        await this.sleep(delay);
        delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  protected isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      return this.retryConfig.retryableErrors.some(code =>
        error.message.toLowerCase().includes(code)
      );
    }
    return false;
  }

  /**
   * Normalize token usage across providers
   */
  protected normalizeUsage(usage: any): { inputTokens: number; outputTokens: number; reasoningTokens?: number; cachedInputTokens?: number } {
    if (!usage) {
      return { inputTokens: 0, outputTokens: 0 };
    }

    return {
      inputTokens: usage.inputTokens || usage.input_tokens || usage.prompt_tokens || usage.promptTokens || 0,
      outputTokens: usage.outputTokens || usage.output_tokens || usage.completion_tokens || usage.completionTokens || 0,
      reasoningTokens: usage.reasoningTokens || usage.reasoning_tokens || usage.completion_tokens_details?.reasoning_tokens,
      cachedInputTokens: usage.cachedReadTokens || usage.cachedInputTokens || usage.cache_read_input_tokens || usage.cache_read_tokens || usage.cache_creation_input_tokens,
    };
  }

  /**
   * Normalize stream usage
   */
  protected normalizeStreamUsage(usage: any): StreamUsage {
    return this.normalizeUsage(usage) as StreamUsage;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
