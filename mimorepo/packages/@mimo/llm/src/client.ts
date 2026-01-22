/**
 * LLMClient - Base class for LLM clients
 */

import type {
  ChatMessage,
  ChatCompletionOptions,
  LLMResponse,
  LLMStreamChunk,
  StagehandZodSchema,
  InferStagehandSchema,
} from '@mimo/types';

/**
 * Abstract base class for LLM clients
 */
export abstract class LLMClient {
  constructor(
    protected model: string,
    protected options?: {
      apiKey?: string;
      baseURL?: string;
      timeout?: number;
      maxRetries?: number;
    }
  ) {}

  /**
   * Execute chat completion
   */
  abstract chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<LLMResponse>;

  /**
   * Stream chat completion
   */
  abstract streamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<LLMStreamChunk>;

  /**
   * Generate structured output
   */
  abstract generateStructure<T>(
    messages: ChatMessage[],
    schema: StagehandZodSchema<T>
  ): Promise<InferStagehandSchema<T>>;

  /**
   * Get model name
   */
  getModel(): string {
    return this.model;
  }
}
