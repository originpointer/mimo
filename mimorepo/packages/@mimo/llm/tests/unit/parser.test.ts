/**
 * Parser Unit Tests
 * Tests model string parsing, provider detection, and model capabilities
 */

import { describe, it, expect } from 'vitest';
import { parseModelString, getModelCapabilities } from '../../src/utils/parser.js';

describe('parseModelString', () => {
  describe('Provider/model format parsing', () => {
    it('should parse openai provider', () => {
      const result = parseModelString('openai/gpt-4o');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o');
      expect(result.fullString).toBe('openai/gpt-4o');
    });

    it('should parse anthropic provider', () => {
      const result = parseModelString('anthropic/claude-3-5-sonnet');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
      expect(result.fullString).toBe('anthropic/claude-3-5-sonnet');
    });

    it('should parse google provider', () => {
      const result = parseModelString('google/gemini-1.5-flash');

      expect(result.provider).toBe('google');
      expect(result.model).toBe('gemini-1.5-flash');
      expect(result.fullString).toBe('google/gemini-1.5-flash');
    });

    it('should parse ollama provider', () => {
      const result = parseModelString('ollama/llama3');

      expect(result.provider).toBe('ollama');
      expect(result.model).toBe('llama3');
      expect(result.fullString).toBe('ollama/llama3');
    });

    it('should handle model names with slashes', () => {
      const result = parseModelString('openai/gpt-4o/invalid');

      // Should parse first slash as provider separator
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o/invalid');
    });

    it('should handle multiple slashes in model name', () => {
      const result = parseModelString('anthropic/claude/3.5/sonnet');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude/3.5/sonnet');
    });
  });

  describe('Legacy model name detection', () => {
    it('should detect gpt-4o as openai', () => {
      const result = parseModelString('gpt-4o');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o');
      expect(result.fullString).toBe('openai/gpt-4o');
    });

    it('should detect gpt-4 as openai', () => {
      const result = parseModelString('gpt-4');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
    });

    it('should detect gpt-3.5-turbo as openai', () => {
      const result = parseModelString('gpt-3.5-turbo');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-3.5-turbo');
    });

    it('should detect o1 models as openai', () => {
      const result = parseModelString('o1-preview');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('o1-preview');
    });

    it('should detect o3 models as openai', () => {
      const result = parseModelString('o3-mini');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('o3-mini');
    });

    it('should detect claude models as anthropic', () => {
      const result = parseModelString('claude-3-5-sonnet');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
    });

    it('should detect gemini models as google', () => {
      const result = parseModelString('gemini-1.5-flash');

      expect(result.provider).toBe('google');
      expect(result.model).toBe('gemini-1.5-flash');
    });

    it('should default unknown models to openai', () => {
      const result = parseModelString('unknown-model-name');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('unknown-model-name');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = parseModelString('');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('');
    });

    it('should handle single word model', () => {
      const result = parseModelString('llama');

      expect(result.provider).toBe('openai'); // Default
      expect(result.model).toBe('llama');
    });

    it('should handle case sensitivity', () => {
      const result = parseModelString('OPENAI/GPT-4O');

      // Provider detection should be case-sensitive
      expect(result.provider).toBe('OPENAI');
      expect(result.model).toBe('GPT-4O');
    });

    it('should handle models with numbers', () => {
      const result = parseModelString('gpt-4-turbo-2024-04-09');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4-turbo-2024-04-09');
    });
  });
});

describe('getModelCapabilities', () => {
  describe('OpenAI models', () => {
    it('should return capabilities for gpt-4o', () => {
      const caps = getModelCapabilities('gpt-4o');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false);
      expect(caps.supportsThinking).toBe(false);
      expect(caps.maxTokens).toBeGreaterThan(0);
    });

    it('should return capabilities for gpt-4o-mini', () => {
      const caps = getModelCapabilities('gpt-4o-mini');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false);
      expect(caps.supportsThinking).toBe(false);
    });

    it('should return capabilities for o1 models', () => {
      const caps = getModelCapabilities('o1-preview');

      expect(caps.supportsStreaming).toBe(true); // o1-preview supports streaming
      expect(caps.supportsCaching).toBe(false);
      expect(caps.supportsThinking).toBe(true); // o1 has "thinking" tokens
    });

    it('should return capabilities for o3 models', () => {
      const caps = getModelCapabilities('o3-mini');

      expect(caps.supportsStreaming).toBe(false); // o3 doesn't support streaming
      expect(caps.supportsCaching).toBe(false);
      expect(caps.supportsThinking).toBe(true);
    });
  });

  describe('Anthropic models', () => {
    it('should return capabilities for claude-3-5-sonnet', () => {
      const caps = getModelCapabilities('claude-3-5-sonnet');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false); // Only 4-5 models support caching
      expect(caps.supportsThinking).toBe(false);
      expect(caps.maxTokens).toBe(200000); // Claude 3 series has 200k context
    });

    it('should return capabilities for claude-3-opus', () => {
      const caps = getModelCapabilities('claude-3-opus');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false); // Only 4-5 models support caching
      expect(caps.supportsThinking).toBe(false);
    });

    it('should return capabilities for claude-3-5-haiku', () => {
      const caps = getModelCapabilities('claude-3-5-haiku');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(true); // Contains 'haiku', supports caching
      expect(caps.supportsThinking).toBe(false);
    });

    it('should return capabilities for claude-opus-4', () => {
      const caps = getModelCapabilities('claude-opus-4');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false); // Opus-4 doesn't support caching
      expect(caps.supportsThinking).toBe(true); // Opus-4 is a thinking model
    });

    it('should return capabilities for claude-opus-4-5 (4-5 checked first)', () => {
      const caps = getModelCapabilities('claude-opus-4-5');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(true); // Contains '4-5', checked before 'opus-4'
      expect(caps.supportsThinking).toBe(false);
    });
  });

  describe('Google models', () => {
    it('should return capabilities for gemini-1.5-flash', () => {
      const caps = getModelCapabilities('gemini-1.5-flash');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false);
      expect(caps.supportsThinking).toBe(false);
    });

    it('should return capabilities for gemini-1.5-pro', () => {
      const caps = getModelCapabilities('gemini-1.5-pro');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false);
      expect(caps.supportsThinking).toBe(false);
    });

    it('should return capabilities for gemini-2.0', () => {
      const caps = getModelCapabilities('gemini-2.0-flash-exp');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false);
      expect(caps.supportsThinking).toBe(false);
    });
  });

  describe('Provider/model format', () => {
    it('should work with provider/model format', () => {
      const caps = getModelCapabilities('openai/gpt-4o');

      expect(caps.supportsStreaming).toBe(true);
    });

    it('should work with anthropic/ format', () => {
      const caps = getModelCapabilities('anthropic/claude-3-5-sonnet');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false); // '3-5' doesn't match '4-5' condition
    });
  });

  describe('Unknown models', () => {
    it('should return default capabilities for unknown models', () => {
      const caps = getModelCapabilities('unknown-model');

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsCaching).toBe(false);
      expect(caps.supportsThinking).toBe(false);
      expect(caps.maxTokens).toBe(128000); // Default maxTokens
    });
  });
});
