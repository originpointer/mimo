/**
 * Domain Guard - Check if tool is allowed on current domain
 */

import { match } from 'path-to-regexp';
import type {
  ToolDefinition,
  BrowserSession,
} from '@mimo/agent-core/types';
import { DomainNotAllowedError } from '../utils/errors.js';

/**
 * Domain Guard
 * Checks if a tool is allowed to execute on the current domain
 */
export class DomainGuard {
  /**
   * Check if tool is allowed on current domain
   * @param tool - Tool definition
   * @param browserSession - Browser session
   * @returns true if allowed
   */
  async check(
    tool: ToolDefinition,
    browserSession?: BrowserSession
  ): Promise<boolean> {
    // If tool has no domain restrictions, allow
    if (!tool.domains || tool.domains.length === 0) {
      return true;
    }

    // If no browser session, can't check domain
    if (!browserSession) {
      return false;
    }

    const currentUrl = browserSession.currentUrl;
    if (!currentUrl) {
      return false;
    }

    // Validate URL format
    try {
      new URL(currentUrl);
    } catch {
      return false;
    }

    // Match current URL against allowed patterns
    return this.matchDomain(currentUrl, tool.domains);
  }

  /**
   * Check and throw error if not allowed
   * @param tool - Tool definition
   * @param browserSession - Browser session
   * @throws DomainNotAllowedError if not allowed
   */
  async validate(
    tool: ToolDefinition,
    browserSession?: BrowserSession
  ): Promise<void> {
    const allowed = await this.check(tool, browserSession);

    if (!allowed) {
      const currentUrl = browserSession?.currentUrl || 'unknown';
      const domain = this.extractDomain(currentUrl);

      throw new DomainNotAllowedError(
        tool.name,
        domain,
        tool.domains || []
      );
    }
  }

  /**
   * Match URL against domain patterns
   * @param url - Current URL
   * @param patterns - Allowed domain patterns
   * @returns true if matches
   */
  private matchDomain(url: string, patterns: string[]): boolean {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const path = urlObj.pathname;
    const fullPath = `${host}${path}`;
    const fullUrlWithPort = urlObj.port ? `${host}:${urlObj.port}` : host;

    for (const pattern of patterns) {
      // Handle wildcard subdomains: *.domain.com
      if (pattern.startsWith('*.')) {
        const domain = pattern.slice(2); // Remove *.
        if (host === domain || host.endsWith(`.${domain}`)) {
          return true;
        }
      }
      // Handle wildcard paths: domain.com/*
      else if (pattern.includes('/*')) {
        const [domain, _] = pattern.split('/*');
        if (host === domain) {
          return true;
        }
      }
      // Handle wildcard ports: domain.com:* or localhost:*
      else if (pattern.includes(':*')) {
        const [domain, _] = pattern.split(':*');
        if (host === domain || fullUrlWithPort.startsWith(`${domain}:`)) {
          return true;
        }
      }
      // Handle catch-all: *
      else if (pattern === '*') {
        return true;
      }
      // Exact hostname match (with or without port)
      else if (host === pattern || fullUrlWithPort === pattern) {
        return true;
      }
      // Try path-to-regexp for complex patterns
      else if (pattern.includes('/') || pattern.includes(':')) {
        try {
          const matchFn = match(pattern);
          const result = matchFn(fullPath);
          if (result) {
            return true;
          }
        } catch {
          // Ignore path-to-regexp errors
        }
      }
    }

    return false;
  }

  /**
   * Extract domain from URL
   * @param url - URL string
   * @returns Domain name
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }
}
