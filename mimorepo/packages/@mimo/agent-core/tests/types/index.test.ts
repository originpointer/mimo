import { describe, it, expect } from 'vitest';
import {
  Role,
  type BaseMessage,
  type UserMessage,
  type AssistantMessage,
  type ToolMessage,
  type SystemMessage,
  type ToolCall,
  type TokenUsage,
  type LLMResponse,
  type LLMRequestOptions,
} from '../../src/types';

describe('Types - Message', () => {
  describe('BaseMessage', () => {
    it('should create a valid user message', () => {
      const message: BaseMessage = {
        role: Role.USER,
        content: 'Hello, world!',
      };
      expect(message.role).toBe(Role.USER);
      expect(message.content).toBe('Hello, world!');
    });

    it('should create a valid assistant message', () => {
      const message: BaseMessage = {
        role: Role.ASSISTANT,
        content: 'Hi there!',
      };
      expect(message.role).toBe(Role.ASSISTANT);
    });

    it('should create a valid tool message', () => {
      const message: BaseMessage = {
        role: Role.TOOL,
        content: 'Result from tool',
        toolCallId: 'call-123',
      };
      expect(message.role).toBe(Role.TOOL);
      expect(message.toolCallId).toBe('call-123');
    });

    it('should create a valid system message', () => {
      const message: BaseMessage = {
        role: Role.SYSTEM,
        content: 'You are a helpful assistant.',
      };
      expect(message.role).toBe(Role.SYSTEM);
    });
  });

  describe('TokenUsage', () => {
    it('should create valid token usage', () => {
      const usage: TokenUsage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };
      expect(usage.promptTokens).toBe(100);
      expect(usage.completionTokens).toBe(50);
      expect(usage.totalTokens).toBe(150);
    });

    it('should calculate total tokens correctly', () => {
      const usage: TokenUsage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };
      expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens);
    });
  });

  describe('ToolCall', () => {
    it('should create a valid tool call', () => {
      const toolCall: ToolCall = {
        id: 'call-123',
        name: 'search',
        parameters: { query: 'test' },
      };
      expect(toolCall.id).toBe('call-123');
      expect(toolCall.name).toBe('search');
      expect(toolCall.parameters).toEqual({ query: 'test' });
    });
  });

  describe('LLMRequestOptions', () => {
    it('should create valid request options', () => {
      const options: LLMRequestOptions = {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        stop: ['END'],
      };
      expect(options.temperature).toBe(0.7);
      expect(options.maxTokens).toBe(1000);
    });

    it('should have default values for optional fields', () => {
      const options: LLMRequestOptions = {};
      expect(options.temperature).toBeUndefined();
      expect(options.maxTokens).toBeUndefined();
    });
  });

  describe('LLMResponse', () => {
    it('should create a valid response with content', () => {
      const response: LLMResponse = {
        content: 'Hello, how can I help?',
        model: 'gpt-4',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
      };
      expect(response.content).toBe('Hello, how can I help?');
      expect(response.model).toBe('gpt-4');
      expect(response.usage.totalTokens).toBe(15);
    });

    it('should create a valid response with tool calls', () => {
      const response: LLMResponse = {
        content: null,
        toolCalls: [
          {
            id: 'call-1',
            name: 'search',
            parameters: { query: 'test' },
          },
        ],
        model: 'gpt-4',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };
      expect(response.content).toBeNull();
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe('search');
    });
  });
});
