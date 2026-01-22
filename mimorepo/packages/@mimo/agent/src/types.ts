/**
 * MimoAgent Types
 */

import type { ModelConfiguration } from '@mimo/types';

/**
 * Agent configuration
 */
export interface AgentConfig {
  model?: ModelConfiguration;
  executionModel?: ModelConfiguration;
  systemPrompt?: string;
  mode?: 'dom' | 'hybrid' | 'cua';
  cua?: boolean;
  integrations?: string[];
}

/**
 * Agent execute options
 */
export interface AgentExecuteOptions {
  instruction: string;
  maxSteps?: number;
  highlightCursor?: boolean;
}

/**
 * Agent action
 */
export interface AgentAction {
  type: string;
  reasoning?: string;
  taskCompleted?: boolean;
  action?: string;
  timeMs?: number;
  pageText?: string;
  pageUrl?: string;
  instruction?: string;
}

/**
 * Agent result
 */
export interface AgentResult {
  success: boolean;
  message: string;
  actions: AgentAction[];
  completed: boolean;
  metadata?: Record<string, unknown>;
  usage?: AgentUsage;
}

/**
 * Agent usage statistics
 */
export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  inferenceTimeMs: number;
}

/**
 * Agent stream event
 */
export interface AgentStreamEvent {
  type: 'start' | 'action' | 'thinking' | 'finish' | 'error';
  data?: {
    action?: AgentAction;
    reasoning?: string;
    error?: string;
    result?: AgentResult;
  };
}

/**
 * Agent errors
 */
export class MimoAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MimoAgentError';
  }
}

export class MimoAgentTimeoutError extends MimoAgentError {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'MimoAgentTimeoutError';
  }
}

export class MimoAgentMaxStepsError extends MimoAgentError {
  constructor(message: string, public maxSteps: number) {
    super(message);
    this.name = 'MimoAgentMaxStepsError';
  }
}

export class MimoAgentExecutionError extends MimoAgentError {
  constructor(message: string, public step: number, public action: string) {
    super(message);
    this.name = 'MimoAgentExecutionError';
  }
}
