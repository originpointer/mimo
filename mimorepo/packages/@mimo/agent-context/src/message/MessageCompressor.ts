import type { BaseMessage } from '@mimo/agent-core';
import type { CompressOptions } from './types.js';

export class MessageCompressor {
  /**
   * Compress by dropping messages until under the estimated token budget.
   * Token estimation: \u2248 chars / 4 (rough, cross-language heuristic).
   */
  compress(messages: BaseMessage[], options: CompressOptions): BaseMessage[] {
    const threshold = options.threshold ?? 0.8;
    const keepLatest = options.keepLatest ?? true;

    const budget = Math.max(1, Math.floor(options.maxTokens * threshold));
    const estimate = (msgs: BaseMessage[]) => this.estimateTokens(msgs);

    if (estimate(messages) <= budget) return messages;

    const result = [...messages];
    while (result.length > 1 && estimate(result) > budget) {
      // Prefer dropping earliest messages (keep latest context).
      result.splice(keepLatest ? 0 : result.length - 1, 1);
    }
    return result;
  }

  estimateTokens(messages: BaseMessage[]): number {
    const chars = messages.reduce((sum, m) => sum + this.messageCharSize(m), 0);
    return Math.ceil(chars / 4);
  }

  private messageCharSize(message: BaseMessage): number {
    if (typeof message.content === 'string') return message.content.length;
    return message.content.reduce((sum, c) => sum + (c.value?.length ?? 0), 0);
  }
}

