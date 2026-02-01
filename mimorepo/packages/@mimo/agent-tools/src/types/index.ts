/**
 * Type definitions for @mimo/agent-tools
 */

// Import tool extensions to apply module augmentation
import './tool-extensions.js';

// Re-export core types from agent-core for convenience
export type {
  ToolDefinition,
  ToolExecutionContext,
  ToolTag,
  SpecialInjectParam,
  FileSystem,
  BrowserSession,
  MemoryStore,
  Logger,
} from '@mimo/agent-core/types';

export type {
  IToolRegistry,
  ToolPolicy,
} from '@mimo/agent-core/interfaces';
