/**
 * LLMClient - Enhanced base class for LLM clients
 * Adds retry logic, token tracking, and streaming support
 *
 * Implements ILLMClient interface from @mimo/agent-core
 */

// 从 agent-core 导入核心类型
import type {
  LLMProvider,
  ModelCapability,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ILLMClient,
  BaseMessage,
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

/**
 * Enhanced abstract base class for LLM clients
 *
 * Note: This class provides base functionality. Subclasses should implement
 * ILLMClient interface from @mimo/agent-core which requires BaseMessage.
 * This class uses ChatMessage from @mimo/types for AI SDK compatibility.
 */
export abstract class LLMClient implements ILLMClient {
  protected retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['rate_limit', 'timeout', 'server_error'],
  };

  /**
   * Provider identifier (required by ILLMClient)
   */
  abstract readonly provider: LLMProvider;

  /**
   * Model capabilities (required by ILLMClient)
   */
  abstract readonly capabilities: ModelCapability;

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
   * Get provider type (internal)
   */
  abstract getProviderType(): LLMProviderType;

  /**
   * Get model name (required by ILLMClient)
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
   * ILLMClient interface: Non-streaming completion
   * Converts BaseMessage to ChatMessage for internal processing
   */
  async complete<T = any>(
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse<T>> {
    // Convert BaseMessage[] to ChatMessage[]
    const messages = this.convertToChatMessages(options.messages);
    const internalOptions: TypesChatCompletionOptions = {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stop: options.stopSequences,
    };

    const response = await this.chatCompletion(messages, internalOptions);

    // Convert LLMResponse to ChatCompletionResponse
    return {
      content: response.content,
      usage: {
        promptTokens: response.usage.inputTokens,
        completionTokens: response.usage.outputTokens,
        totalTokens: response.usage.inputTokens + response.usage.outputTokens,
        cachedReadTokens: response.usage.cachedInputTokens,
        reasoningTokens: response.usage.reasoningTokens,
      },
      model: response.model,
      finishReason: 'stop',
    };
  }

  /**
   * ILLMClient interface: Streaming completion
   * Converts BaseMessage to ChatMessage for internal processing
   */
  async *stream<T = any>(
    options: ChatCompletionOptions
  ): AsyncIterable<ChatCompletionResponse<T>> {
    // Convert BaseMessage[] to ChatMessage[]
    const messages = this.convertToChatMessages(options.messages);
    const internalOptions: TypesChatCompletionOptions = {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stop: options.stopSequences,
    };

    const stream = this.streamChatCompletion(messages, internalOptions);

    for await (const event of stream) {
      if (event.type === 'data' && event.content !== undefined) {
        yield {
          content: event.content,
          usage: {
            promptTokens: event.usage?.inputTokens ?? 0,
            completionTokens: event.usage?.outputTokens ?? 0,
            totalTokens: (event.usage?.inputTokens ?? 0) + (event.usage?.outputTokens ?? 0),
            cachedReadTokens: event.usage?.cachedInputTokens,
            reasoningTokens: event.usage?.reasoningTokens,
          },
          model: this._model,
          finishReason: 'stop',
        };
      }
    }
  }

  /**
   * ILLMClient interface: Check if model supports a capability
   */
  supports(capability: keyof ModelCapability): boolean {
    return !!this.capabilities[capability];
  }

  /**
   * Convert BaseMessage (agent-core) to ChatMessage (mimo/types)
   */
  protected convertToChatMessages(messages: BaseMessage[]): ChatMessage[] {
    return messages.map((msg): ChatMessage => {
      const role = msg.role.toLowerCase();

      // Handle string content
      if (typeof msg.content === 'string') {
        if (role === 'user') {
          return { role: 'user', content: msg.content };
        }
        if (role === 'assistant') {
          return { role: 'assistant', content: msg.content };
        }
        return { role: 'system', content: msg.content };
      }

      // Handle array content (multimodal) - only for user messages
      if (Array.isArray(msg.content)) {
        return {
          role: 'user',
          content: msg.content.map((item) => {
            if (item.type === 'text') {
              return { type: 'text', text: item.value };
            }
            if (item.type === 'image') {
              return {
                type: 'image',
                image: item.metadata?.url || item.value,
              };
            }
            return { type: 'text', text: item.value };
          }),
        };
      }

      // Fallback - convert to string
      const contentStr = String(msg.content);
      if (role === 'user') {
        return { role: 'user', content: contentStr };
      }
      if (role === 'assistant') {
        return { role: 'assistant', content: contentStr };
      }
      return { role: 'system', content: contentStr };
    });
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
