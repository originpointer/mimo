/**
 * Real Tool Definitions for Integration Testing
 *
 * Provides real tool implementations for integration testing.
 * These tools actually execute their intended functionality.
 */

import { z } from 'zod';
import type { ToolDefinition } from '@mimo/agent-core';

/**
 * Calculate tool - Executes mathematical expressions
 */
export const calculateTool: ToolDefinition = {
  name: 'calculate',
  description: 'Execute mathematical calculations, supporting basic operations (+, -, *, /) and parentheses',
  parameters: z.object({
    expression: z.string().describe('Mathematical expression to calculate, such as "2 + 3 * 4"'),
  }),
  execute: async ({ expression }) => {
    try {
      const result = eval(expression);
      return { result, success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * String operations tool
 */
export const stringTool: ToolDefinition = {
  name: 'string_operations',
  description: 'Execute string operations like case conversion, length calculation, etc.',
  parameters: z.object({
    text: z.string(),
    operation: z.enum(['upper', 'lower', 'length', 'reverse']),
  }),
  execute: async ({ text, operation }) => {
    const operations = {
      upper: text.toUpperCase(),
      lower: text.toLowerCase(),
      length: text.length,
      reverse: text.split('').reverse().join(''),
    };
    return { result: operations[operation], success: true };
  },
};

/**
 * Delay tool - For testing timeout and retry behavior
 */
export const delayTool: ToolDefinition = {
  name: 'delay',
  description: 'Delay for specified time and then return',
  parameters: z.object({
    ms: z.number().describe('Delay duration in milliseconds'),
  }),
  timeout: 5000,
  execute: async ({ ms }) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    return { success: true, delayed: ms };
  },
};

/**
 * Error tool - For testing error handling
 */
export const errorTool: ToolDefinition = {
  name: 'raise_error',
  description: 'Throw specified error message',
  parameters: z.object({
    message: z.string().describe('Error message to throw'),
  }),
  execute: async ({ message }) => {
    throw new Error(message);
  },
};

/**
 * Echo tool - Returns input as output
 */
export const echoTool: ToolDefinition = {
  name: 'echo',
  description: 'Echo back the input text',
  parameters: z.object({
    text: z.string().describe('Text to echo back'),
  }),
  execute: async ({ text }) => {
    return { echo: text, success: true };
  },
};

/**
 * Array operations tool
 */
export const arrayTool: ToolDefinition = {
  name: 'array_operations',
  description: 'Execute array operations like sum, average, max, min',
  parameters: z.object({
    numbers: z.array(z.number()).describe('Array of numbers'),
    operation: z.enum(['sum', 'average', 'max', 'min', 'length']),
  }),
  execute: async ({ numbers, operation }) => {
    const operations = {
      sum: numbers.reduce((a, b) => a + b, 0),
      average: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      max: Math.max(...numbers),
      min: Math.min(...numbers),
      length: numbers.length,
    };
    return { result: operations[operation], success: true };
  },
};

/**
 * Export all test tools
 */
export const testTools = [
  calculateTool,
  stringTool,
  delayTool,
  errorTool,
  echoTool,
  arrayTool,
] as const;

/**
 * Tool names mapping
 */
export const toolNames = {
  calculate: 'calculate',
  string: 'string_operations',
  delay: 'delay',
  error: 'raise_error',
  echo: 'echo',
  array: 'array_operations',
} as const;
