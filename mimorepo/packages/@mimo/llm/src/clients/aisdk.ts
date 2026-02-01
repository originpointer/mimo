/**
 * Vercel AI SDK wrapper
 * Unified streaming interface across OpenAI, Anthropic, and Google
 */

import { LLMClient } from '../client.js';
import type { ChatMessage, LLMResponse, LLMStreamChunk } from '@mimo/types';
import type { LLMProviderType } from '../types.js';

// Core types from @mimo/agent-core
// Note: LLMProvider is an enum (runtime value), not just a type
import { LLMProvider, type ModelCapability } from '@mimo/agent-core';

// Zod schema types from @mimo/types
import type { StagehandZodSchema, InferStagehandSchema } from '@mimo/types';

export class AISdkClient extends LLMClient implements ILLMClient {
  private aiModel: any;
  private providerType: LLMProviderType;

  constructor(model: string, options?: { apiKey?: string; baseURL?: string }) {
    super(model, options);

    const parts = model.split('/');
    const provider = parts[0] || 'openai';
    const modelName = parts.slice(1).join('/') || model;
    this.providerType = provider as LLMProviderType;

    // Dynamically import AI SDK modules to avoid build issues
    this.initializeAIModel(provider, modelName, options);
  }

  get provider(): LLMProvider {
    // Map LLMProviderType to LLMProvider enum
    switch (this.providerType) {
      case 'openai': return LLMProvider.OPENAI;
      case 'anthropic': return LLMProvider.ANTHROPIC;
      case 'google': return LLMProvider.GOOGLE;
      case 'gateway': return LLMProvider.OPENAI;
      default: return LLMProvider.OPENAI;
    }
  }

  get capabilities(): ModelCapability {
    return {
      supportsCaching: false,
      supportsThinking: this.providerType === 'openai' && (this.model.includes('o1') || this.model.includes('o3')),
      maxContext: 128000,
      supportsStructuredOutput: true,
      supportsStreaming: true,
    };
  }

  getProviderType(): LLMProviderType {
    return this.providerType;
  }

  // ILLMClient interface methods
  async complete<T = any>(
    options: import('@mimo/agent-core').ChatCompletionOptions
  ): Promise<import('@mimo/agent-core').ChatCompletionResponse<T>> {
    // Convert BaseMessage to ChatMessage if needed
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
    // Import at runtime to avoid bundling issues
    const { generateText } = await import('ai');

    const result = await generateText({
      model: this.aiModel,
      messages: this.formatMessages(messages),
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });

    return {
      content: result.text,
      usage: {
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
      },
      model: this.model,
    };
  }

  protected async *doStreamChatCompletion(
    messages: ChatMessage[],
    options?: any
  ): AsyncGenerator<LLMStreamChunk> {
    // Import at runtime to avoid bundling issues
    const { streamText } = await import('ai');

    const result = await streamText({
      model: this.aiModel,
      messages: this.formatMessages(messages),
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });

    for await (const chunk of result.textStream) {
      yield {
        content: chunk,
        delta: { content: chunk },
      };
    }

    const usage = await result.usage;
    yield {
      content: '',
      usage: {
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
      },
    };
  }

  protected async doGenerateStructure<T>(
    messages: ChatMessage[],
    schema: StagehandZodSchema<T>
  ): Promise<InferStagehandSchema<T>> {
    // Import at runtime to avoid bundling issues
    const { generateObject } = await import('ai');

    const result = await generateObject({
      model: this.aiModel,
      messages: this.formatMessages(messages),
      schema: schema,
    });

    return result.object;
  }

  private async initializeAIModel(
    provider: string,
    modelName: string,
    options?: { apiKey?: string; baseURL?: string }
  ): Promise<void> {
    switch (provider) {
      case 'openai': {
        const { createOpenAI } = await import('@ai-sdk/openai');
        const openai = createOpenAI({ apiKey: options?.apiKey });
        this.aiModel = openai(modelName);
        break;
      }
      case 'anthropic': {
        const { createAnthropic } = await import('@ai-sdk/anthropic');
        const anthropic = createAnthropic({ apiKey: options?.apiKey });
        this.aiModel = anthropic(modelName);
        break;
      }
      case 'google': {
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const google = createGoogleGenerativeAI({ apiKey: options?.apiKey });
        this.aiModel = google(modelName);
        break;
      }
      default:
        throw new Error(`Unsupported provider for AI SDK: ${provider}`);
    }
  }

  private formatMessages(messages: ChatMessage[]): any[] {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      return {
        role: msg.role,
        content: msg.content.map(c => {
          if (c.type === 'image') {
            const imageUrl = typeof c.image === 'string' ? c.image : c.image?.url;
            if (!imageUrl) {
              return { type: 'text', text: c.text || '' };
            }
            return {
              type: 'image',
              image: imageUrl,
            };
          }
          return { type: 'text', text: c.text || '' };
        }),
      };
    });
  }
}

/**
 * ILLMClient interface from @mimo/agent-core for type checking
 */
interface ILLMClient {
  readonly provider: import('@mimo/agent-core').LLMProvider;
  readonly model: string;
  readonly capabilities: import('@mimo/agent-core').ModelCapability;
  complete<T = any>(
    options: import('@mimo/agent-core').ChatCompletionOptions
  ): Promise<import('@mimo/agent-core').ChatCompletionResponse<T>>;
  stream<T = any>(
    options: import('@mimo/agent-core').ChatCompletionOptions
  ): AsyncIterable<import('@mimo/agent-core').ChatCompletionResponse<T>>;
  supports(capability: keyof import('@mimo/agent-core').ModelCapability): boolean;
}
