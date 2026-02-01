/**
 * Integration Test Setup
 *
 * Loads environment variables and configures test environment.
 */

import { beforeAll } from 'vitest';
import { config } from 'dotenv';

// Load environment variables from .env file
// Try .env first, then .env.example as fallback
const result = config({
  path: ['.env', '.env.example'],
});

if (result.error) {
  console.warn('Warning: No .env file found. Some tests may be skipped.');
}

// Setup hook to validate environment
beforeAll(() => {
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.warn(
      '\n===============================================\n' +
      'AI_GATEWAY_API_KEY not configured.\n' +
      'Integration tests requiring LLM will be skipped.\n' +
      'Get your key from: https://vercel.com/ai-gateway\n' +
      'Create tests/integration/.env with your key.\n' +
      '===============================================\n'
    );
  }
});
