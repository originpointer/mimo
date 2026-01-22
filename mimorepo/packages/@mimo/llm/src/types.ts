/**
 * LLM Types
 */

import type { ModelConfiguration } from '@mimo/types';

export type { ModelConfiguration } from '@mimo/types';

/**
 * Client options
 */
export interface ClientOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Chat message
 */
export type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'system'; content: string }
  | {
      role: 'user';
      content: Array<{
        type: 'text' | 'image';
        text?: string;
        image?: string | { url: string };
      }>;
    };

/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
}

/**
 * LLM response
 */
export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
  };
  model: string;
}

/**
 * LLM stream chunk
 */
export interface LLMStreamChunk {
  content: string;
  delta?: {
    role?: string;
    content?: string;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Zod schema type
 */
export type StagehandZodSchema<T> = {
  _output: T;
  parse: (data: unknown) => T;
};

/**
 * Infer schema output type
 */
export type InferStagehandSchema<T> = T extends StagehandZodSchema<infer U> ? U : never;
