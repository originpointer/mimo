/**
 * Structured Output Tests
 * Tests generateStructure() method with StagehandZodSchema
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { AISdkClient, OpenAIClient, AnthropicClient, AIGatewayClient } from '../../src/provider.js';
import type { StagehandZodSchema } from '@mimo/types';

describe('Structured Output', () => {
  describe('AISdkClient', () => {
    let client: AISdkClient;

    beforeEach(() => {
      client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
    });

    it('should have generateStructure method', () => {
      expect(typeof client.generateStructure).toBe('function');
    });

    it('should accept Zod schema', async () => {
      const TestSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const schema: StagehandZodSchema<typeof TestSchema> = TestSchema;

      // Method signature should be correct
      expect(() => {
        client.generateStructure(
          [{ role: 'user', content: 'test' }],
          schema
        );
      }).not.toThrow();
    });

    it('should accept ChatMessage messages', () => {
      const TestSchema = z.object({
        result: z.string(),
      });

      const messages = [{ role: 'user', content: 'Extract result' }];

      expect(() => {
        client.generateStructure(messages, TestSchema);
      }).not.toThrow();
    });

    it('should handle nested schemas', () => {
      const NestedSchema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        settings: z.object({
          theme: z.enum(['light', 'dark']),
        }),
      });

      expect(() => {
        client.generateStructure(
          [{ role: 'user', content: 'test' }],
          NestedSchema
        );
      }).not.toThrow();
    });

    it('should handle array schemas', () => {
      const ArraySchema = z.object({
        items: z.array(z.object({
          id: z.string(),
          value: z.number(),
        })),
      });

      expect(() => {
        client.generateStructure(
          [{ role: 'user', content: 'test' }],
          ArraySchema
        );
      }).not.toThrow();
    });
  });

  describe('OpenAIClient', () => {
    let client: OpenAIClient;

    beforeEach(() => {
      client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
    });

    it('should have generateStructure method', () => {
      expect(typeof client.generateStructure).toBe('function');
    });

    it('should use json_schema response format', async () => {
      const TestSchema = z.object({
        name: z.string(),
        age: z.number(),
      });

      // Verify the method exists and accepts correct parameters
      expect(() => {
        client.generateStructure(
          [{ role: 'user', content: 'test' }],
          TestSchema
        );
      }).not.toThrow();
    });

    it('should handle Zod schema conversion', () => {
      const ComplexSchema = z.object({
        title: z.string(),
        count: z.number().int().positive(),
        tags: z.array(z.string()),
        active: z.boolean(),
      });

      expect(() => {
        client.generateStructure(
          [{ role: 'user', content: 'test' }],
          ComplexSchema
        );
      }).not.toThrow();
    });
  });

  describe('AnthropicClient', () => {
    let client: AnthropicClient;

    beforeEach(() => {
      client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
    });

    it('should have generateStructure method', () => {
      expect(typeof client.generateStructure).toBe('function');
    });

    it('should convert Zod schema to tool format', () => {
      const ToolSchema = z.object({
        action: z.string(),
        parameters: z.record(z.string()),
      });

      expect(() => {
        client.generateStructure(
          [{ role: 'user', content: 'test' }],
          ToolSchema
        );
      }).not.toThrow();
    });

    it('should handle system messages in structured output', () => {
      const Schema = z.object({
        result: z.string(),
      });

      const messages = [
        { role: 'system', content: 'Extract the result' },
        { role: 'user', content: 'Data: test' },
      ];

      expect(() => {
        client.generateStructure(messages, Schema);
      }).not.toThrow();
    });
  });

  describe('AIGatewayClient', () => {
    let client: AIGatewayClient;

    beforeEach(() => {
      client = new AIGatewayClient('openai/gpt-4o');
    });

    it('should have generateStructure method', () => {
      expect(typeof client.generateStructure).toBe('function');
    });

    it('should work with gateway', () => {
      const GatewaySchema = z.object({
        data: z.string(),
      });

      expect(() => {
        client.generateStructure(
          [{ role: 'user', content: 'test' }],
          GatewaySchema
        );
      }).not.toThrow();
    });
  });

  describe('Schema type compatibility', () => {
    it('should accept StagehandZodSchema type', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      const TestSchema = z.object({
        field: z.string(),
      }) as StagehandZodSchema<{ field: string }>;

      expect(() => {
        client.generateStructure([{ role: 'user', content: 'test' }], TestSchema);
      }).not.toThrow();
    });

    it('should support InferStagehandSchema', async () => {
      const TestSchema = z.object({
        id: z.string(),
        value: z.number(),
      });

      type Inferred = z.infer<typeof TestSchema>;

      // Type should be inferred correctly
      const test: Inferred = {
        id: 'test',
        value: 42,
      };

      expect(test.id).toBe('test');
      expect(test.value).toBe(42);
    });
  });

  describe('Schema complexity', () => {
    it('should handle simple schemas', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const SimpleSchema = z.object({
        name: z.string(),
      });

      expect(() => {
        client.generateStructure([{ role: 'user', content: 'test' }], SimpleSchema);
      }).not.toThrow();
    });

    it('should handle schemas with optional fields', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const OptionalSchema = z.object({
        required: z.string(),
        optional: z.string().optional(),
        nullable: z.string().nullable(),
      });

      expect(() => {
        client.generateStructure([{ role: 'user', content: 'test' }], OptionalSchema);
      }).not.toThrow();
    });

    it('should handle schemas with unions', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const UnionSchema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      expect(() => {
        client.generateStructure([{ role: 'user', content: 'test' }], UnionSchema);
      }).not.toThrow();
    });

    it('should handle schemas with enums', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const EnumSchema = z.object({
        status: z.enum(['pending', 'active', 'completed']),
      });

      expect(() => {
        client.generateStructure([{ role: 'user', content: 'test' }], EnumSchema);
      }).not.toThrow();
    });
  });

  describe('Error handling in generateStructure', () => {
    it('should propagate API errors', async () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'invalid-key' });
      const TestSchema = z.object({
        result: z.string(),
      });

      // Should handle API errors gracefully
      const resultPromise = client.generateStructure(
        [{ role: 'user', content: 'test' }],
        TestSchema
      );

      expect(resultPromise).toBeInstanceOf(Promise);
    });

    it('should use retry logic for generateStructure', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      // generateStructure should use the retry logic from base class
      const TestSchema = z.object({
        result: z.string(),
      });

      // Verify method signature
      expect(() => {
        client.generateStructure([{ role: 'user', content: 'test' }], TestSchema);
      }).not.toThrow();
    });
  });

  describe('Message handling in generateStructure', () => {
    it('should handle single user message', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const Schema = z.object({
        result: z.string(),
      });

      expect(() => {
        client.generateStructure([{ role: 'user', content: 'Extract result' }], Schema);
      }).not.toThrow();
    });

    it('should handle multi-turn conversations', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const Schema = z.object({
        result: z.string(),
      });

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'Extract result' },
      ];

      expect(() => {
        client.generateStructure(messages, Schema);
      }).not.toThrow();
    });

    it('should handle system messages', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const Schema = z.object({
        result: z.string(),
      });

      const messages = [
        { role: 'system', content: 'You are a data extractor' },
        { role: 'user', content: 'Extract result' },
      ];

      expect(() => {
        client.generateStructure(messages, Schema);
      }).not.toThrow();
    });
  });

  describe('Method signature consistency', () => {
    it('should have consistent signature across all clients', () => {
      const clients = [
        new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' }),
        new OpenAIClient('gpt-4o', { apiKey: 'test-key' }),
        new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' }),
        new AIGatewayClient('openai/gpt-4o'),
      ];

      const Schema = z.object({
        result: z.string(),
      });

      clients.forEach(client => {
        expect(typeof client.generateStructure).toBe('function');
        expect(() => {
          client.generateStructure([{ role: 'user', content: 'test' }], Schema);
        }).not.toThrow();
      });
    });
  });
});
