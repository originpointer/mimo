/**
 * Test setup file for vitest.
 *
 * Runs before all tests.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Configure global test timeout
vi.setConfig({
  testTimeout: 10000,
});
