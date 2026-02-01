/**
 * Pre-defined policy profiles
 */

import type { PolicyConfig } from './PolicyResolver.js';

/**
 * Pre-defined policy configurations
 */
export const POLICY_PROFILES = {
  /**
   * Allow all tools
   */
  ALLOW_ALL: {
    tools: {
      '*': 'allow',
    } as Record<string, 'allow' | 'deny'>,
  } as PolicyConfig,

  /**
   * Deny all tools
   */
  DENY_ALL: {
    tools: {
      '*': 'deny',
    } as Record<string, 'allow' | 'deny'>,
  } as PolicyConfig,

  /**
   * Only browser tools allowed
   */
  BROWSER_ONLY: {
    tools: {
      'browser_*': 'allow',
      '*': 'deny',
    } as Record<string, 'allow' | 'deny'>,
  } as PolicyConfig,

  /**
   * Browser tools + file read allowed
   */
  BROWSER_AND_FILE_READ: {
    tools: {
      'browser_*': 'allow',
      'read_file': 'allow',
      '*': 'deny',
    } as Record<string, 'allow' | 'deny'>,
  } as PolicyConfig,

  /**
   * Browser tools restricted to GitHub domains
   */
  BROWSER_GITHUB_ONLY: {
    tools: {
      'browser_*': 'allow',
      '*': 'deny',
    } as Record<string, 'allow' | 'deny'>,
    domains: {
      'browser_navigate': ['*.github.com', 'github.com'],
      'browser_click': ['*.github.com', 'github.com'],
      'browser_fill': ['*.github.com', 'github.com'],
    } as Record<string, string[]>,
  } as PolicyConfig,

  /**
   * Safe tools only (no runtime execution)
   */
  SAFE_TOOLS_ONLY: {
    tools: {
      'browser_*': 'allow',
      'read_file': 'allow',
      'web_search': 'allow',
      'web_fetch': 'allow',
      'memory_*': 'allow',
      '*': 'deny',
    } as Record<string, 'allow' | 'deny'>,
  } as PolicyConfig,
} as const;

/**
 * Policy profile names
 */
export type PolicyProfile = keyof typeof POLICY_PROFILES;
