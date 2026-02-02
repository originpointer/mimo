/**
 * LLM Client Factory and Test Models
 *
 * Provides LLM client creation and predefined test models for integration testing.
 * Uses real LLM clients through Vercel AI Gateway.
 *
 * Reference: @mimo/llm/tests/integration/gateway.test.ts
 */

import { describe, beforeAll } from 'vitest';
import { LLMProvider } from '@mimo/llm';

/**
 * Create LLM client for testing
 * @param model - Model identifier (e.g., "anthropic/claude-haiku-4.5")
 * @returns LLM client instance
 */
export function createLLMClient(model: string) {
  const provider = new LLMProvider();
  return provider.getClient(model);
}

/**
 * Predefined test models
 * Reference: @mimo/llm/tests/integration/gateway.test.ts
 */
export const testModels = {
  // Claude 3.5 Haiku - Recommended for integration tests (fast and cheap)
  claude: 'anthropic/claude-haiku-4.5',

  // GPT-4o Mini - OpenAI's fast model
  gpt4o: 'openai/gpt-4o-mini',

  // GPT-5.2 - Latest GPT model
  gpt5: 'openai/gpt-5.2',

  // Gemini 2.0 Flash - Google's fast model
  gemini: 'google/gemini-2.0-flash',
} as const;

/**
 * Model type
 */
export type TestModel = typeof testModels[keyof typeof testModels];

/**
 * Validate AI Gateway API Key is configured
 * @throws Error if API Key is not configured
 */
export function validateApiKey(): void {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error(
      'AI_GATEWAY_API_KEY not configured.\n\n' +
      'To run integration tests:\n' +
      '  1. Get your key from: https://vercel.com/ai-gateway\n' +
      '  2. Create tests/integration/.env file\n' +
      '  3. Add: AI_GATEWAY_API_KEY=vck_xxx\n'
    );
  }
}

/**
 * Check if API Key is configured
 */
export function hasApiKey(): boolean {
  return !!(process.env.AI_GATEWAY_API_KEY);
}

/**
 * Create test suite with AI Gateway requirement
 * Skips tests if API Key is not configured
 */
export function describeWithAIGateway(
  name: string,
  fn: () => void
): void {
  describe.skipIf(!hasApiKey())(name, () => {
    beforeAll(() => {
      validateApiKey();
    });
    fn();
  });
}
