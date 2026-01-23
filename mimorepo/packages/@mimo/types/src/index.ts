/**
 * Mimo Types - Shared type definitions
 *
 * This file re-exports all types from their respective modules.
 */

// Model types
export type { ModelConfiguration } from './model.js';

// Error types
export { MimoErrorCode } from './error.js';

// Command types
export { CommandType, type MimoCommand } from './command.js';

// Response types
export { StreamEventType, type MimoResponse, type MimoStreamEvent } from './response.js';

// Event types
export { BusEvent, CoreEvent } from './events.js';
export type { BusEventPayloads, CoreEventPayloads } from './events.js';

// Bus types
export type { MimoBusOptions, TabInfo } from './bus.js';

// Context types
export type {
  RemoteResponse,
  NavigateOptions,
  ScreenshotOptions,
  ClickOptions,
  FillOptions,
  LocatorOptions,
  EvaluateHandler,
  PageContent,
  ElementInfo,
} from './context.js';

// Re-export Action from core (selector is optional)
export type { Action } from './core.js';

// LLM types
export type {
  ClientOptions,
  ChatMessage,
  ChatCompletionOptions,
  LLMResponse,
  LLMStreamChunk,
  StagehandZodSchema,
  InferStagehandSchema,
} from './llm.js';

// Agent types
export type {
  AgentConfig,
  AgentExecuteOptions,
  AgentAction,
  AgentResult,
  AgentUsage,
  AgentStreamEvent,
} from './agent.js';

// Core types
export type {
  LogLine,
  ActOptions,
  ActResult,
  NavigateResult,
  ExtractOptions,
  ExtractResult,
  ObserveOptions,
  HistoryEntry,
  MimoMetrics,
  MimoOptions,
} from './core.js';
