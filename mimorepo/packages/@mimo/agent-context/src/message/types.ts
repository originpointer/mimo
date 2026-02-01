import type { BaseMessage } from '@mimo/agent-core';

export interface MessageHistoryOptions {
  maxHistoryItems?: number;
  maxContentSize?: number;
  omitMiddleStrategy?: boolean;
}

export interface CompressOptions {
  /** Approximate max tokens to keep (estimation). */
  maxTokens: number;
  /** Keep ratio of maxTokens (default 0.8). */
  threshold?: number;
  /** Prefer dropping from start (keep latest). Default true. */
  keepLatest?: boolean;
}

export type MessageList = BaseMessage[];

