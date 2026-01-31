/**
 * Unified LLM types for all providers
 * Extends @mimo/types with provider-specific enhancements
 */

import type { z } from 'zod';

/**
 * LLM provider types
 */
export type LLMProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  | 'cerebras'
  | 'groq'
  | 'zai';

/**
 * Model string parsing result
 */
export interface ModelString {
  provider: LLMProviderType;
  model: string;
  fullString: string; // e.g., "anthropic/claude-3-5-sonnet"
}

/**
 * Enhanced token usage statistics
 * Unified format across all providers (for internal use)
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  // Anthropic cache tokens
  cachedReadTokens?: number;
  cachedCreationTokens?: number;
  // OpenAI o1/o3 reasoning tokens
  reasoningTokens?: number;
}

/**
 * Stream usage format (matches LLMResponse.usage)
 */
export interface StreamUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
}

/**
 * SSE format stream event
 */
export interface StreamEvent {
  type: 'data' | 'error' | 'end';
  content?: string;
  delta?: string;
  usage?: StreamUsage;
  toolCall?: ToolCallEvent;
  error?: string;
}

/**
 * Tool call event
 */
export interface ToolCallEvent {
  id: string;
  name: string;
  arguments: string;
  status: 'start' | 'delta' | 'done';
}

/**
 * Structured output options
 */
export interface StructuredOutputOptions<T> {
  schema: z.ZodType<T>;
  name?: string;
  description?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * LLM error base class
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: LLMProviderType,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends LLMError {
  constructor(
    provider: LLMProviderType,
    public retryAfter?: number
  ) {
    super('Rate limit exceeded', provider, 'rate_limit', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends LLMError {
  constructor(provider: LLMProviderType, public timeout: number) {
    super(`Request timeout after ${timeout}ms`, provider, 'timeout', 408);
    this.name = 'TimeoutError';
  }
}

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsCaching: boolean;
  supportsThinking: boolean;
  maxTokens: number;
}
