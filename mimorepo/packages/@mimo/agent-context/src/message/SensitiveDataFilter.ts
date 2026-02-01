import type { BaseMessage } from '@mimo/agent-core';

export class SensitiveDataFilter {
  private sensitiveData: Map<string, unknown> = new Map();

  setSensitiveData(data: Map<string, unknown>): void {
    this.sensitiveData = data;
  }

  clear(): void {
    this.sensitiveData.clear();
  }

  filterMessage(message: BaseMessage): BaseMessage {
    if (!this.sensitiveData || this.sensitiveData.size === 0) return message;

    const sensitiveValues = this.extractSensitiveValues();

    if (typeof message.content === 'string') {
      return {
        ...message,
        content: this.replaceSensitiveValues(message.content, sensitiveValues),
      };
    }

    return {
      ...message,
      content: message.content.map((c) => ({
        ...c,
        value: this.replaceSensitiveValues(c.value, sensitiveValues),
      })),
    };
  }

  filterMessages(messages: BaseMessage[]): BaseMessage[] {
    return messages.map((m) => this.filterMessage(m));
  }

  private extractSensitiveValues(): Record<string, string> {
    const values: Record<string, string> = {};

    for (const [key, content] of this.sensitiveData) {
      if (typeof content === 'object' && content !== null) {
        for (const [subKey, val] of Object.entries(content as Record<string, unknown>)) {
          if (typeof val === 'string' && val.length > 0) values[subKey] = val;
        }
      } else if (typeof content === 'string' && content.length > 0) {
        values[key] = content;
      }
    }

    return values;
  }

  private replaceSensitiveValues(content: string, sensitiveValues: Record<string, string>): string {
    let result = content;

    for (const [key, val] of Object.entries(sensitiveValues)) {
      // Guard against very short secrets to reduce false positives.
      if (val.length < 4) continue;
      const escapedVal = this.escapeRegExp(val);
      result = result.replace(new RegExp(escapedVal, 'g'), `<secret>${key}</secret>`);
    }

    return result;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

