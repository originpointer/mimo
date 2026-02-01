/**
 * Unified LLM types for all providers
 * Re-exports from @mimo/agent-core for convenience
 * Defines @mimo/llm specific types
 */

import type { z } from 'zod';

// 从 agent-core 重新导出常用类型（便捷访问）
// Note: LLMProvider enum is intentionally omitted here to avoid conflict with the LLMProvider class.
// Import it as CoreLLMProvider from the main index.ts or directly from @mimo/agent-core.
export type {
  TokenUsage,
  ModelCapability,
  ChatCompletionOptions,
  ChatCompletionResponse,
  BaseMessage,
} from '@mimo/agent-core';

/**
 * LLM provider types (internal use)
 */
export type LLMProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  | 'cerebras'
  | 'groq'
  | 'zai'
  | 'gateway';

/**
 * Model string parsing result
 */
export interface ModelString {
  provider: LLMProviderType;
  model: string;
  fullString: string; // e.g., "anthropic/claude-3-5-sonnet"
}

/**
 * SSE format stream event (llm package specific)
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
 * Stream usage format (llm package specific)
 * Matches the internal format used by streaming responses
 */
export interface StreamUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  cachedReadTokens?: number;
  cachedCreationTokens?: number;
  cachedInputTokens?: number;
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
 * Structured output options
 */
export interface StructuredOutputOptions<T> {
  schema: z.ZodType<T>;
  name?: string;
  description?: string;
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
 * Model capabilities (legacy, use ModelCapability from agent-core)
 * @deprecated Use ModelCapability from @mimo/agent-core
 */
export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsCaching: boolean;
  supportsThinking: boolean;
  maxTokens: number;
}
