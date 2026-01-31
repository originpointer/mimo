/**
 * LLMProvider - Manager for LLM clients with automatic provider detection
 */

import type { ClientOptions } from '@mimo/types';
import { LLMClient } from './client.js';
import { AISdkClient } from './clients/aisdk.js';
import { parseModelString } from './utils/parser.js';

// Import client implementations
import { OpenAIClient } from './clients/openai.js';
import { AnthropicClient } from './clients/anthropic.js';
import { AIGatewayClient } from './clients/gateway.js';

// Re-export types for convenience
export type { ClientOptions } from '@mimo/types';

// Re-export client classes for direct usage
export { OpenAIClient } from './clients/openai.js';
export { AnthropicClient } from './clients/anthropic.js';
export { AISdkClient } from './clients/aisdk.js';
export { AIGatewayClient } from './clients/gateway.js';

/**
 * Google client (stub - to be implemented)
 */
export class GoogleClient extends LLMClient {
  getProviderType(): 'google' {
    return 'google';
  }

  protected async doChatCompletion(): Promise<any> {
    throw new Error('Google client not implemented yet');
  }

  protected async *doStreamChatCompletion(): AsyncGenerator<any> {
    throw new Error('Google client not implemented yet');
  }

  protected async doGenerateStructure(): Promise<any> {
    throw new Error('Google client not implemented yet');
  }
}

/**
 * Ollama client (stub - for local models)
 */
export class OllamaClient extends LLMClient {
  getProviderType(): 'ollama' {
    return 'ollama';
  }

  protected async doChatCompletion(): Promise<any> {
    throw new Error('Ollama client not implemented yet');
  }

  protected async *doStreamChatCompletion(): AsyncGenerator<any> {
    throw new Error('Ollama client not implemented yet');
  }

  protected async doGenerateStructure(): Promise<any> {
    throw new Error('Ollama client not implemented yet');
  }
}

/**
 * LLMProvider factory with automatic provider detection
 */
export class LLMProvider {
  private static clientRegistry = new Map<string, new (...args: any[]) => LLMClient>();
  private clients = new Map<string, LLMClient>();

  /**
   * Register a custom LLM client
   */
  static register(provider: string, clientClass: new (...args: any[]) => LLMClient): void {
    this.clientRegistry.set(provider, clientClass);
  }

  /**
   * Get supported providers
   */
  get supportedProviders(): string[] {
    return Array.from(LLMProvider.clientRegistry.keys());
  }

  /**
   * Get LLM client for a model (automatic provider detection)
   *
   * New format: "provider/model" -> uses AI Gateway (if AI_GATEWAY_API_KEY set and no specific apiKey provided)
   * Legacy format: "model" -> uses direct client based on model detection
   */
  getClient(model: string, options?: ClientOptions): LLMClient {
    const cacheKey = `${model}:${JSON.stringify(options ?? {})}`;

    let client = this.clients.get(cacheKey);
    if (client) {
      return client;
    }

    // Check for API keys
    const hasGatewayKey = !!(globalThis as any).process?.env?.AI_GATEWAY_API_KEY;
    const useDirectClient = !!options?.apiKey;

    // New format: "provider/model"
    if (model.includes('/')) {
      // Use AI Gateway when available and no specific apiKey
      if (hasGatewayKey && !useDirectClient) {
        client = new AIGatewayClient(model, options);
        this.clients.set(cacheKey, client);
        return client;
      }

      // Direct provider access without AI Gateway
      client = new AISdkClient(model, options);
      this.clients.set(cacheKey, client);
      return client;
    }

    // Legacy format: detect provider from model name
    const { provider } = parseModelString(model);
    const ClientClass = LLMProvider.clientRegistry.get(provider);

    if (!ClientClass) {
      throw new Error(`Unsupported provider: ${provider}. Supported providers: ${this.supportedProviders.join(', ')}`);
    }

    client = new ClientClass(model, options);
    this.clients.set(cacheKey, client);

    return client;
  }
}

// Register default providers
LLMProvider.register('openai', OpenAIClient);
LLMProvider.register('anthropic', AnthropicClient);
LLMProvider.register('google', GoogleClient);
LLMProvider.register('ollama', OllamaClient);
LLMProvider.register('gateway', AIGatewayClient);
