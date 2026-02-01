/**
 * Tests for executor/DomainGuard.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DomainGuard } from './DomainGuard.js';
import { DomainNotAllowedError } from '../utils/errors.js';
import type { ToolDefinition, BrowserSession } from '@mimo/agent-core/types';
import { z } from 'zod';

describe('DomainGuard', () => {
  let guard: DomainGuard;

  beforeEach(() => {
    guard = new DomainGuard();
  });

  const createMockTool = (name: string, domains?: string[]): ToolDefinition => {
    const tool: ToolDefinition = {
      name,
      execute: async () => ({}),
      description: `Test tool ${name}`,
      parameters: z.object({}),
    };
    if (domains !== undefined) {
      (tool as any).domains = domains;
    }
    return tool;
  };

  const createMockBrowser = (url?: string): BrowserSession => ({
    currentUrl: url,
  } as any);

  describe('check', () => {
    it('should return true when tool has no domain restrictions', async () => {
      const tool = createMockTool('unrestricted_tool');

      const result = await guard.check(tool, undefined);
      expect(result).toBe(true);
    });

    it('should return true when tool has empty domain array', async () => {
      const tool = createMockTool('tool_with_empty_domains', []);

      const result = await guard.check(tool, createMockBrowser('https://example.com'));
      expect(result).toBe(true);
    });

    it('should return false when no browser session', async () => {
      const tool = createMockTool('restricted_tool', ['*.allowed.com']);

      const result = await guard.check(tool, undefined);
      expect(result).toBe(false);
    });

    it('should return false when browser has no current URL', async () => {
      const tool = createMockTool('restricted_tool', ['*.allowed.com']);

      const result = await guard.check(tool, createMockBrowser(undefined));
      expect(result).toBe(false);
    });

    it('should return true when URL matches allowed pattern', async () => {
      const tool = createMockTool('restricted_tool', ['*.github.com', 'github.com']);

      const result = await guard.check(tool, createMockBrowser('https://github.com/test'));
      expect(result).toBe(true);
    });

    it('should return true when URL matches pattern with path', async () => {
      const tool = createMockTool('restricted_tool', ['github.com/*']);

      const result = await guard.check(tool, createMockBrowser('https://github.com/test/repo'));
      expect(result).toBe(true);
    });

    it('should return false when URL does not match pattern', async () => {
      const tool = createMockTool('restricted_tool', ['*.github.com']);

      const result = await guard.check(tool, createMockBrowser('https://malicious.com'));
      expect(result).toBe(false);
    });

    it('should match exact hostname patterns', async () => {
      const tool = createMockTool('restricted_tool', ['example.com']);

      const result = await guard.check(tool, createMockBrowser('https://example.com/path'));
      expect(result).toBe(true);
    });

    it('should match wildcard subdomain patterns', async () => {
      const tool = createMockTool('restricted_tool', ['*.example.com']);

      const result = await guard.check(tool, createMockBrowser('https://sub.example.com/path'));
      expect(result).toBe(true);
    });

    it('should match multiple patterns', async () => {
      const tool = createMockTool('restricted_tool', ['*.github.com', 'gitlab.com', '*.bitbucket.org']);

      expect(await guard.check(tool, createMockBrowser('https://api.github.com/repo'))).toBe(true);
      expect(await guard.check(tool, createMockBrowser('https://gitlab.com/project'))).toBe(true);
      expect(await guard.check(tool, createMockBrowser('https://my.bitbucket.org/repo'))).toBe(true);
    });
  });

  describe('validate', () => {
    it('should not throw when tool is allowed', async () => {
      const tool = createMockTool('restricted_tool', ['*.github.com']);

      await expect(
        guard.validate(tool, createMockBrowser('https://github.com/test'))
      ).resolves.not.toThrow();
    });

    it('should throw DomainNotAllowedError when not allowed', async () => {
      const tool = createMockTool('restricted_tool', ['*.allowed.com']);

      await expect(
        guard.validate(tool, createMockBrowser('https://malicious.com'))
      ).rejects.toThrow(DomainNotAllowedError);
    });

    it('should include correct error details', async () => {
      const tool = createMockTool('restricted_tool', ['*.allowed.com', 'allowed.com']);

      try {
        await guard.validate(tool, createMockBrowser('https://malicious.com'));
        expect.fail('Should have thrown DomainNotAllowedError');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainNotAllowedError);
        if (error instanceof DomainNotAllowedError) {
          expect(error.details.toolName).toBe('restricted_tool');
          expect(error.details.currentDomain).toBe('malicious.com');
          expect(error.details.allowedPatterns).toEqual(['*.allowed.com', 'allowed.com']);
        }
      }
    });

    it('should handle invalid URLs gracefully', async () => {
      const tool = createMockTool('restricted_tool', ['*.allowed.com']);

      try {
        await guard.validate(tool, createMockBrowser('not-a-valid-url'));
        expect.fail('Should have thrown DomainNotAllowedError');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainNotAllowedError);
      }
    });

    it('should throw when no browser session', async () => {
      const tool = createMockTool('restricted_tool', ['*.allowed.com']);

      await expect(
        guard.validate(tool, undefined)
      ).rejects.toThrow(DomainNotAllowedError);
    });

    it('should throw when browser has no current URL', async () => {
      const tool = createMockTool('restricted_tool', ['*.allowed.com']);

      await expect(
        guard.validate(tool, createMockBrowser(undefined))
      ).rejects.toThrow(DomainNotAllowedError);
    });
  });

  describe('edge cases', () => {
    it('should handle URLs with ports', async () => {
      const tool = createMockTool('restricted_tool', ['localhost:*']);

      const result = await guard.check(tool, createMockBrowser('http://localhost:3000'));
      expect(result).toBe(true);
    });

    it('should handle URLs with query strings', async () => {
      const tool = createMockTool('restricted_tool', ['example.com']);

      const result = await guard.check(tool, createMockBrowser('https://example.com?query=value'));
      expect(result).toBe(true);
    });

    it('should handle URLs with fragments', async () => {
      const tool = createMockTool('restricted_tool', ['example.com']);

      const result = await guard.check(tool, createMockBrowser('https://example.com#section'));
      expect(result).toBe(true);
    });

    it('should handle complex path patterns', async () => {
      const tool = createMockTool('restricted_tool', ['github.com/:user/:repo']);

      const result = await guard.check(tool, createMockBrowser('https://github.com/user/repo'));
      expect(result).toBe(true);
    });
  });
});
