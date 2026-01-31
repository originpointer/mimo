/**
 * Test message fixtures for LLM integration tests
 */

import type { ChatMessage } from '@mimo/types';

/**
 * Simple test message for basic chat completion
 */
export const SIMPLE_TEST_MESSAGE: ChatMessage[] = [
  {
    role: 'user',
    content: 'Say "Hello, World!" in exactly that format.',
  },
];

/**
 * Test messages for streaming (longer response expected)
 */
export const STREAMING_TEST_MESSAGE: ChatMessage[] = [
  {
    role: 'user',
    content: 'Count from 1 to 5, one number per line.',
  },
];

/**
 * Test messages for structured output
 */
export const STRUCTURED_OUTPUT_TEST_MESSAGE: ChatMessage[] = [
  {
    role: 'user',
    content: 'Extract the following information: "John Doe, age 30, lives in New York"',
  },
];

/**
 * Test messages for token tracking
 */
export const TOKEN_TRACKING_TEST_MESSAGE: ChatMessage[] = [
  {
    role: 'user',
    content:
      'What is the capital of France? Please provide a brief answer with the city name and one interesting fact.',
  },
];

/**
 * Test messages for multi-turn conversation
 */
export const MULTI_TURN_MESSAGES: ChatMessage[] = [
  {
    role: 'user',
    content: 'My favorite color is blue.',
  },
  {
    role: 'assistant',
    content: "I've noted that your favorite color is blue. Is there anything specific about blue that you enjoy?",
  },
  {
    role: 'user',
    content: 'I like it because it reminds me of the ocean.',
  },
];

/**
 * Test messages for system prompt
 */
export const SYSTEM_PROMPT_MESSAGES: ChatMessage[] = [
  {
    role: 'system',
    content: 'You are a helpful assistant who always responds in lowercase.',
  },
  {
    role: 'user',
    content: 'What is the capital of France?',
  },
];

/**
 * Test messages for code generation
 */
export const CODE_GENERATION_MESSAGE: ChatMessage[] = [
  {
    role: 'user',
    content: 'Write a simple TypeScript function that adds two numbers.',
  },
];

/**
 * Test messages for reasoning
 */
export const REASONING_TEST_MESSAGE: ChatMessage[] = [
  {
    role: 'user',
    content: 'If I have 3 apples and eat 1, then buy 5 more, how many apples do I have? Show your reasoning.',
  },
];

/**
 * Test messages with maximum tokens constraint
 */
export const MAX_TOKENS_MESSAGE: ChatMessage[] = [
  {
    role: 'user',
    content: 'Tell me a very short story about a cat.',
  },
];

/**
 * Test messages for error handling (invalid request)
 */
export const ERROR_TEST_MESSAGE_EMPTY: ChatMessage[] = [
  {
    role: 'user',
    content: '',
  },
];

/**
 * Test messages for temperature variations
 */
export const CREATIVITY_TEST_MESSAGE: ChatMessage[] = [
  {
    role: 'user',
    content: 'Give me a creative name for a pet robot.',
  },
];

/**
 * Create a test message with custom content
 */
export function createTestMessage(content: string): ChatMessage[] {
  return [
    {
      role: 'user',
      content,
    },
  ];
}

/**
 * Create multi-turn messages from an array of alternating user/assistant messages
 */
export function createMultiTurnMessages(messages: Array<{ role: 'user' | 'assistant'; content: string }>): ChatMessage[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}
