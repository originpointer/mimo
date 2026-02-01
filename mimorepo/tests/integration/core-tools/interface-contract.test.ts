/**
 * IToolRegistry Interface Contract Tests
 *
 * Verifies that @mimo/agent-tools correctly implements the IToolRegistry
 * interface defined in @mimo/agent-core.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from '@mimo/agent-tools';
import type { IToolRegistry } from '@mimo/agent-core';
import type { ToolDefinition } from '@mimo/agent-core';
import { ToolTag } from '@mimo/agent-core';
import { z } from 'zod';

describe('IToolRegistry Interface Contract', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  const createMockTool = (
    name: string,
    tags?: ToolTag[],
    group?: string
  ): ToolDefinition => ({
    name,
    description: `Test tool ${name}`,
    parameters: z.object({}),
    execute: async () => ({ result: 'ok' }),
    tags,
  });

  describe('required methods', () => {
    it('should have register method', () => {
      expect(typeof registry.register).toBe('function');
    });

    it('should have registerBatch method', () => {
      expect(typeof registry.registerBatch).toBe('function');
    });

    it('should have unregister method', () => {
      expect(typeof registry.unregister).toBe('function');
    });

    it('should have getTool method', () => {
      expect(typeof registry.getTool).toBe('function');
    });

    it('should has getTools method', () => {
      expect(typeof registry.getTools).toBe('function');
    });

    it('should have findToolsByTag method', () => {
      expect(typeof registry.findToolsByTag).toBe('function');
    });

    it('should have filterTools method', () => {
      expect(typeof registry.filterTools).toBe('function');
    });

    it('should have getGroup method', () => {
      expect(typeof registry.getGroup).toBe('function');
    });

    it('should have isToolAllowed method', () => {
      expect(typeof registry.isToolAllowed).toBe('function');
    });
  });

  describe('interface satisfaction', () => {
    it('should satisfy IToolRegistry interface', () => {
      const iToolRegistry: IToolRegistry = registry;
      expect(iToolRegistry).toBeDefined();
    });
  });

  describe('register method', () => {
    it('should register tool and update index', () => {
      const tool = createMockTool('test_tool', [ToolTag.WEB_SEARCH]);
      registry.register(tool);

      expect(registry.getTool('test_tool')).toEqual(tool);
      expect(registry.findToolsByTag(ToolTag.WEB_SEARCH)).toContain(tool);
    });

    it('should return void', () => {
      const tool = createMockTool('test_tool');
      const result = registry.register(tool);
      expect(result).toBeUndefined();
    });
  });

  describe('registerBatch method', () => {
    it('should register multiple tools', () => {
      const tools = [
        createMockTool('tool1', [ToolTag.FILE_READ]),
        createMockTool('tool2', [ToolTag.FILE_WRITE]),
        createMockTool('tool3', [ToolTag.WEB_SEARCH]),
      ];

      registry.registerBatch(tools);

      expect(registry.getTools()).toHaveLength(3);
      expect(registry.getTool('tool1')).toBeDefined();
      expect(registry.getTool('tool2')).toBeDefined();
      expect(registry.getTool('tool3')).toBeDefined();
    });

    it('should return void', () => {
      const tools = [createMockTool('tool1')];
      const result = registry.registerBatch(tools);
      expect(result).toBeUndefined();
    });
  });

  describe('unregister method', () => {
    it('should unregister tool and clean up indexes', () => {
      const tool = createMockTool('test_tool', [ToolTag.WEB_SEARCH]);
      registry.register(tool);

      expect(registry.getTool('test_tool')).toEqual(tool);

      registry.unregister('test_tool');

      expect(registry.getTool('test_tool')).toBeNull();
      expect(registry.findToolsByTag(ToolTag.WEB_SEARCH)).toEqual([]);
    });

    it('should return void', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);
      const result = registry.unregister('test_tool');
      expect(result).toBeUndefined();
    });
  });

  describe('getTool method', () => {
    it('should return tool by name', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      const result = registry.getTool('test_tool');
      expect(result).toEqual(tool);
    });

    it('should return null for non-existent tool', () => {
      const result = registry.getTool('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('findToolsByTag method', () => {
    it('should return tools with matching tag', () => {
      const tool1 = createMockTool('tool1', [ToolTag.WEB_SEARCH]);
      const tool2 = createMockTool('tool2', [ToolTag.WEB_SEARCH]);
      const tool3 = createMockTool('tool3', [ToolTag.WEB_FETCH]);

      registry.registerBatch([tool1, tool2, tool3]);

      const results = registry.findToolsByTag(ToolTag.WEB_SEARCH);
      expect(results).toHaveLength(2);
      expect(results).toContain(tool1);
      expect(results).toContain(tool2);
    });

    it('should return empty array for non-existent tag', () => {
      const results = registry.findToolsByTag(ToolTag.WEB_SEARCH);
      expect(results).toEqual([]);
    });
  });

  describe('filterTools method', () => {
    it('should filter tools by policy', () => {
      const tool1 = createMockTool('safe_tool');
      const tool2 = createMockTool('dangerous_delete');

      registry.registerBatch([tool1, tool2]);

      const policy = { deny: ['dangerous_*'] };
      const results = registry.filterTools(policy);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('safe_tool');
    });
  });

  describe('getGroup method', () => {
    it('should return tools in group', () => {
      const tool1 = createMockTool('tool1', [ToolTag.FILE_READ]);
      const tool2 = createMockTool('tool2', [ToolTag.FILE_WRITE]);
      const tool3 = createMockTool('tool3', [ToolTag.WEB_SEARCH]);

      registry.registerBatch([tool1, tool2, tool3]);

      const results = registry.getGroup('group:file');
      expect(results).toHaveLength(2);
      expect(results).toContain(tool1);
      expect(results).toContain(tool2);
    });

    it('should return empty array for non-existent group', () => {
      const results = registry.getGroup('non_existent');
      expect(results).toEqual([]);
    });
  });

  describe('isToolAllowed method', () => {
    it('should check tool permission', () => {
      const tool = createMockTool('safe_tool');
      registry.register(tool);

      const policy = { allow: ['safe_*'] };
      const allowed = registry.isToolAllowed(tool.name, policy);

      expect(allowed).toBe(true);
    });

    it('should deny tools matching deny pattern', () => {
      const tool = createMockTool('dangerous_delete');
      registry.register(tool);

      const policy = { deny: ['dangerous_*'] };
      const allowed = registry.isToolAllowed(tool.name, policy);

      expect(allowed).toBe(false);
    });
  });
});
