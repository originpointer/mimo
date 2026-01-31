/**
 * Vitest setup file
 * Loads environment variables before running tests
 */

import { config } from 'dotenv';

// Load .env file explicitly
const result = config({ path: '.env' });

if (result.error) {
  // .env file might not exist, that's ok for unit tests
  console.warn('No .env file found, integration tests will be skipped');
}

// Log loaded env vars for debugging
if (process.env.AI_GATEWAY_API_KEY) {
  console.log('✓ AI_GATEWAY_API_KEY is loaded');
}
if (process.env.ZAI_API_KEY) {
  console.log('✓ ZAI_API_KEY is loaded');
}
