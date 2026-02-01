/**
 * Policy Resolver - 3-layer permission system
 * Layer 1: StaticToolPolicy (config-time)
 * Layer 2: DomainRestrictions (runtime)
 * Layer 3: ContextOverride (runtime callback)
 */

import { match } from 'path-to-regexp';
import type {
  ToolDefinition,
  ToolExecutionContext,
} from '@mimo/agent-core/types';

/**
 * Permission result
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  layer?: string;
}

/**
 * Domain pattern with action
 */
export interface DomainPattern {
  pattern: string;
  action: 'allow' | 'deny';
}

/**
 * Policy configuration
 */
export interface PolicyConfig {
  /** Tool-level permissions */
  tools?: Record<string, 'allow' | 'deny'>;
  /** Domain restrictions */
  domains?: Record<string, string[]>;
  /** Runtime context override */
  override?: (tool: ToolDefinition, context: ToolExecutionContext) => boolean | Promise<boolean>;
}

/**
 * Policy layer interface
 */
interface PolicyLayer {
  name: string;
  evaluate(tool: ToolDefinition, context: ToolExecutionContext): Promise<'allow' | 'deny' | 'neutral'>;
}

/**
 * Layer 1: Static Tool Policy (config-time)
 */
class StaticToolPolicy implements PolicyLayer {
  name = 'StaticToolPolicy';
  private rules: Map<string, 'allow' | 'deny'> = new Map();
  private wildcardRules: { prefix: string; action: 'allow' | 'deny' }[] = [];

  constructor(config?: PolicyConfig) {
    if (config) {
      this.loadConfig(config);
    }
  }

  async evaluate(tool: ToolDefinition): Promise<'allow' | 'deny' | 'neutral'> {
    // Check exact match first
    const rule = this.rules.get(tool.name);
    if (rule) {
      return rule;
    }

    // Check wildcard patterns (e.g., "browser_*")
    for (const { prefix, action } of this.wildcardRules) {
      if (tool.name.startsWith(prefix)) {
        return action;
      }
    }

    return 'neutral';
  }

  private loadConfig(config: PolicyConfig): void {
    if (!config.tools) {
      return;
    }

    for (const [tool, action] of Object.entries(config.tools)) {
      if (tool.includes('*')) {
        this.wildcardRules.push({
          prefix: tool.replace('*', ''),
          action,
        });
      } else {
        this.rules.set(tool, action);
      }
    }
  }
}

/**
 * Layer 2: Domain Restrictions (runtime)
 */
class DomainRestrictions implements PolicyLayer {
  name = 'DomainRestrictions';
  private domainRules: Map<string, DomainPattern[]> = new Map();

  constructor(config?: PolicyConfig) {
    if (config) {
      this.loadConfig(config);
    }
  }

  async evaluate(
    tool: ToolDefinition,
    context: ToolExecutionContext
  ): Promise<'allow' | 'deny' | 'neutral'> {
    const patterns = this.domainRules.get(tool.name);
    if (!patterns || patterns.length === 0) {
      return 'neutral';
    }

    const currentUrl = context.browser?.currentUrl;
    if (!currentUrl) {
      return 'neutral'; // No browser context, can't check domain
    }

    const urlObj = new URL(currentUrl);
    const host = urlObj.hostname;
    const path = urlObj.pathname;
    const fullPath = `${host}${path}`;

    for (const pattern of patterns) {
      // Handle wildcard subdomains: *.domain.com
      if (pattern.pattern.startsWith('*.')) {
        const domain = pattern.pattern.slice(2); // Remove *.
        if (host === domain || host.endsWith(`.${domain}`)) {
          return pattern.action;
        }
      }
      // Handle wildcard paths: domain.com/*
      else if (pattern.pattern.includes('/*')) {
        const [domain, _] = pattern.pattern.split('/*');
        if (host === domain) {
          return pattern.action;
        }
      }
      // Handle catch-all: *
      else if (pattern.pattern === '*') {
        return pattern.action;
      }
      // Exact hostname match first
      else if (host === pattern.pattern) {
        return pattern.action;
      }
      // Try path-to-regexp for complex patterns
      else if (pattern.pattern.includes('/') || pattern.pattern.includes(':')) {
        try {
          const matchFn = match(pattern.pattern);
          const result = matchFn(fullPath);
          if (result) {
            return pattern.action;
          }
        } catch {
          // Ignore path-to-regexp errors
        }
      }
    }

    return 'neutral';
  }

  private loadConfig(config: PolicyConfig): void {
    if (!config.domains) {
      return;
    }

    for (const [tool, patterns] of Object.entries(config.domains)) {
      const domainPatterns: DomainPattern[] = patterns.map(p => ({
        pattern: p,
        action: 'allow',
      }));
      this.domainRules.set(tool, domainPatterns);
    }
  }
}

/**
 * Layer 3: Context Override (runtime callback)
 */
class ContextOverride implements PolicyLayer {
  name = 'ContextOverride';
  private overrideFn?: (tool: ToolDefinition, context: ToolExecutionContext) => boolean | Promise<boolean>;

  constructor(config?: PolicyConfig) {
    if (config?.override) {
      this.overrideFn = config.override;
    }
  }

  async evaluate(
    tool: ToolDefinition,
    context: ToolExecutionContext
  ): Promise<'allow' | 'deny' | 'neutral'> {
    if (!this.overrideFn) {
      return 'neutral';
    }

    const result = await this.overrideFn(tool, context);
    return result ? 'allow' : 'deny';
  }
}

/**
 * Policy Resolver - 3-layer permission system
 */
export class PolicyResolver {
  private layers: PolicyLayer[] = [];

  constructor(config?: PolicyConfig) {
    this.layers = [
      new StaticToolPolicy(config),
      new DomainRestrictions(config),
      new ContextOverride(config),
    ];
  }

  /**
   * Resolve permission for a tool
   * @param tool - Tool definition
   * @param context - Execution context
   * @returns Permission result
   */
  async resolve(
    tool: ToolDefinition,
    context: ToolExecutionContext
  ): Promise<PermissionResult> {
    // Evaluate layers in order
    for (const layer of this.layers) {
      const result = await layer.evaluate(tool, context);

      // DENY takes precedence (deny-first principle)
      if (result === 'deny') {
        return {
          allowed: false,
          reason: `Denied by ${layer.name}`,
          layer: layer.name,
        };
      }

      // ALLOW early return (optional optimization)
      if (result === 'allow') {
        // Continue checking other layers (deny-first)
        // But if all layers pass, tool is allowed
      }
    }

    return { allowed: true };
  }

  /**
   * Add a custom policy layer (extension point)
   * @param layer - Custom policy layer
   */
  addLayer(layer: PolicyLayer): void {
    this.layers.push(layer);
  }

  /**
   * Update configuration
   * @param config - New policy configuration
   */
  updateConfig(config: PolicyConfig): void {
    // Rebuild layers with new config
    this.layers = [
      new StaticToolPolicy(config),
      new DomainRestrictions(config),
      new ContextOverride(config),
    ];
  }
}
