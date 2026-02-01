/**
 * Policy Builder - Fluent API for building policy configurations
 */

import type { PolicyConfig } from './PolicyResolver.js';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

/**
 * Policy Builder - Chainable API for building policies
 */
export class PolicyBuilder {
  private config: PolicyConfig = {};

  /**
   * Allow a tool
   */
  allow(toolName: string): this {
    if (!this.config.tools) {
      this.config.tools = {};
    }
    this.config.tools[toolName] = 'allow';
    return this;
  }

  /**
   * Deny a tool
   */
  deny(toolName: string): this {
    if (!this.config.tools) {
      this.config.tools = {};
    }
    this.config.tools[toolName] = 'deny';
    return this;
  }

  /**
   * Allow multiple tools
   */
  allowTools(...toolNames: string[]): this {
    for (const name of toolNames) {
      this.allow(name);
    }
    return this;
  }

  /**
   * Deny multiple tools
   */
  denyTools(...toolNames: string[]): this {
    for (const name of toolNames) {
      this.deny(name);
    }
    return this;
  }

  /**
   * Allow a tool on specific domains
   */
  allowOnDomains(toolName: string, ...domains: string[]): this {
    if (!this.config.domains) {
      this.config.domains = {};
    }
    this.config.domains[toolName] = domains;
    return this;
  }

  /**
   * Deny a tool on specific domains
   */
  denyOnDomains(toolName: string, ...domains: string[]): this {
    if (!this.config.domains) {
      this.config.domains = {};
    }
    // Store as allow pattern but will be evaluated as deny
    this.config.domains[toolName] = domains;
    return this;
  }

  /**
   * Set runtime context override
   */
  setOverride(
    fn: (tool: ToolDefinition, context: ToolExecutionContext) => boolean | Promise<boolean>
  ): this {
    this.config.override = fn;
    return this;
  }

  /**
   * Build the policy configuration
   */
  build(): PolicyConfig {
    // Deep clone to prevent external modifications
    // Clone nested objects manually to preserve functions
    const cloned: PolicyConfig = {};

    if (this.config.tools) {
      cloned.tools = { ...this.config.tools };
    }

    if (this.config.domains) {
      cloned.domains = {};
      for (const [key, value] of Object.entries(this.config.domains)) {
        // Clone arrays
        cloned.domains[key] = [...value];
      }
    }

    if (this.config.override) {
      cloned.override = this.config.override;
    }

    return cloned;
  }

  /**
   * Create a builder from an existing config
   */
  static from(config: PolicyConfig): PolicyBuilder {
    const builder = new PolicyBuilder();

    // Deep clone nested objects manually
    const cloned: PolicyConfig = {};

    if (config.tools) {
      cloned.tools = { ...config.tools };
    }

    if (config.domains) {
      cloned.domains = {};
      for (const [key, value] of Object.entries(config.domains)) {
        // Clone arrays
        cloned.domains[key] = [...value];
      }
    }

    if (config.override) {
      cloned.override = config.override;
    }

    builder.config = cloned;
    return builder;
  }

  /**
   * Merge another config into this builder
   */
  merge(config: PolicyConfig): this {
    if (config.tools) {
      if (!this.config.tools) {
        this.config.tools = {};
      }
      Object.assign(this.config.tools, config.tools);
    }

    if (config.domains) {
      if (!this.config.domains) {
        this.config.domains = {};
      }
      Object.assign(this.config.domains, config.domains);
    }

    if (config.override && !this.config.override) {
      this.config.override = config.override;
    }

    return this;
  }

  /**
   * Extend a profile
   */
  extend(profile: PolicyConfig): this {
    return this.merge(profile);
  }

  /**
   * Clear all configurations
   */
  clear(): this {
    this.config = {};
    return this;
  }

  /**
   * Clone this builder
   */
  clone(): PolicyBuilder {
    return PolicyBuilder.from(this.config);
  }
}
