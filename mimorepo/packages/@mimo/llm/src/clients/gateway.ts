/**
 * Vercel AI Gateway Client
 * Unified access to all LLM providers through AI Gateway
 * Environment: AI_GATEWAY_API_KEY
 */

import { LLMClient } from '../client.js';
import type { ChatMessage, LLMResponse, LLMStreamChunk } from '@mimo/types';
import type { LLMProviderType } from '../types.js';

// Core types from @mimo/agent-core
// Note: LLMProvider is an enum (runtime value), not just a type
import { LLMProvider, type ModelCapability } from '@mimo/agent-core';

export class AIGatewayClient extends LLMClient {
  private providerType: LLMProviderType;

  constructor(model: string, options?: { apiKey?: string; baseURL?: string }) {
    super(model, options);

    // Extract provider from model string (e.g., "anthropic/claude-3-5-sonnet")
    const parts = model.split('/');
    this.providerType = (parts[0] || 'openai') as LLMProviderType;

    // AI Gateway picks up AI_GATEWAY_API_KEY automatically
    // Custom baseURL is not needed with gateway, but kept for fallback
    this.options = options;
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

  protected async doChatCompletion(
    messages: ChatMessage[],
    options?: any
  ): Promise<LLMResponse> {
    // Import at runtime to avoid bundling issues
    const { gateway } = await import('@ai-sdk/gateway');
    const { generateText } = await import('ai');

    const aiModel = gateway.languageModel(this.model);

    const result = await generateText({
      model: aiModel,
      messages: this.formatMessages(messages),
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
    });

    // Extract usage from AI SDK result
    const usage = result.usage;
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;

    return {
      content: result.text,
      usage: {
        inputTokens,
        outputTokens,
      },
      model: this.model,
    };
  }

  protected async *doStreamChatCompletion(
    messages: ChatMessage[],
    options?: any
  ): AsyncGenerator<LLMStreamChunk> {
    // Import at runtime to avoid bundling issues
    const { gateway } = await import('@ai-sdk/gateway');
    const { streamText } = await import('ai');

    const aiModel = gateway.languageModel(this.model);

    const result = await streamText({
      model: aiModel,
      messages: this.formatMessages(messages),
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
    });

    for await (const chunk of result.textStream) {
      yield {
        content: chunk,
        delta: { content: chunk },
      };
    }

    const usage = await result.usage;
    // Extract usage from AI SDK result
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;

    yield {
      content: '',
      usage: {
        inputTokens,
        outputTokens,
      },
    };
  }

  protected async doGenerateStructure<T>(
    messages: ChatMessage[],
    schema: any
  ): Promise<any> {
    // Import at runtime to avoid bundling issues
    const { gateway } = await import('@ai-sdk/gateway');
    const { generateObject } = await import('ai');

    const aiModel = gateway.languageModel(this.model);

    const result = await generateObject({
      model: aiModel,
      messages: this.formatMessages(messages),
      schema: schema,
    });

    return result.object;
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
