/**
 * Custom Assertion Functions for Integration Testing
 *
 * Provides reusable assertion functions for testing execution results and LLM responses.
 */

import type { ExecutionResult } from '@mimo/agent-tools/executor';
import type { ChatCompletionResponse } from '@mimo/agent-core';

/**
 * Assert execution result is successful
 */
export function expectSuccess(result: ExecutionResult) {
  expect(result.success).toBe(true);
  expect(result.error).toBeUndefined();
  expect(result.toolCall.success).toBe(true);
  expect(result.toolCall.error).toBeUndefined();
}

/**
 * Assert execution result failed
 */
export function expectFailure(
  result: ExecutionResult,
  errorMsg?: string | RegExp
) {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();

  if (errorMsg) {
    if (errorMsg instanceof RegExp) {
      expect(result.error).toMatch(errorMsg);
    } else {
      expect(result.error).toContain(errorMsg);
    }
  }

  expect(result.toolCall.success).toBe(false);
  expect(result.toolCall.error).toBeDefined();
}

/**
 * Assert tool call information
 */
export function expectToolCall(
  result: ExecutionResult,
  toolName: string,
  params?: Record<string, any>
) {
  expect(result.toolCall.name).toBe(toolName);
  expect(result.toolCall.id).toMatch(/^call_\d+_[a-z0-9]+$/);

  if (params) {
    expect(result.toolCall.parameters).toEqual(params);
  }
}

/**
 * Assert execution duration
 */
export function expectDuration(
  result: ExecutionResult,
  min: number,
  max?: number
) {
  expect(result.duration).toBeGreaterThanOrEqual(min);
  if (max !== undefined) {
    expect(result.duration).toBeLessThanOrEqual(max);
  }
}

/**
 * Assert LLM response structure is complete
 */
export function expectLLMResponse(response: ChatCompletionResponse) {
  expect(response.content).toBeDefined();
  expect(response.usage).toBeDefined();
  expect(response.usage.totalTokens).toBeGreaterThan(0);
  expect(response.model).toBeDefined();
  expect(response.finishReason).toBeDefined();
}

/**
 * Assert response contains tool calls
 */
export function expectToolCalls(response: ChatCompletionResponse, count?: number) {
  expect(response.toolCalls).toBeDefined();
  expect(response.finishReason).toBe('tool_calls');

  if (count !== undefined) {
    expect(response.toolCalls).toHaveLength(count);
  }

  for (const call of response.toolCalls!) {
    expect(call.id).toBeDefined();
    expect(call.name).toBeDefined();
    expect(call.parameters).toBeDefined();
  }
}

/**
 * Assert token usage
 */
export function expectTokenUsage(
  response: ChatCompletionResponse,
  minPrompt: number,
  minCompletion: number
) {
  expect(response.usage.promptTokens).toBeGreaterThanOrEqual(minPrompt);
  expect(response.usage.completionTokens).toBeGreaterThanOrEqual(minCompletion);
}

/**
 * Assert response contains specific content
 */
export function expectContent(response: ChatCompletionResponse, content: string | RegExp) {
  expect(response.content).toBeDefined();
  if (content instanceof RegExp) {
    expect(response.content).toMatch(content);
  } else {
    expect(response.content).toContain(content);
  }
}
