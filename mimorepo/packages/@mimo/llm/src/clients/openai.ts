/**
 * OpenAI direct SDK client
 * Supports: GPT-4o, o1, o3 series
 */

import OpenAI from 'openai';
import { LLMClient } from '../client.js';
import type { ChatMessage, LLMResponse, LLMStreamChunk } from '@mimo/types';
import type { LLMProviderType } from '../types.js';

// Core types from @mimo/agent-core
// Note: LLMProvider is an enum (runtime value), not just a type
import { LLMProvider, type ModelCapability } from '@mimo/agent-core';

export class OpenAIClient extends LLMClient {
  private client: OpenAI;

  constructor(model: string, options?: { apiKey?: string; baseURL?: string }) {
    super(model, options);
    this.client = new OpenAI({
      apiKey: options?.apiKey || (globalThis as any).process?.env?.OPENAI_API_KEY,
      baseURL: options?.baseURL,
    });
  }

  get provider(): LLMProvider {
    return LLMProvider.OPENAI;
  }

  get capabilities(): ModelCapability {
    const isO1O3 = this.model.startsWith('o1') || this.model.startsWith('o3');
    return {
      supportsCaching: false,
      supportsThinking: isO1O3,
      maxContext: 128000,
      supportsStructuredOutput: true,
      supportsStreaming: true,
    };
  }

  getProviderType(): LLMProviderType {
    return 'openai';
  }

  // ILLMClient interface methods
  async complete<T = any>(
    options: import('@mimo/agent-core').ChatCompletionOptions
  ): Promise<import('@mimo/agent-core').ChatCompletionResponse<T>> {
    // Convert BaseMessage to ChatMessage
    const chatMessages: ChatMessage[] = options.messages.map(msg => ({
      role: msg.role,
      content: msg.content as string, // Simplified conversion
    }));

    const response = await this.chatCompletion(chatMessages, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    } as any);

    return {
      content: response.content,
      usage: response.usage as any,
      model: response.model,
      finishReason: 'stop',
    } as any;
  }

  async *stream<T = any>(
    options: import('@mimo/agent-core').ChatCompletionOptions
  ): AsyncIterable<import('@mimo/agent-core').ChatCompletionResponse<T>> {
    const chatMessages: ChatMessage[] = options.messages.map(msg => ({
      role: msg.role,
      content: msg.content as string,
    }));

    const stream = this.streamChatCompletion(chatMessages, {
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    } as any);

    for await (const chunk of stream) {
      if (chunk.type === 'data') {
        yield {
          content: chunk.content || '',
          usage: chunk.usage,
          model: this.model,
          finishReason: 'stop',
        } as any;
      }
    }
  }

  supports(capability: keyof import('@mimo/agent-core').ModelCapability): boolean {
    return this.capabilities?.[capability] ?? false;
  }

  protected async doChatCompletion(
    messages: ChatMessage[],
    options?: any
  ): Promise<LLMResponse> {
    const isO1O3 = this.model.startsWith('o1') || this.model.startsWith('o3');

    const params: any = {
      model: this.model,
      messages: this.formatMessages(messages),
    };

    // o1/o3 models don't support temperature
    if (!isO1O3) {
      params.temperature = options?.temperature ?? 0.7;
      params.max_tokens = options?.maxTokens ?? 4096;
      params.top_p = options?.topP;
      params.stop = options?.stop;
    }

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];

    if (!choice) {
      throw new Error('No choice returned from OpenAI');
    }

    return {
      content: choice.message.content || '',
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        reasoningTokens: response.usage?.completion_tokens_details?.reasoning_tokens,
        cachedInputTokens: undefined,
      },
      model: response.model,
    };
  }

  protected async *doStreamChatCompletion(
    messages: ChatMessage[],
    options?: any
  ): AsyncGenerator<LLMStreamChunk> {
    const params: any = {
      model: this.model,
      messages: this.formatMessages(messages),
      stream: true,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    };

    const stream = await this.client.chat.completions.create(params) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        yield {
          content: delta.content,
          delta: { content: delta.content },
        };
      }

      if (chunk.usage) {
        yield {
          content: '',
          usage: {
            inputTokens: chunk.usage.prompt_tokens,
            outputTokens: chunk.usage.completion_tokens,
          },
        };
      }
    }
  }

  protected async doGenerateStructure<T>(
    messages: ChatMessage[],
    schema: any
  ): Promise<any> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: this.formatMessages(messages),
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'structured_output',
          schema: this.zodToJsonSchema(schema),
        },
      },
    });

    const choice = response.choices[0];
    const content = choice?.message.content || '{}';
    return JSON.parse(content);
  }

  private formatMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { role: msg.role as any, content: msg.content };
      }
      return {
        role: msg.role as any,
        content: msg.content.map(c => {
          if (c.type === 'image') {
            const imageUrl = typeof c.image === 'string' ? c.image : c.image?.url;
            if (!imageUrl) {
              return { type: 'text', text: c.text || '' };
            }
            return {
              type: 'image_url',
              image_url: { url: imageUrl },
            };
          }
          return { type: 'text', text: c.text || '' };
        }),
      };
    });
  }

  private zodToJsonSchema(schema: any): any {
    // Use zod-to-json-schema or implement simple converter
    return (schema as any)._def?.schema || schema;
  }
}
