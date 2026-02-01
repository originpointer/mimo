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
import type { ToolExecutionContext, ToolSet } from '@mimo/agent-core/types';

// Zod schema types from @mimo/types
import type { StagehandZodSchema, InferStagehandSchema } from '@mimo/types';

export class AISdkClient extends LLMClient {
  private aiModel: any;
  protected providerType: LLMProviderType;
  private initializationPromise: Promise<void> | null = null;
  private modelName: string;
  protected options?: { apiKey?: string; baseURL?: string };

  constructor(model: string, options?: { apiKey?: string; baseURL?: string }) {
    super(model, options);

    const parts = model.split('/');
    const provider = parts[0] || 'openai';
    this.modelName = parts.slice(1).join('/') || model;
    this.providerType = provider as LLMProviderType;
    this.options = options;

    // Don't initialize immediately - use lazy initialization
    // to avoid unhandled promise rejections in tests
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeAIModel(
        this.providerType,
        this.modelName,
        this.options
      );
    }
    return this.initializationPromise;
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
    await this.ensureInitialized();

    // Import at runtime to avoid bundling issues
    const { generateText, tool: aiTool, stepCountIs } = await import('ai');

    const toolSet: ToolSet | undefined = options?.tools;
    const aiTools =
      toolSet && Object.keys(toolSet).length > 0
        ? Object.fromEntries(
            Object.entries(toolSet).map(([name, toolDef]) => [
              name,
              aiTool({
                description: (toolDef as any).description,
                inputSchema: (toolDef as any).parameters,
                execute: async (input: any, execOptions: any) => {
                  const baseCtx =
                    (execOptions as any)?.experimental_context ??
                    (options?.experimentalContext as ToolExecutionContext | undefined) ??
                    {};
                  const ctx = {
                    ...(baseCtx as any),
                    metadata: {
                      ...((baseCtx as any)?.metadata ?? {}),
                      toolCallId: (execOptions as any)?.toolCallId,
                    },
                  } as ToolExecutionContext;
                  return await (toolDef as any).execute(input, ctx);
                },
              }),
            ])
          )
        : undefined;

    const result = await generateText({
      model: this.aiModel,
      messages: this.formatMessages(messages),
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      tools: aiTools,
      toolChoice: options?.toolChoice,
      // AI SDK: used only for tool execution; not forwarded to provider.
      experimental_context: options?.experimentalContext,
      providerOptions: options?.providerOptions,
      stopWhen: aiTools ? stepCountIs(8) : undefined,
    });

    return {
      content: result.text,
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
      },
      model: this.model,
    };
  }

  protected async *doStreamChatCompletion(
    messages: ChatMessage[],
    options?: any
  ): AsyncGenerator<LLMStreamChunk> {
    await this.ensureInitialized();

    // Import at runtime to avoid bundling issues
    const { streamText, tool: aiTool, stepCountIs } = await import('ai');

    const toolSet: ToolSet | undefined = options?.tools;
    const aiTools =
      toolSet && Object.keys(toolSet).length > 0
        ? Object.fromEntries(
            Object.entries(toolSet).map(([name, toolDef]) => [
              name,
              aiTool({
                description: (toolDef as any).description,
                inputSchema: (toolDef as any).parameters,
                execute: async (input: any, execOptions: any) => {
                  const baseCtx =
                    (execOptions as any)?.experimental_context ??
                    (options?.experimentalContext as ToolExecutionContext | undefined) ??
                    {};
                  const ctx = {
                    ...(baseCtx as any),
                    metadata: {
                      ...((baseCtx as any)?.metadata ?? {}),
                      toolCallId: (execOptions as any)?.toolCallId,
                    },
                  } as ToolExecutionContext;
                  return await (toolDef as any).execute(input, ctx);
                },
              }),
            ])
          )
        : undefined;

    const result = await streamText({
      model: this.aiModel,
      messages: this.formatMessages(messages),
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      tools: aiTools,
      toolChoice: options?.toolChoice,
      experimental_context: options?.experimentalContext,
      providerOptions: options?.providerOptions,
      stopWhen: aiTools ? stepCountIs(8) : undefined,
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
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      },
    };
  }

  protected async doGenerateStructure<T>(
    messages: ChatMessage[],
    schema: StagehandZodSchema<T>
  ): Promise<InferStagehandSchema<T>> {
    await this.ensureInitialized();

    // Import at runtime to avoid bundling issues
    const { generateObject } = await import('ai');

    const result = await generateObject({
      model: this.aiModel,
      messages: this.formatMessages(messages),
      schema: schema as any, // StagehandZodSchema is compatible with ZodType
    });

    return result.object as InferStagehandSchema<T>;
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
      default: {
        // Default to OpenAI for unknown providers
        const { createOpenAI } = await import('@ai-sdk/openai');
        const openai = createOpenAI({ apiKey: options?.apiKey });
        this.aiModel = openai(provider + '/' + modelName);
        this.providerType = 'openai';
        break;
      }
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
