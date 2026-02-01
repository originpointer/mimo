/**
 * @mimo/llm - Enhanced language model integration
 *
 * This package provides:
 * - LLMClient: Enhanced base class with retry logic and streaming
 * - LLMProvider: Factory with automatic provider detection
 * - Multiple client implementations (AI SDK, OpenAI, Anthropic, Google, Ollama)
 * - Unified type system from @mimo/agent-core
 */

// Core classes
export { LLMClient } from './client.js';
export { LLMProvider, OpenAIClient, AnthropicClient, GoogleClient, OllamaClient, AISdkClient, AIGatewayClient } from './provider.js';

// Types (includes re-exports from @mimo/agent-core)
export * from './types.js';

// Utilities
export { parseModelString, getModelCapabilities } from './utils/parser.js';

// Re-export from @mimo/types for convenience (message types for AI SDK compatibility)
export type {
  ClientOptions,
  ChatMessage,
  LLMResponse,
  LLMStreamChunk,
  StagehandZodSchema,
  InferStagehandSchema,
} from '@mimo/types';

// Re-export from @mimo/agent-core (core type system)
export type {
  ILLMClient,
  LLMProvider as CoreLLMProvider,
  TokenUsage,
  ModelCapability,
  ChatCompletionOptions as CoreChatCompletionOptions,
  ChatCompletionResponse,
  BaseMessage,
  MessageRole,
} from '@mimo/agent-core';
