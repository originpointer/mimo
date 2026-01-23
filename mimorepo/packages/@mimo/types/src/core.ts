/**
 * Core Types
 * Types for Mimo core functionality
 */

import type { ModelConfiguration } from './model.js';

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
 * Act result
 */
export interface ActResult {
  success: boolean;
  message: string;
  actionDescription: string;
  actions: Action[];
}

/**
 * Navigate result
 */
export interface NavigateResult {
  success: boolean;
  message: string;
  url: string;
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
 * Action structure (selector is optional for flexibility)
 */
export interface Action {
  selector?: string;
  description: string;
  method?: string;
  arguments?: string[];
}
