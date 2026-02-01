/**
 * Vitest setup file
 * Loads environment variables before running tests
 */

import { config } from 'dotenv';

// Load .env file explicitly
const result = config({ path: '.env' });

if (result.error) {
  // We require real LLM integration tests by default.
  // If there's no .env, AI_GATEWAY_API_KEY must still be provided via environment.
  console.warn('No .env file found (will rely on process.env)');
}

if (!process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_API_KEY.trim() === '') {
  throw new Error(
    'AI_GATEWAY_API_KEY is required to run @mimo/llm tests.\n' +
      'Set it via environment variables or create a .env file in packages/@mimo/llm:\n' +
      '  AI_GATEWAY_API_KEY=vck_...\n' +
      'Get your key from: https://vercel.com/ai-gateway'
  );
}

console.log('✓ AI_GATEWAY_API_KEY is loaded');

if (process.env.ZAI_API_KEY) {
  console.log('✓ ZAI_API_KEY is loaded');
}
