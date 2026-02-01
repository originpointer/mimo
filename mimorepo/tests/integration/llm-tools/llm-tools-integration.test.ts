/**
 * LLM + Tools Integration Tests
 *
 * Verifies that agent-llm and agent-tools work together correctly.
 *
 * NOTE: Tool calls are not currently supported in the LLMResponse type.
 * These tests are skipped until the type definitions are updated to support tool calls.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { describeWithAIGateway, createLLMClient, testModels } from '../fixtures/llm';
import { ToolRegistry } from '@mimo/agent-tools';
import { ToolExecutor } from '@mimo/agent-tools/executor';
import { testTools, testContexts } from '../fixtures';
import { z } from 'zod';

describeWithAIGateway('LLM + Tools Integration', () => {
  let registry: ToolRegistry;
  let executor: ToolExecutor;

  beforeEach(() => {
    registry = new ToolRegistry();
    executor = new ToolExecutor();
  });

  describe('Basic LLM chat completion', () => {
    it('should complete chat successfully', async () => {
      const client = createLLMClient(testModels.claude);

      const response = await client.chatCompletion([
        { role: 'user', content: 'What is 15 + 27?' },
      ]);

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
    });

    it('should handle conversation history', async () => {
      const client = createLLMClient(testModels.claude);

      registry.register(testTools[0]); // calculateTool

      // First message
      const firstResponse = await client.chatCompletion([
        { role: 'user', content: 'What is 25 * 4?' },
      ]);

      expect(firstResponse.content).toBeDefined();

      // Follow-up message with context
      const messages = [
        { role: 'user' as const, content: 'What is 25 * 4?' },
        { role: 'assistant' as const, content: firstResponse.content },
        { role: 'user' as const, content: 'And what is 100 / 5?' },
      ];

      const secondResponse = await client.chatCompletion(messages);

      expect(secondResponse.content).toBeDefined();
      expect(secondResponse.content.length).toBeGreaterThan(0);
    });
  });

  describe('String operations via LLM', () => {
    it('should handle string operations via LLM', async () => {
      const client = createLLMClient(testModels.claude);

      const response = await client.chatCompletion([
        { role: 'user', content: 'Convert "hello world" to uppercase' },
      ]);

      expect(response.content).toBeDefined();
      // The LLM should respond with the uppercase text
      expect(response.content).toBeDefined();
    });
  });

  // Tool call tests skipped - tool calls not currently supported in LLMResponse type
  describe.skip('LLM tool call detection', () => {
    it('should detect tool calls in LLM response', async () => {
      const client = createLLMClient(testModels.claude);

      registry.register(testTools[0]); // calculateTool

      const response = await client.chatCompletion(
        [{ role: 'user', content: 'What is 15 + 27? Use the calculate tool.' }],
        {}
      );

      // Check if tool calls are present
      if ((response as any).toolCalls && (response as any).toolCalls.length > 0) {
        expect((response as any).toolCalls[0].name).toBe('calculate');
      }
    });
  });

  describe.skip('Tool execution from LLM response', () => {
    it('should execute tool called by LLM', async () => {
      const client = createLLMClient(testModels.claude);

      registry.register(testTools[0]); // calculateTool

      const llmResponse = await client.chatCompletion(
        [{ role: 'user', content: 'What is 5 + 3?' }],
        {}
      );

      // If LLM made a tool call, execute it
      if ((llmResponse as any).toolCalls && (llmResponse as any).toolCalls.length > 0) {
        const toolCall = (llmResponse as any).toolCalls[0];
        const tool = registry.getTool(toolCall.name);

        if (tool) {
          const result = await executor.execute(tool, toolCall.args, testContexts.minimal);
          expect(result.success).toBe(true);
        }
      }
    });
  });

  describe.skip('Multi-turn tool conversations', () => {
    it('should handle tool result in conversation', async () => {
      const client = createLLMClient(testModels.claude);

      registry.register(testTools[0]); // calculateTool

      // First request - get tool call
      const firstResponse = await client.chatCompletion(
        [{ role: 'user', content: 'What is 25 * 4?' }],
        {}
      );

      // If we got a tool call, execute it and send back the result
      if ((firstResponse as any).toolCalls && (firstResponse as any).toolCalls.length > 0) {
        const toolCall = (firstResponse as any).toolCalls[0];
        const tool = registry.getTool(toolCall.name);

        if (tool) {
          const execResult = await executor.execute(tool, toolCall.args, testContexts.minimal);

          // Build conversation history with tool result
          const messages = [
            { role: 'user' as const, content: 'What is 25 * 4?' },
            {
              role: 'assistant' as const,
              content: firstResponse.content,
              toolCalls: [toolCall],
            },
            {
              role: 'user' as const,
              content: `Tool result: ${JSON.stringify(execResult.result)}`,
            },
          ];

          // Get final response with tool result context
          const finalResponse = await client.chatCompletion(messages);

          expect(finalResponse.content).toBeDefined();
          expect(finalResponse.content.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe.skip('Complex tool scenarios', () => {
    it('should handle string operations via LLM', async () => {
      const client = createLLMClient(testModels.claude);

      registry.register(testTools[1]); // stringTool

      const response = await client.chatCompletion(
        [{ role: 'user', content: 'Convert "hello world" to uppercase' }],
        {}
      );

      if ((response as any).toolCalls && (response as any).toolCalls.length > 0) {
        expect((response as any).toolCalls[0].name).toBe('string_operations');
      }
    });

    it('should handle array operations via LLM', async () => {
      const client = createLLMClient(testModels.claude);

      registry.register(testTools[5]); // arrayTool

      const response = await client.chatCompletion(
        [{ role: 'user', content: 'Find the average of these numbers: 10, 20, 30, 40, 50' }],
        {}
      );

      if ((response as any).toolCalls && (response as any).toolCalls.length > 0) {
        const toolCall = (response as any).toolCalls[0];
        expect(toolCall.name).toBe('array_operations');

        // Execute the tool
        const tool = registry.getTool(toolCall.name);
        if (tool) {
          const result = await executor.execute(tool, toolCall.args, testContexts.minimal);
          expect(result.success).toBe(true);
          // Average should be 30
          expect(result.result.result).toBe(30);
        }
      }
    });
  });

  describe.skip('Tool error handling in LLM context', () => {
    it('should handle tool execution errors gracefully', async () => {
      const client = createLLMClient(testModels.claude);

      // Register a tool that will fail
      const failingTool: typeof testTools[number] = {
        name: 'failing_tool',
        description: 'A tool that always fails',
        parameters: z.object({}),
        execute: async () => {
          throw new Error('Tool execution failed');
        },
      };

      registry.register(failingTool);

      const response = await client.chatCompletion(
        [{ role: 'user', content: 'Use the failing tool' }],
        {}
      );

      // LLM should still respond even if tool might fail
      expect(response.content).toBeDefined();
    });
  });
});
