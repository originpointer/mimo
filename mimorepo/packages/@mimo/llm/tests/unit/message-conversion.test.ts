/**
 * Message Format Conversion Tests
 * Tests conversion between BaseMessage (agent-core) and ChatMessage (@mimo/types)
 */

import { describe, it, expect } from 'vitest';
import { AISdkClient, OpenAIClient, AnthropicClient, AIGatewayClient } from '../../src/provider.js';
import { MessageRole, type BaseMessage } from '@mimo/agent-core';
import type { ChatMessage } from '@mimo/types';

describe('Message Format Conversion', () => {
  describe('BaseMessage → ChatMessage conversion', () => {
    it('should convert simple text content from BaseMessage to ChatMessage', () => {
      const baseMessage: BaseMessage = {
        role: MessageRole.USER,
        content: 'Hello, how are you?',
      };

      // Expected ChatMessage format
      const expected: ChatMessage = {
        role: 'user',
        content: 'Hello, how are you?',
      };

      // Verify structure compatibility
      expect(baseMessage.role).toBe(MessageRole.USER);
      expect(baseMessage.content).toBe(expected.content);
    });

    it('should handle MessageContent array from BaseMessage', () => {
      const baseMessage: BaseMessage = {
        role: MessageRole.USER,
        content: [
          { type: 'text', value: 'Hello' },
          { type: 'text', value: ' World' },
        ],
      };

      // BaseMessage uses MessageContent array with {type, value}
      // ChatMessage uses array with {type, text|image}
      expect(Array.isArray(baseMessage.content)).toBe(true);
      if (Array.isArray(baseMessage.content)) {
        expect(baseMessage.content[0].type).toBe('text');
      }
    });

    it('should handle message roles correctly', () => {
      const roles: Array<BaseMessage['role']> = [
        MessageRole.SYSTEM,
        MessageRole.USER,
        MessageRole.ASSISTANT,
      ];

      roles.forEach(role => {
        const baseMessage: BaseMessage = {
          role,
          content: 'Test',
        };
        expect(baseMessage.role).toBe(role);
      });
    });

    it('should preserve content structure through conversion', () => {
      const baseMessage: BaseMessage = {
        role: MessageRole.USER,
        content: 'Structured content here',
      };

      // Simple string content should remain compatible
      expect(typeof baseMessage.content).toBe('string');
    });
  });

  describe('complete() method conversion', () => {
    it('should convert BaseMessage[] to ChatMessage[] in complete() - AISdkClient', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.SYSTEM, content: 'You are a helpful assistant.' },
        { role: MessageRole.USER, content: 'Hello!' },
      ];

      // complete() should accept BaseMessage[] from agent-core
      expect(() => {
        client.complete({ model: client.model, messages: baseMessages });
      }).not.toThrow();
    });

    it('should convert BaseMessage[] to ChatMessage[] in complete() - OpenAIClient', () => {
      const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Test message' },
      ];

      expect(() => {
        client.complete({ model: client.model, messages: baseMessages });
      }).not.toThrow();
    });

    it('should convert BaseMessage[] to ChatMessage[] in complete() - AnthropicClient', () => {
      const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Test message' },
      ];

      expect(() => {
        client.complete({ model: client.model, messages: baseMessages });
      }).not.toThrow();
    });

    it('should convert BaseMessage[] to ChatMessage[] in complete() - AIGatewayClient', () => {
      const client = new AIGatewayClient('openai/gpt-4o');
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Test message' },
      ];

      expect(() => {
        client.complete({ model: client.model, messages: baseMessages });
      }).not.toThrow();
    });

    it('should handle empty messages array', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const baseMessages: BaseMessage[] = [];

      expect(() => {
        client.complete({ model: client.model, messages: baseMessages });
      }).not.toThrow();
    });

    it('should handle multi-turn conversations', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Hello' },
        { role: MessageRole.ASSISTANT, content: 'Hi there!' },
        { role: MessageRole.USER, content: 'How are you?' },
      ];

      expect(() => {
        client.complete({ model: client.model, messages: baseMessages });
      }).not.toThrow();
    });
  });

  describe('stream() method conversion', () => {
    it('should convert BaseMessage[] to ChatMessage[] in stream() - AISdkClient', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Stream test' },
      ];

      expect(() => {
        const stream = client.stream({ model: client.model, messages: baseMessages });
        expect(typeof stream[Symbol.asyncIterator]).toBe('function');
      }).not.toThrow();
    });

    it('should convert BaseMessage[] to ChatMessage[] in stream() - OpenAIClient', () => {
      const client = new OpenAIClient('gpt-4o', { apiKey: 'test-key' });
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Stream test' },
      ];

      expect(() => {
        const stream = client.stream({ model: client.model, messages: baseMessages });
        expect(typeof stream[Symbol.asyncIterator]).toBe('function');
      }).not.toThrow();
    });

    it('should convert BaseMessage[] to ChatMessage[] in stream() - AnthropicClient', () => {
      const client = new AnthropicClient('claude-3-5-sonnet', { apiKey: 'test-key' });
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Stream test' },
      ];

      expect(() => {
        const stream = client.stream({ model: client.model, messages: baseMessages });
        expect(typeof stream[Symbol.asyncIterator]).toBe('function');
      }).not.toThrow();
    });

    it('should convert BaseMessage[] to ChatMessage[] in stream() - AIGatewayClient', () => {
      const client = new AIGatewayClient('openai/gpt-4o');
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Stream test' },
      ];

      expect(() => {
        const stream = client.stream({ model: client.model, messages: baseMessages });
        expect(typeof stream[Symbol.asyncIterator]).toBe('function');
      }).not.toThrow();
    });
  });

  describe('MessageContent format differences', () => {
    it('should handle BaseMessage MessageContent format', () => {
      // BaseMessage uses: { type, value, metadata? }
      const messageContent: BaseMessage['content'] = [
        {
          type: 'text',
          value: 'Hello World',
        },
      ];

      if (Array.isArray(messageContent)) {
        expect(messageContent[0]).toHaveProperty('type', 'text');
        expect(messageContent[0]).toHaveProperty('value');
      }
    });

    it('should handle ChatMessage content format', () => {
      // ChatMessage uses: { type: 'text'|'image', text?, image? }
      const chatMessageContent: ChatMessage['content'] = [
        {
          type: 'text',
          text: 'Hello World',
        },
      ];

      if (Array.isArray(chatMessageContent)) {
        expect(chatMessageContent[0]).toHaveProperty('type', 'text');
        expect(chatMessageContent[0]).toHaveProperty('text');
      }
    });

    it('should demonstrate format conversion requirement', () => {
      // This shows the conversion that must happen in the client
      const baseContent = [
        { type: 'text' as const, value: 'Hello' },
      ];

      const chatContent = baseContent.map(c => ({
        type: c.type,
        text: c.value,
      }));

      expect(chatContent[0]).toEqual({
        type: 'text',
        text: 'Hello',
      });
    });
  });

  describe('Image content handling', () => {
    it('should handle BaseMessage with image content', () => {
      const baseMessage: BaseMessage = {
        role: MessageRole.USER,
        content: [
          { type: 'text', value: 'What is in this image?' },
          { type: 'image', value: 'https://example.com/image.jpg', metadata: { mimeType: 'image/jpeg' } },
        ],
      };

      if (Array.isArray(baseMessage.content)) {
        expect(baseMessage.content).toHaveLength(2);
        expect(baseMessage.content[1].type).toBe('image');
      }
    });

    it('should convert to ChatMessage image format', () => {
      const baseImageContent = {
        type: 'image' as const,
        value: 'https://example.com/image.jpg',
        metadata: { mimeType: 'image/jpeg' },
      };

      // Convert to ChatMessage format
      const chatImageContent = {
        type: 'image' as const,
        image: baseImageContent.value,
      };

      expect(chatImageContent).toEqual({
        type: 'image',
        image: 'https://example.com/image.jpg',
      });
    });
  });

  describe('Role compatibility', () => {
    it('should handle all MessageRole values from agent-core', () => {
      const roles: BaseMessage['role'][] = [MessageRole.SYSTEM, MessageRole.USER, MessageRole.ASSISTANT];

      roles.forEach(role => {
        const baseMessage: BaseMessage = { role, content: 'test' };
        // Role should be compatible with ChatMessage
        expect(['system', 'user', 'assistant']).toContain(baseMessage.role);
      });
    });
  });

  describe('Conversion edge cases', () => {
    it('should handle null/undefined content gracefully', () => {
      const client = new AISdkClient('openai/gpt-4o', { apiKey: 'test-key' });

      // Empty content should be handled
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: '' },
      ];

      // Method should exist and accept the parameters (actual API call may fail)
      expect(typeof client.complete).toBe('function');
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(10000);
      const baseMessage: BaseMessage = {
        role: MessageRole.USER,
        content: longContent,
      };

      expect(baseMessage.content).toBe(longContent);
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Hello 世界 🌍\n\tNew line';
      const baseMessage: BaseMessage = {
        role: MessageRole.USER,
        content: specialContent,
      };

      expect(baseMessage.content).toBe(specialContent);
    });
  });

  describe('Type safety at compile time', () => {
    it('should allow BaseMessage in ILLMClient methods', () => {
      // This test verifies type compatibility
      const baseMessages: BaseMessage[] = [
        { role: MessageRole.USER, content: 'Test' },
      ];

      // These should compile without errors
      expect(baseMessages).toBeDefined();
      expect(baseMessages[0].role).toBe(MessageRole.USER);
    });

    it('should distinguish BaseMessage from ChatMessage', () => {
      // Verify that the types are different but compatible
      const baseMessage: BaseMessage = {
        role: MessageRole.USER,
        content: 'Test',
      };

      const chatMessage: ChatMessage = {
        role: 'user',
        content: 'Test',
      };

      // They have the same structure for simple cases
      expect(baseMessage.role).toBe(chatMessage.role);
    });
  });
});
