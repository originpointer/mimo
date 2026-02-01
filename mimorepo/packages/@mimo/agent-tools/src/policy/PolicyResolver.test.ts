/**
 * Tests for policy/PolicyResolver.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { PolicyResolver, type PolicyConfig } from './PolicyResolver.js';
import type { ToolDefinition, ToolExecutionContext, Logger, BrowserSession } from '@mimo/agent-core/types';
import { z } from 'zod';

const createMockLogger = (): Partial<Logger> => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
});

const createMockBrowser = (url: string): Partial<BrowserSession> => ({
  clientId: 'test-client',
  browserName: 'chrome',
  ua: 'test-ua',
  allowOtherClient: false,
  connected: true,
  currentUrl: url,
});

describe('PolicyResolver', () => {
  const createMockTool = (name: string, domains?: string[]): ToolDefinition => {
    const tool: ToolDefinition = {
      name,
      execute: vi.fn(),
      description: `Test tool ${name}`,
      parameters: z.object({}),
    };
    if (domains !== undefined) {
      (tool as any).domains = domains;
    }
    return tool;
  };

  const createMockContext = (url?: string): ToolExecutionContext => {
    const context: ToolExecutionContext = {
      logger: createMockLogger() as Logger,
    };
    if (url !== undefined) {
      context.browser = createMockBrowser(url) as BrowserSession;
    }
    return context;
  };

  describe('StaticToolPolicy layer', () => {
    it('should allow explicitly allowed tools', async () => {
      const config: PolicyConfig = {
        tools: { read_file: 'allow' },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('read_file'),
        createMockContext()
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny explicitly denied tools', async () => {
      const config: PolicyConfig = {
        tools: { delete_file: 'deny' },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('delete_file'),
        createMockContext()
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Denied by StaticToolPolicy');
      expect(result.layer).toBe('StaticToolPolicy');
    });

    it('should allow tools matching wildcard allow pattern', async () => {
      const config: PolicyConfig = {
        tools: { 'browser_*': 'allow' },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('browser_click'),
        createMockContext()
      );

      expect(result.allowed).toBe(true);
    });

    it('should deny tools matching wildcard deny pattern', async () => {
      const config: PolicyConfig = {
        tools: { 'dangerous_*': 'deny' },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('dangerous_delete'),
        createMockContext()
      );

      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('StaticToolPolicy');
    });

    it('should be neutral for tools not in policy', async () => {
      const config: PolicyConfig = {
        tools: { read_file: 'allow' },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('write_file'),
        createMockContext()
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('DomainRestrictions layer', () => {
    it('should allow tool when URL matches pattern', async () => {
      const config: PolicyConfig = {
        domains: {
          browser_navigate: ['*.github.com', 'github.com'],
        },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('browser_navigate'),
        createMockContext('https://github.com/test')
      );

      expect(result.allowed).toBe(true);
    });

    it('should be neutral when no browser context', async () => {
      const config: PolicyConfig = {
        domains: {
          browser_navigate: ['*.github.com'],
        },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('browser_navigate'),
        createMockContext()
      );

      expect(result.allowed).toBe(true);
    });

    it('should be neutral when tool has no domain restrictions', async () => {
      const config: PolicyConfig = {
        domains: {
          browser_navigate: ['*.github.com'],
        },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('read_file'),
        createMockContext('https://malicious.com')
      );

      expect(result.allowed).toBe(true);
    });

    it('should be neutral when URL does not match pattern', async () => {
      const config: PolicyConfig = {
        domains: {
          browser_navigate: ['*.github.com'],
        },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('browser_navigate'),
        createMockContext('https://malicious.com')
      );

      expect(result.allowed).toBe(true);
    });

    it('should match hostname and pathname', async () => {
      const config: PolicyConfig = {
        domains: {
          browser_navigate: ['github.com/*'],
        },
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('browser_navigate'),
        createMockContext('https://github.com/test/repo')
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('ContextOverride layer', () => {
    it('should allow when override returns true', async () => {
      const overrideFn = vi.fn().mockResolvedValue(true);
      const config: PolicyConfig = {
        override: overrideFn,
      };
      const resolver = new PolicyResolver(config);

      const tool = createMockTool('test_tool');
      const context = createMockContext();

      const result = await resolver.resolve(tool, context);

      expect(result.allowed).toBe(true);
      expect(overrideFn).toHaveBeenCalledWith(tool, context);
    });

    it('should deny when override returns false', async () => {
      const overrideFn = vi.fn().mockResolvedValue(false);
      const config: PolicyConfig = {
        override: overrideFn,
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('test_tool'),
        createMockContext()
      );

      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('ContextOverride');
    });

    it('should be neutral when no override', async () => {
      const config: PolicyConfig = {};
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('test_tool'),
        createMockContext()
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('Layer priority', () => {
    it('should deny when StaticToolPolicy denies', async () => {
      const config: PolicyConfig = {
        tools: { dangerous_tool: 'deny' },
        override: vi.fn().mockResolvedValue(true),
      };
      const resolver = new PolicyResolver(config);

      const result = await resolver.resolve(
        createMockTool('dangerous_tool'),
        createMockContext()
      );

      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('StaticToolPolicy');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', async () => {
      const resolver = new PolicyResolver({
        tools: { read_file: 'allow' },
      });

      resolver.updateConfig({
        tools: { read_file: 'deny' },
      });

      const result = await resolver.resolve(
        createMockTool('read_file'),
        createMockContext()
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('addLayer', () => {
    it('should add custom policy layer', async () => {
      const resolver = new PolicyResolver();

      const customLayer = {
        name: 'CustomLayer',
        evaluate: vi.fn().mockResolvedValue('deny' as const),
      };

      resolver.addLayer(customLayer);

      const result = await resolver.resolve(
        createMockTool('test_tool'),
        createMockContext()
      );

      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('CustomLayer');
    });
  });
});
