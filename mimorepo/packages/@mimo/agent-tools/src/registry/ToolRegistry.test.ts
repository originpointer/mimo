/**
 * Tests for registry/ToolRegistry.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from './ToolRegistry.js';
import type { ToolDefinition, ToolTag, ToolPolicy } from '@mimo/agent-core/types';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  const createMockTool = (
    name: string,
    tags?: ToolTag[],
    group?: string
  ): ToolDefinition => ({
    name,
    execute: async () => ({}),
    description: `Test tool ${name}`,
    parameters: {},
    tags,
    group,
  });

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      expect(registry.size()).toBe(1);
      expect(registry.getTool('test_tool')).toEqual(tool);
    });

    it('should throw when registering duplicate tool', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      expect(() => registry.register(tool)).toThrow('Tool "test_tool" is already registered');
    });

    it('should index tool by tags', () => {
      const tool = createMockTool('test_tool', ['filesystem', 'read']);
      registry.register(tool);

      const results = registry.findToolsByTag('filesystem');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test_tool');
    });

    it('should index tool by group', () => {
      const tool = createMockTool('test_tool', undefined, 'browser');
      registry.register(tool);

      const results = registry.getGroup('browser');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test_tool');
    });
  });

  describe('registerBatch', () => {
    it('should register multiple tools', () => {
      const tools = [
        createMockTool('tool1'),
        createMockTool('tool2'),
        createMockTool('tool3'),
      ];
      registry.registerBatch(tools);

      expect(registry.size()).toBe(3);
    });
  });

  describe('unregister', () => {
    it('should remove tool from registry', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);
      registry.unregister('test_tool');

      expect(registry.getTool('test_tool')).toBeNull();
      expect(registry.size()).toBe(0);
    });

    it('should remove tool from tag index', () => {
      const tool = createMockTool('test_tool', ['filesystem']);
      registry.register(tool);
      registry.unregister('test_tool');

      expect(registry.findToolsByTag('filesystem')).toHaveLength(0);
    });

    it('should remove tool from group index', () => {
      const tool = createMockTool('test_tool', undefined, 'browser');
      registry.register(tool);
      registry.unregister('test_tool');

      expect(registry.getGroup('browser')).toHaveLength(0);
    });

    it('should handle unregistering non-existent tool', () => {
      expect(() => registry.unregister('non_existent')).not.toThrow();
    });

    it('should clean up empty tag indexes', () => {
      const tool = createMockTool('test_tool', ['filesystem']);
      registry.register(tool);
      registry.unregister('test_tool');

      const results = registry.findToolsByTag('filesystem');
      expect(results).toHaveLength(0);
    });

    it('should clean up empty group indexes', () => {
      const tool = createMockTool('test_tool', undefined, 'browser');
      registry.register(tool);
      registry.unregister('test_tool');

      expect(registry.getGroups()).not.toContain('browser');
    });
  });

  describe('getTool', () => {
    it('should return tool by name', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      expect(registry.getTool('test_tool')).toEqual(tool);
    });

    it('should return null for non-existent tool', () => {
      expect(registry.getTool('non_existent')).toBeNull();
    });
  });

  describe('getTools', () => {
    it('should return all tools', () => {
      const tools = [
        createMockTool('tool1'),
        createMockTool('tool2'),
        createMockTool('tool3'),
      ];
      registry.registerBatch(tools);

      const results = registry.getTools();
      expect(results).toHaveLength(3);
      expect(results.map(t => t.name)).toEqual(['tool1', 'tool2', 'tool3']);
    });

    it('should return empty array when no tools', () => {
      expect(registry.getTools()).toEqual([]);
    });
  });

  describe('findToolsByTag', () => {
    it('should find tools with single tag', () => {
      registry.register(createMockTool('tool1', ['filesystem']));
      registry.register(createMockTool('tool2', ['browser']));
      registry.register(createMockTool('tool3', ['filesystem']));

      const results = registry.findToolsByTag('filesystem');
      expect(results.map(t => t.name)).toEqual(['tool1', 'tool3']);
    });

    it('should find tools with multiple tags (AND logic)', () => {
      registry.register(createMockTool('tool1', ['filesystem', 'read']));
      registry.register(createMockTool('tool2', ['filesystem', 'write']));
      registry.register(createMockTool('tool3', ['filesystem', 'read']));

      const results = registry.findToolsByTag('filesystem', 'read');
      expect(results.map(t => t.name)).toEqual(['tool1', 'tool3']);
    });

    it('should return all tools when no tags specified', () => {
      registry.registerBatch([
        createMockTool('tool1', ['filesystem']),
        createMockTool('tool2', ['browser']),
      ]);

      const results = registry.findToolsByTag();
      expect(results).toHaveLength(2);
    });

    it('should return empty when tag not found', () => {
      registry.register(createMockTool('tool1', ['filesystem']));

      const results = registry.findToolsByTag('non_existent');
      expect(results).toEqual([]);
    });

    it('should return empty when tool does not have all specified tags', () => {
      registry.register(createMockTool('tool1', ['filesystem']));

      const results = registry.findToolsByTag('filesystem', 'read');
      expect(results).toEqual([]);
    });
  });

  describe('filterTools', () => {
    beforeEach(() => {
      registry.registerBatch([
        createMockTool('tool1'),
        createMockTool('browser_click'),
        createMockTool('browser_navigate'),
        createMockTool('tool2'),
      ]);
    });

    it('should return all tools when no policy', () => {
      const policy: ToolPolicy = {};
      const results = registry.filterTools(policy);

      expect(results).toHaveLength(4);
    });

    it('should filter by allow list', () => {
      const policy: ToolPolicy = {
        allow: ['tool1', 'tool2'],
      };
      const results = registry.filterTools(policy);

      expect(results.map(t => t.name)).toEqual(['tool1', 'tool2']);
    });

    it('should filter by deny list', () => {
      const policy: ToolPolicy = {
        deny: ['browser_*'],
      };
      const results = registry.filterTools(policy);

      expect(results.map(t => t.name)).toEqual(['tool1', 'tool2']);
    });

    it('should apply deny before allow', () => {
      const policy: ToolPolicy = {
        allow: ['browser_*'],
        deny: ['browser_click'],
      };
      const results = registry.filterTools(policy);

      expect(results.map(t => t.name)).toEqual(['browser_navigate']);
    });

    it('should support wildcard prefix matching', () => {
      const policy: ToolPolicy = {
        allow: ['browser_*'],
      };
      const results = registry.filterTools(policy);

      expect(results.map(t => t.name)).toEqual(['browser_click', 'browser_navigate']);
    });

    it('should support wildcard suffix matching', () => {
      registry.register(createMockTool('test_click'));
      registry.register(createMockTool('test_navigate'));

      const policy: ToolPolicy = {
        allow: ['*_click'],
      };
      const results = registry.filterTools(policy);

      expect(results.map(t => t.name)).toContain('test_click');
      expect(results.map(t => t.name)).not.toContain('test_navigate');
    });
  });

  describe('isToolAllowed', () => {
    beforeEach(() => {
      registry.register(createMockTool('browser_click'));
      registry.register(createMockTool('read_file'));
    });

    it('should return true when no restrictions', () => {
      const policy: ToolPolicy = {};
      expect(registry.isToolAllowed('browser_click', policy)).toBe(true);
    });

    it('should return false when tool is denied', () => {
      const policy: ToolPolicy = {
        deny: ['browser_*'],
      };
      expect(registry.isToolAllowed('browser_click', policy)).toBe(false);
    });

    it('should return true when tool is allowed', () => {
      const policy: ToolPolicy = {
        allow: ['browser_*'],
      };
      expect(registry.isToolAllowed('browser_click', policy)).toBe(true);
    });

    it('should return false when tool not in allow list', () => {
      const policy: ToolPolicy = {
        allow: ['browser_*'],
      };
      expect(registry.isToolAllowed('read_file', policy)).toBe(false);
    });

    it('should give deny precedence over allow', () => {
      const policy: ToolPolicy = {
        allow: ['browser_*'],
        deny: ['browser_click'],
      };
      expect(registry.isToolAllowed('browser_click', policy)).toBe(false);
    });
  });

  describe('getGroup', () => {
    it('should return tools in group', () => {
      registry.register(createMockTool('tool1', undefined, 'browser'));
      registry.register(createMockTool('tool2', undefined, 'filesystem'));
      registry.register(createMockTool('tool3', undefined, 'browser'));

      const results = registry.getGroup('browser');
      expect(results.map(t => t.name)).toEqual(['tool1', 'tool3']);
    });

    it('should return empty array for non-existent group', () => {
      expect(registry.getGroup('non_existent')).toEqual([]);
    });
  });

  describe('getGroups', () => {
    it('should return all group names', () => {
      registry.register(createMockTool('tool1', undefined, 'browser'));
      registry.register(createMockTool('tool2', undefined, 'filesystem'));
      registry.register(createMockTool('tool3', undefined, 'browser'));

      const groups = registry.getGroups();
      expect(groups).toHaveLength(2);
      expect(groups).toContain('browser');
      expect(groups).toContain('filesystem');
    });

    it('should return empty array when no groups', () => {
      expect(registry.getGroups()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return tool count', () => {
      registry.registerBatch([
        createMockTool('tool1'),
        createMockTool('tool2'),
        createMockTool('tool3'),
      ]);

      expect(registry.size()).toBe(3);
    });

    it('should return 0 when empty', () => {
      expect(registry.size()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all tools and indexes', () => {
      registry.register(createMockTool('tool1', ['tag1'], 'group1'));
      registry.register(createMockTool('tool2', ['tag2'], 'group2'));

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.getTools()).toEqual([]);
      expect(registry.findToolsByTag('tag1')).toEqual([]);
      expect(registry.getGroups()).toEqual([]);
    });
  });
});
