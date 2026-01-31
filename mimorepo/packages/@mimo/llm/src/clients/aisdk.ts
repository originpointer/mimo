/**
 * Vercel AI SDK wrapper
 * Unified streaming interface across OpenAI, Anthropic, and Google
 */

import { LLMClient } from '../client.js';
import type { ChatMessage, ChatCompletionOptions, LLMResponse, LLMStreamChunk } from '@mimo/types';
import type { LLMProviderType } from '../types.js';

export class AISdkClient extends LLMClient {
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

  getProviderType(): LLMProviderType {
    return this.providerType;
  }

  protected async doChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
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
    options?: ChatCompletionOptions
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
    schema: any
  ): Promise<any> {
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
