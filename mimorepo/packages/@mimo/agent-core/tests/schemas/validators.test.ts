import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  SchemaValidator,
  JsonSchemaValidator,
  type ValidationResult,
  TypeGuards,
} from '../../src/schemas/validators';

describe('SchemaValidator', () => {
  const userSchema = z.object({
    name: z.string().min(2),
    age: z.number().min(0).max(120),
    email: z.string().email(),
  });

  describe('validate', () => {
    it('should return success with valid data', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = SchemaValidator.validate(userSchema, data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors with invalid data', () => {
      const data = {
        name: 'J',
        age: 150,
        email: 'not-an-email',
      };

      const result = SchemaValidator.validate(userSchema, data);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle missing required fields', () => {
      const data = {
        name: 'John',
      };

      const result = SchemaValidator.validate(userSchema, data);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle extra fields when strict mode is not enforced', () => {
      const data = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
        extraField: 'should be ignored',
      };

      const result = SchemaValidator.validate(userSchema, data);

      expect(result.success).toBe(true);
    });
  });

  describe('assertValid', () => {
    it('should return data when valid', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = SchemaValidator.assertValid(userSchema, data);

      expect(result).toEqual(data);
    });

    it('should throw error when invalid', () => {
      const data = {
        name: 'J',
        age: 150,
        email: 'invalid',
      };

      expect(() => {
        SchemaValidator.assertValid(userSchema, data);
      }).toThrow();
    });

    it('should include error details in thrown error', () => {
      const data = {
        name: 'J',
        age: 150,
        email: 'invalid',
      };

      try {
        SchemaValidator.assertValid(userSchema, data);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Schema validation failed');
      }
    });
  });

  describe('createValidator', () => {
    it('should create a reusable validator function', () => {
      const validator = SchemaValidator.createValidator(userSchema);

      const validData = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
      };
      const invalidData = {
        name: 'J',
      };

      expect(validator(validData).success).toBe(true);
      expect(validator(invalidData).success).toBe(false);
    });

    it('should return validator that preserves type inference', () => {
      const schema = z.object({
        count: z.number(),
      });
      const validator = SchemaValidator.createValidator(schema);

      const result = validator({ count: 42 });

      if (result.success) {
        expectTypeOf(result.data.count).toBeNumber();
        expect(result.data.count).toBe(42);
      }
    });
  });

  describe('validateBatch', () => {
    it('should validate all items in an array', () => {
      const items = [
        { name: 'John', age: 30, email: 'john@example.com' },
        { name: 'Jane', age: 25, email: 'jane@example.com' },
      ];

      const result = SchemaValidator.validateBatch(items, userSchema);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return errors for invalid items', () => {
      const items = [
        { name: 'John', age: 30, email: 'john@example.com' },
        { name: 'J', age: 150, email: 'invalid' },
      ];

      const result = SchemaValidator.validateBatch(items, userSchema);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBe(1);
      expect(result.errors![0]).toContain('[1]');
    });

    it('should handle empty array', () => {
      const result = SchemaValidator.validateBatch([], userSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});

describe('JsonSchemaValidator', () => {
  describe('isValidJsonSchema', () => {
    it('should return true for valid object schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      expect(JsonSchemaValidator.isValidJsonSchema(schema)).toBe(true);
    });

    it('should return true for valid array schema', () => {
      const schema = {
        type: 'array',
        items: { type: 'string' },
      };

      expect(JsonSchemaValidator.isValidJsonSchema(schema)).toBe(true);
    });

    it('should return true for valid primitive schemas', () => {
      expect(JsonSchemaValidator.isValidJsonSchema({ type: 'string' })).toBe(true);
      expect(JsonSchemaValidator.isValidJsonSchema({ type: 'number' })).toBe(true);
      expect(JsonSchemaValidator.isValidJsonSchema({ type: 'boolean' })).toBe(true);
      expect(JsonSchemaValidator.isValidJsonSchema({ type: 'null' })).toBe(true);
    });

    it('should return false for non-object input', () => {
      expect(JsonSchemaValidator.isValidJsonSchema(null)).toBe(false);
      expect(JsonSchemaValidator.isValidJsonSchema(undefined)).toBe(false);
      expect(JsonSchemaValidator.isValidJsonSchema('string')).toBe(false);
      expect(JsonSchemaValidator.isValidJsonSchema(123)).toBe(false);
    });

    it('should return false for schema without type', () => {
      const schema = {
        properties: {
          name: { type: 'string' },
        },
      };

      expect(JsonSchemaValidator.isValidJsonSchema(schema)).toBe(false);
    });

    it('should return false for invalid type', () => {
      const schema = {
        type: 'invalid-type',
      };

      expect(JsonSchemaValidator.isValidJsonSchema(schema)).toBe(false);
    });

    it('should return false for object schema without properties', () => {
      const schema = {
        type: 'object',
      };

      expect(JsonSchemaValidator.isValidJsonSchema(schema)).toBe(false);
    });

    it('should return false for array schema without items or $ref', () => {
      const schema = {
        type: 'array',
      };

      expect(JsonSchemaValidator.isValidJsonSchema(schema)).toBe(false);
    });
  });

  describe('validateOpenAIStrict', () => {
    it('should validate strict mode compatible schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        additionalProperties: false,
      };

      const result = JsonSchemaValidator.validateOpenAIStrict(schema);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return error for missing additionalProperties', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const result = JsonSchemaValidator.validateOpenAIStrict(schema);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing additionalProperties: false for strict mode');
    });

    it('should return error for schemas with $ref', () => {
      const schema = {
        type: 'object',
        properties: {
          ref: { $ref: '#/$defs/Ref' },
        },
        additionalProperties: false,
        $defs: {
          Ref: { type: 'string' },
        },
      };

      const result = JsonSchemaValidator.validateOpenAIStrict(schema);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Contains $ref, should be flattened');
    });

    it('should return error for invalid JSON Schema', () => {
      const schema = {
        type: 'invalid',
      };

      const result = JsonSchemaValidator.validateOpenAIStrict(schema);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid JSON Schema');
    });
  });
});

