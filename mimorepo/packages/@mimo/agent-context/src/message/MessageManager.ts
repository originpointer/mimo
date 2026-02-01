import type { BaseMessage } from '@mimo/agent-core';
import type { MessageHistoryOptions } from './types.js';

export class MessageManager {
  private options: Required<MessageHistoryOptions>;
  private history: BaseMessage[] = [];

  constructor(options: MessageHistoryOptions = {}) {
    this.options = {
      maxHistoryItems: options.maxHistoryItems ?? 50,
      maxContentSize: options.maxContentSize ?? 60_000,
      omitMiddleStrategy: options.omitMiddleStrategy ?? true,
    };
  }

  addMessage(message: BaseMessage): void {
    this.history.push(this.truncateMessage(message));
  }

  addMessages(messages: BaseMessage[]): void {
    for (const m of messages) this.addMessage(m);
  }

  getMessages(): BaseMessage[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
  }

  /**
   * Render history as a compact text transcript.
   * Useful for models that do not accept native message arrays, or for debugging.
   */
  getHistoryDescription(): string {
    const items = this.applyOmitMiddle(this.history);
    return items.map((m) => this.formatMessage(m)).join('\n');
  }

  private applyOmitMiddle(history: BaseMessage[]): BaseMessage[] {
    if (!this.options.omitMiddleStrategy) return history;
    const max = this.options.maxHistoryItems;
    if (!max || history.length <= max) return history;

    // Keep first + last (max-1) items.
    const omittedCount = history.length - max;
    const recentCount = max - 1;
    const head = history.slice(0, 1);
    const tail = history.slice(history.length - recentCount);

    const marker: BaseMessage = {
      role: history[0]?.role ?? ('system' as any),
      content: `<sys>[... ${omittedCount} previous steps omitted...]</sys>`,
    };

    return [...head, marker, ...tail];
  }

  private truncateMessage(message: BaseMessage): BaseMessage {
    const max = this.options.maxContentSize;
    if (!max) return message;

    if (typeof message.content === 'string') {
      if (message.content.length <= max) return message;
      return {
        ...message,
        content:
          message.content.substring(0, max) +
          `\n... [Content truncated at ${max} characters]`,
      };
    }

    // Array content: truncate each block value
    const truncated = message.content.map((c) => {
      const v = c.value ?? '';
      if (v.length <= max) return c;
      return { ...c, value: v.substring(0, max) + '...[truncated]' };
    });

    return { ...message, content: truncated };
  }

  private formatMessage(message: BaseMessage): string {
    const role = String(message.role);
    const content =
      typeof message.content === 'string'
        ? message.content
        : message.content.map((c) => c.value).join('');
    return `${role}: ${content}`;
  }
}

