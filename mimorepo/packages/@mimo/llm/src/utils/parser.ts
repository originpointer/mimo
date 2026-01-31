/**
 * Model string parser
 * Supports formats: "provider/model" or "model"
 */

import type { ModelString, LLMProviderType, ModelCapabilities } from '../types.js';

/**
 * Known model to provider mapping
 */
const MODEL_TO_PROVIDER: Record<string, LLMProviderType> = {
  // OpenAI
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'o1': 'openai',
  'o1-mini': 'openai',
  'o1-preview': 'openai',
  'o3': 'openai',
  'o3-mini': 'openai',

  // Anthropic
  'claude-3-5-sonnet': 'anthropic',
  'claude-3-5-haiku': 'anthropic',
  'claude-3-7-sonnet': 'anthropic',
  'claude-opus-4-5': 'anthropic',
  'claude-opus-4': 'anthropic',
  'claude-sonnet-4': 'anthropic',
  'claude-sonnet-4-5': 'anthropic',
  'claude-haiku-4-5': 'anthropic',

  // Google
  'gemini-1.5-flash': 'google',
  'gemini-1.5-pro': 'google',
  'gemini-2.0-flash': 'google',
  'gemini-2.0-flash-thinking': 'google',

  // Z.AI GLM models
  'glm-4.7': 'zai',
  'glm-4': 'zai',
  'glm-3-turbo': 'zai',

  // Cerebras/Groq
  'llama-3.3-70b': 'cerebras',
  'llama-3.1-70b': 'groq',
};

/**
 * Parse model string to detect provider
 */
export function parseModelString(modelString: string): ModelString {
  // Format 1: "provider/model" (e.g., "anthropic/claude-3-5-sonnet")
  if (modelString.includes('/')) {
    const [provider, ...modelParts] = modelString.split('/');
    const model = modelParts.join('/');

    return {
      provider: provider as LLMProviderType,
      model,
      fullString: modelString,
    };
  }

  // Format 2: Just model name - detect from known models
  const provider = MODEL_TO_PROVIDER[modelString] || 'openai'; // Default to OpenAI

  return {
    provider,
    model: modelString,
    fullString: `${provider}/${modelString}`,
  };
}

/**
 * Get model capabilities
 */
export function getModelCapabilities(modelString: string): ModelCapabilities {
  const { provider, model } = parseModelString(modelString);

  // Anthropic Claude 4.5+ supports caching
  if (provider === 'anthropic' && (model.includes('4-5') || model.includes('haiku'))) {
    return {
      supportsStreaming: true,
      supportsCaching: true,
      supportsThinking: false,
      maxTokens: 200000,
    };
  }

  // Anthropic Claude Opus 4 (thinking model)
  if (provider === 'anthropic' && model.includes('opus-4')) {
    return {
      supportsStreaming: true,
      supportsCaching: false,
      supportsThinking: true,
      maxTokens: 200000,
    };
  }

  // OpenAI o1/o3 support thinking
  if (provider === 'openai' && (model.startsWith('o1') || model.startsWith('o3'))) {
    return {
      supportsStreaming: model === 'o1-preview', // Only o1-preview supports streaming
      supportsCaching: false,
      supportsThinking: true,
      maxTokens: 128000,
    };
  }

  // Google Gemini 2.0 Flash Thinking
  if (provider === 'google' && model.includes('thinking')) {
    return {
      supportsStreaming: true,
      supportsCaching: false,
      supportsThinking: true,
      maxTokens: 1000000,
    };
  }

  // Z.AI GLM models
  if (provider === 'zai') {
    return {
      supportsStreaming: true,
      supportsCaching: false,
      supportsThinking: false,
      maxTokens: 128000,
    };
  }

  // Default capabilities
  return {
    supportsStreaming: true,
    supportsCaching: false,
    supportsThinking: false,
    maxTokens: 128000,
  };
}
