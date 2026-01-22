/**
 * Mimo Core Types
 */

/**
 * Model configuration
 */
export type ModelConfiguration =
  | string
  | {
      modelName: string;
      apiKey?: string;
      baseURL?: string;
    };

/**
 * Log line structure
 */
export interface LogLine {
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  timestamp?: string;
}

/**
 * Act options
 */
export interface ActOptions {
  model?: ModelConfiguration;
  variables?: Record<string, string>;
  timeout?: number;
  tabId?: string;
}

/**
 * Action structure
 */
export interface Action {
  selector?: string;
  description: string;
  method?: string;
  arguments?: string[];
}

/**
 * Act result
 */
export interface ActResult {
  success: boolean;
  message: string;
  actionDescription: string;
  actions: Action[];
}

/**
 * Extract options
 */
export interface ExtractOptions {
  model?: ModelConfiguration;
  timeout?: number;
  selector?: string;
  tabId?: string;
}

/**
 * Extract result
 */
export interface ExtractResult<T = any> {
  extraction: T;
  success: boolean;
  message?: string;
}

/**
 * Observe options
 */
export interface ObserveOptions {
  model?: ModelConfiguration;
  timeout?: number;
  selector?: string;
  tabId?: string;
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

/**
 * History entry
 */
export interface HistoryEntry {
  method: 'act' | 'extract' | 'observe' | 'navigate' | 'agent';
  parameters: unknown;
  result: unknown;
  timestamp: string;
  commandId?: string;
  tabId?: string;
}

/**
 * Mimo metrics
 */
export interface MimoMetrics {
  actPromptTokens: number;
  actCompletionTokens: number;
  actInferenceTimeMs: number;

  extractPromptTokens: number;
  extractCompletionTokens: number;
  extractInferenceTimeMs: number;

  observePromptTokens: number;
  observeCompletionTokens: number;
  observeInferenceTimeMs: number;

  agentPromptTokens: number;
  agentCompletionTokens: number;
  agentInferenceTimeMs: number;

  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalInferenceTimeMs: number;
}

/**
 * Mimo options
 */
export interface MimoOptions {
  socket?: {
    url?: string;
    autoReconnect?: boolean;
    reconnectInterval?: number;
  };
  model?: ModelConfiguration;
  llmClient?: any;
  systemPrompt?: string;
  verbose?: 0 | 1 | 2;
  logger?: (logLine: LogLine) => void;
  cacheDir?: string;
  experimental?: boolean;
  commandTimeout?: number;
  selfHeal?: boolean;
  defaultTabId?: string;
}

/**
 * Mimo errors
 */
export class MimoError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MimoError';
  }
}

export class MimoInitError extends MimoError {
  constructor(message: string) {
    super(message, 'MIMO_INIT_ERROR');
    this.name = 'MimoInitError';
  }
}

export class MimoTimeoutError extends MimoError {
  constructor(message: string, public timeout: number) {
    super(message, 'MIMO_TIMEOUT');
    this.name = 'MimoTimeoutError';
  }
}

export class MimoNotConnectedError extends MimoError {
  constructor() {
    super('Not connected to MimoBus', 'MIMO_NOT_CONNECTED');
    this.name = 'MimoNotConnectedError';
  }
}

export class MimoCommandError extends MimoError {
  constructor(message: string, public commandId: string, public command: any) {
    super(message, 'MIMO_COMMAND_ERROR');
    this.name = 'MimoCommandError';
  }
}