describe('TypeGuards', () => {
  describe('isBaseMessage', () => {
    it('should return true for valid user message', () => {
      const message = {
        role: 'user',
        content: 'Hello',
      };

      expect(TypeGuards.isBaseMessage(message)).toBe(true);
    });

    it('should return true for valid assistant message', () => {
      const message = {
        role: 'assistant',
        content: 'Hi',
      };

      expect(TypeGuards.isBaseMessage(message)).toBe(true);
    });

    it('should return false for message without role', () => {
      const message = {
        content: 'Hello',
      };

      expect(TypeGuards.isBaseMessage(message)).toBe(false);
    });

    it('should return false for message without content', () => {
      const message = {
        role: 'user',
      };

      expect(TypeGuards.isBaseMessage(message)).toBe(false);
    });

    it('should return false for non-object input', () => {
      expect(TypeGuards.isBaseMessage(null)).toBe(false);
      expect(TypeGuards.isBaseMessage(undefined)).toBe(false);
      expect(TypeGuards.isBaseMessage('string')).toBe(false);
    });
  });

  describe('isToolCall', () => {
    it('should return true for valid tool call', () => {
      const toolCall = {
        id: 'call-123',
        name: 'search',
        parameters: { query: 'test' },
      };

      expect(TypeGuards.isToolCall(toolCall)).toBe(true);
    });

    it('should return false for tool call without id', () => {
      const toolCall = {
        name: 'search',
        parameters: { query: 'test' },
      };

      expect(TypeGuards.isToolCall(toolCall)).toBe(false);
    });

    it('should return false for tool call without name', () => {
      const toolCall = {
        id: 'call-123',
        parameters: { query: 'test' },
      };

      expect(TypeGuards.isToolCall(toolCall)).toBe(false);
    });

    it('should return false for tool call without parameters', () => {
      const toolCall = {
        id: 'call-123',
        name: 'search',
      };

      expect(TypeGuards.isToolCall(toolCall)).toBe(false);
    });
  });

  describe('isTokenUsage', () => {
    it('should return true for valid token usage', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      expect(TypeGuards.isTokenUsage(usage)).toBe(true);
    });

    it('should return false for usage without promptTokens', () => {
      const usage = {
        completionTokens: 50,
        totalTokens: 150,
      };

      expect(TypeGuards.isTokenUsage(usage)).toBe(false);
    });

    it('should return false for usage without completionTokens', () => {
      const usage = {
        promptTokens: 100,
        totalTokens: 150,
      };

      expect(TypeGuards.isTokenUsage(usage)).toBe(false);
    });

    it('should return false for usage without totalTokens', () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
      };

      expect(TypeGuards.isTokenUsage(usage)).toBe(false);
    });
  });
});
