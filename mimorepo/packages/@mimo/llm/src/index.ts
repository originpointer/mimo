/**
 * @mimo/llm - Enhanced language model integration
 *
 * This package provides:
 * - LLMClient: Enhanced base class with retry logic and streaming
 * - LLMProvider: Factory with automatic provider detection
 * - Multiple client implementations (AI SDK, OpenAI, Anthropic, Google, Ollama)
 * - Unified type system and utilities
 */

// Core classes
export { LLMClient } from './client.js';
export { LLMProvider, OpenAIClient, AnthropicClient, GoogleClient, OllamaClient, AISdkClient, AIGatewayClient } from './provider.js';

// Types
export * from './types.js';

// Utilities
export { parseModelString, getModelCapabilities } from './utils/parser.js';

// Re-export from @mimo/types for convenience
export type {
  ClientOptions,
  ChatMessage,
  ChatCompletionOptions,
  LLMResponse,
  LLMStreamChunk,
} from '@mimo/types';
