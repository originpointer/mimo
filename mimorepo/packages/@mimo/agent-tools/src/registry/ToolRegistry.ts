/**
 * Tool Registry - Implementation of IToolRegistry with group indexing
 */

import type {
  ToolDefinition,
  ToolTag,
} from '@mimo/agent-core/types';
import type {
  IToolRegistry,
  ToolPolicy,
} from '@mimo/agent-core/interfaces';

/**
 * Tool Registry
 * Implements IToolRegistry from agent-core with added group indexing support
 */
export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private tagIndex: Map<ToolTag, Set<string>> = new Map();
  private groupIndex: Map<string, Set<string>> = new Map();

  /**
   * Register a single tool
   */
  register<T>(tool: ToolDefinition<T>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }

    this.tools.set(tool.name, tool);

    // Index by tags
    if (tool.tags) {
      for (const tag of tool.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(tool.name);
      }
    }

    // Index by group
    if (tool.group) {
      if (!this.groupIndex.has(tool.group)) {
        this.groupIndex.set(tool.group, new Set());
      }
      this.groupIndex.get(tool.group)!.add(tool.name);
    }
  }

  /**
   * Register multiple tools at once
   */
  registerBatch<T>(tools: ToolDefinition<T>[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    const tool = this.tools.get(name);
    if (!tool) {
      return;
    }

    // Remove from tag index
    if (tool.tags) {
      for (const tag of tool.tags) {
        this.tagIndex.get(tag)?.delete(name);
        if (this.tagIndex.get(tag)?.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // Remove from group index
    if (tool.group) {
      this.groupIndex.get(tool.group)?.delete(name);
      if (this.groupIndex.get(tool.group)?.size === 0) {
        this.groupIndex.delete(tool.group);
      }
    }

    this.tools.delete(name);
  }

  /**
   * Get all tools
   */
  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolDefinition | null {
    return this.tools.get(name) || null;
  }

  /**
   * Find tools by tags
   */
  findToolsByTag(...tags: ToolTag[]): ToolDefinition[] {
    if (tags.length === 0) {
      return this.getTools();
    }

    // Find tools that have ALL the specified tags
    const toolNames = new Set<string>();

    for (const tag of tags) {
      const names = this.tagIndex.get(tag);
      if (!names) {
        return []; // Tag doesn't exist, no tools match
      }

      if (toolNames.size === 0) {
        for (const name of names) {
          toolNames.add(name);
        }
      } else {
        // Intersection: keep only tools that have this tag too
        for (const name of toolNames) {
          if (!names.has(name)) {
            toolNames.delete(name);
          }
        }
      }
    }

    return Array.from(toolNames)
      .map(name => this.tools.get(name)!)
      .filter(Boolean);
  }

  /**
   * Filter tools by policy
   */
  filterTools(policy: ToolPolicy): ToolDefinition[] {
    const tools = this.getTools();

    if (!policy.allow && !policy.deny) {
      return tools;
    }

    // If deny list exists, filter out denied tools
    let filtered = tools;
    if (policy.deny && policy.deny.length > 0) {
      filtered = filtered.filter(tool => {
        return !this.matchesPolicy(tool.name, policy.deny!);
      });
    }

    // If allow list exists, keep only allowed tools
    if (policy.allow && policy.allow.length > 0) {
      filtered = filtered.filter(tool => {
        return this.matchesPolicy(tool.name, policy.allow!);
      });
    }

    return filtered;
  }

  /**
   * Get tools by group
   * @param groupName - The group name
   * @returns Tools in the specified group
   */
  getGroup(groupName: string): ToolDefinition[] {
    const toolNames = this.groupIndex.get(groupName);
    if (!toolNames) {
      return [];
    }

    return Array.from(toolNames)
      .map(name => this.tools.get(name)!)
      .filter(Boolean);
  }

  /**
   * Get all group names
   * @returns Array of group names
   */
  getGroups(): string[] {
    return Array.from(this.groupIndex.keys());
  }

  /**
   * Check if a tool is allowed by policy
   */
  isToolAllowed(name: string, policy: ToolPolicy): boolean {
    // Check deny list first (deny takes precedence)
    if (policy.deny && this.matchesPolicy(name, policy.deny)) {
      return false;
    }

    // If allow list exists, tool must be in it
    if (policy.allow && policy.allow.length > 0) {
      return this.matchesPolicy(name, policy.allow);
    }

    // No restrictions
    return true;
  }

  /**
   * Get tool count
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.tagIndex.clear();
    this.groupIndex.clear();
  }

  /**
   * Check if a tool name matches a policy list
   * Supports wildcard patterns (*)
   */
  private matchesPolicy(toolName: string, policyList: string[]): boolean {
    for (const pattern of policyList) {
      // Exact match
      if (pattern === toolName) {
        return true;
      }

      // Wildcard prefix match (e.g., "browser_*")
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (toolName.startsWith(prefix)) {
          return true;
        }
      }

      // Wildcard suffix match (e.g., "*_click")
      if (pattern.startsWith('*')) {
        const suffix = pattern.slice(1);
        if (toolName.endsWith(suffix)) {
          return true;
        }
      }
    }

    return false;
  }
}
