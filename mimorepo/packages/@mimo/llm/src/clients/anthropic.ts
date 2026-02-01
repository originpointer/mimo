/**
 * Anthropic direct SDK client
 * Supports: Claude 3.5 Sonnet, Claude Opus 4.5, Claude Haiku
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMClient } from '../client.js';
import type { ChatMessage, LLMResponse, LLMStreamChunk } from '@mimo/types';
import type { LLMProviderType } from '../types.js';
import { getModelCapabilities } from '../utils/parser.js';

// Core types from @mimo/agent-core
// Note: LLMProvider is an enum (runtime value), not just a type
import { LLMProvider, type ModelCapability } from '@mimo/agent-core';

export class AnthropicClient extends LLMClient {
  private client: Anthropic;

  constructor(model: string, options?: { apiKey?: string; baseURL?: string }) {
    super(model, options);
    this.client = new Anthropic({
      apiKey: options?.apiKey || (globalThis as any).process?.env?.ANTHROPIC_API_KEY,
      baseURL: options?.baseURL,
    });
  }

  get provider(): LLMProvider {
    return LLMProvider.ANTHROPIC;
  }

  get capabilities(): ModelCapability {
    const modelCaps = getModelCapabilities(this.model);
    return {
      supportsCaching: modelCaps.supportsCaching ?? false,
      supportsThinking: modelCaps.supportsThinking ?? false,
      maxContext: modelCaps.maxTokens ?? 200000,
      supportsStructuredOutput: true,
      supportsStreaming: true,
    };
  }

  getProviderType(): LLMProviderType {
    return 'anthropic';
  }

  protected async doChatCompletion(
    messages: ChatMessage[],
    options?: any
  ): Promise<LLMResponse> {
    const { systemMessages, userMessages } = this.splitMessages(messages);

    const params: any = {
      model: this.model,
      messages: this.formatMessages(userMessages),
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature,
    };

    if (systemMessages.length > 0) {
      params.system = systemMessages.map(m => m.content).join('\n\n');
    }

    // Enable caching for Claude 4.5+ with large prompts
    const capabilities = getModelCapabilities(this.model);
    if (capabilities.supportsCaching && this.shouldEnableCache(messages)) {
      params.system = [{ type: 'text', text: params.system, cache_control: { type: 'ephemeral' } }];
    }

    const response = await this.client.messages.create(params);

    const cacheReadTokens = (response.usage as any).cache_read_input_tokens as number | undefined;
    const cacheCreationTokens = (response.usage as any).cache_creation_input_tokens as number | undefined;

    return {
      content: this.extractTextContent(response.content),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        reasoningTokens: undefined,
        cachedReadTokens: cacheReadTokens,
        cachedCreationTokens: cacheCreationTokens,
        cachedInputTokens:
          cacheReadTokens || cacheCreationTokens
            ? (cacheReadTokens ?? 0) + (cacheCreationTokens ?? 0)
            : undefined,
      },
      model: response.model,
    };
  }

  protected async *doStreamChatCompletion(
    messages: ChatMessage[],
    options?: any
  ): AsyncGenerator<LLMStreamChunk> {
    const { systemMessages, userMessages } = this.splitMessages(messages);

    const stream = await this.client.messages.create({
      model: this.model,
      messages: this.formatMessages(userMessages),
      system: systemMessages.map(m => m.content).join('\n\n'),
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield {
          content: event.delta.text,
          delta: { content: event.delta.text },
        };
      }

      if (event.type === 'message_stop') {
        // RawMessageStopEvent may have usage in a different property
        const stopEvent = event as Anthropic.RawMessageStopEvent & { message?: { usage?: Anthropic.Usage } };
        const usage = stopEvent.message?.usage;
        if (usage) {
          const cacheReadTokens = (usage as any).cache_read_input_tokens as number | undefined;
          const cacheCreationTokens = (usage as any).cache_creation_input_tokens as number | undefined;

          yield {
            content: '',
            usage: {
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens,
              cachedReadTokens: cacheReadTokens,
              cachedCreationTokens: cacheCreationTokens,
              cachedInputTokens:
                cacheReadTokens || cacheCreationTokens
                  ? (cacheReadTokens ?? 0) + (cacheCreationTokens ?? 0)
                  : undefined,
            },
          };
        }
      }
    }
  }

  protected async doGenerateStructure<T>(
    messages: ChatMessage[],
    schema: any
  ): Promise<any> {
    const toolSchema = this.zodToToolSchema(schema);

    const response = await this.client.messages.create({
      model: this.model,
      messages: this.formatMessages(messages),
      tools: [toolSchema],
      tool_choice: { type: 'tool', name: toolSchema.name },
      max_tokens: 4096,
    });

    const toolUse = response.content.find(block => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('No tool use in response');
    }

    return JSON.parse(toolUse.input as any);
  }

  private splitMessages(messages: ChatMessage[]) {
    const systemMessages = messages.filter(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    return { systemMessages, userMessages };
  }

  private formatMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: typeof msg.content === 'string' ? msg.content : msg.content.map(c => c.text || '').join(''),
    }));
  }

  private extractTextContent(content: Anthropic.ContentBlock[]): string {
    return content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');
  }

  private shouldEnableCache(messages: ChatMessage[]): boolean {
    // Enable cache for prompts >= 4096 tokens (rough estimate)
    const totalLength = JSON.stringify(messages).length;
    return totalLength >= 4096 * 4; // Rough token estimation
  }

  private zodToToolSchema(schema: any): any {
    // Convert Zod schema to Anthropic tool format
    const shape = (schema as any)._def?.shape || {};
    return {
      name: 'extract_structured_data',
      description: 'Extract structured data according to schema',
      input_schema: {
        type: 'object',
        properties: shape,
        required: Object.keys(shape),
      },
    };
  }
}
