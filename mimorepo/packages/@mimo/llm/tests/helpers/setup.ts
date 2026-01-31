/**
 * Test setup and API key validation helpers
 */

import { describe, beforeAll } from 'vitest';

/**
 * Validate that an API key is configured
 * @throws Error if API key is not configured or is a placeholder
 */
export function validateApiKey(envVar: string, providerName: string): void {
  const apiKey = process.env[envVar];
  if (!apiKey || apiKey === '' || apiKey.startsWith('sk-your-') || apiKey.startsWith('your-')) {
    throw new Error(
      `${providerName} API key not configured.\n` +
      `To run integration tests:\n` +
      `  1. Copy .env.test.example to .env.test\n` +
      `  2. Set ${envVar} in .env.test with your actual API key\n` +
      `  3. Run tests with: pnpm test`
    );
  }
}

/**
 * Check if an API key is configured without throwing
 */
export function hasApiKey(envVar: string): boolean {
  const apiKey = process.env[envVar];
  return !!(apiKey && apiKey !== '' && !apiKey.startsWith('sk-your-') && !apiKey.startsWith('your-'));
}

/**
 * Skip test if API key is not configured
 * Usage: it.skipIf(!hasApiKey('OPENAI_API_KEY'), 'test name', () => { ... })
 */
export function skipIfNoApiKey(envVar: string): boolean {
  return !hasApiKey(envVar);
}

/**
 * Get API key with fallback or throw
 */
export function getApiKey(envVar: string, providerName: string): string {
  validateApiKey(envVar, providerName);
  return process.env[envVar]!;
}

/**
 * Get optional base URL from environment
 */
export function getBaseURL(envVar: string): string | undefined {
  const url = process.env[envVar];
  return url && url !== '' ? url : undefined;
}

/**
 * Test suite setup with API key validation
 */
export function describeWithApiKey(
  providerName: string,
  envVar: string,
  fn: () => void
): void {
  describe.skipIf(!hasApiKey(envVar))(`${providerName} Integration Tests`, () => {
    beforeAll(() => {
      validateApiKey(envVar, providerName);
    });
    fn();
  });
}

// Provider-specific helpers
export const OpenAI = {
  validateApiKey: () => validateApiKey('OPENAI_API_KEY', 'OpenAI'),
  hasApiKey: () => hasApiKey('OPENAI_API_KEY'),
  getApiKey: () => getApiKey('OPENAI_API_KEY', 'OpenAI'),
  getBaseURL: () => getBaseURL('OPENAI_BASE_URL'),
};

export const Anthropic = {
  validateApiKey: () => validateApiKey('ANTHROPIC_API_KEY', 'Anthropic'),
  hasApiKey: () => hasApiKey('ANTHROPIC_API_KEY'),
  getApiKey: () => getApiKey('ANTHROPIC_API_KEY', 'Anthropic'),
  getBaseURL: () => getBaseURL('ANTHROPIC_BASE_URL'),
};

export const Google = {
  validateApiKey: () => validateApiKey('GOOGLE_API_KEY', 'Google'),
  hasApiKey: () => hasApiKey('GOOGLE_API_KEY'),
  getApiKey: () => getApiKey('GOOGLE_API_KEY', 'Google'),
  getBaseURL: () => getBaseURL('GOOGLE_BASE_URL'),
};

export const AIGateway = {
  validateApiKey: () => {
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey || apiKey === '' || apiKey.startsWith('****')) {
      throw new Error(
        'AI Gateway API key not configured.\n' +
        'To run integration tests:\n' +
        '  1. Copy .env.test.example to .env.test\n' +
        '  2. Set AI_GATEWAY_API_KEY in .env.test with your actual API key\n' +
        '  3. Run tests with: pnpm test\n' +
        'Get your key from: https://vercel.com/ai-gateway'
      );
    }
  },
  hasApiKey: () => {
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    return !!(apiKey && apiKey !== '' && !apiKey.startsWith('****'));
  },
  getApiKey: () => {
    AIGateway.validateApiKey();
    return process.env.AI_GATEWAY_API_KEY!;
  },
};
