/**
 * Tests for policy/PolicyBuilder.ts
 */

import { describe, it, expect } from 'vitest';
import { PolicyBuilder } from './PolicyBuilder.js';
import type { ToolDefinition, ToolExecutionContext } from '@mimo/agent-core/types';

describe('PolicyBuilder', () => {
  it('should create empty config', () => {
    const builder = new PolicyBuilder();
    const config = builder.build();

    expect(config).toEqual({});
  });

  it('should allow a tool', () => {
    const builder = new PolicyBuilder();
    builder.allow('read_file');

    const config = builder.build();
    expect(config.tools?.['read_file']).toBe('allow');
  });

  it('should deny a tool', () => {
    const builder = new PolicyBuilder();
    builder.deny('write_file');

    const config = builder.build();
    expect(config.tools?.['write_file']).toBe('deny');
  });

  it('should allow multiple tools', () => {
    const builder = new PolicyBuilder();
    builder.allowTools('read_file', 'write_file', 'delete_file');

    const config = builder.build();
    expect(config.tools?.['read_file']).toBe('allow');
    expect(config.tools?.['write_file']).toBe('allow');
    expect(config.tools?.['delete_file']).toBe('allow');
  });

  it('should deny multiple tools', () => {
    const builder = new PolicyBuilder();
    builder.denyTools('delete_file', 'format_disk');

    const config = builder.build();
    expect(config.tools?.['delete_file']).toBe('deny');
    expect(config.tools?.['format_disk']).toBe('deny');
  });

  it('should allow tool on domains', () => {
    const builder = new PolicyBuilder();
    builder.allowOnDomains('browser_click', '*.github.com', 'github.com');

    const config = builder.build();
    expect(config.domains?.['browser_click']).toEqual(['*.github.com', 'github.com']);
  });

  it('should deny tool on domains', () => {
    const builder = new PolicyBuilder();
    builder.denyOnDomains('browser_click', '*.malicious.com');

    const config = builder.build();
    expect(config.domains?.['browser_click']).toEqual(['*.malicious.com']);
  });

  it('should set runtime override', () => {
    const overrideFn = async (_tool: ToolDefinition, _context: ToolExecutionContext) => true;
    const builder = new PolicyBuilder();
    builder.setOverride(overrideFn);

    const config = builder.build();
    expect(config.override).toBe(overrideFn);
  });

  it('should chain methods', () => {
    const builder = new PolicyBuilder();
    const result = builder
      .allow('read_file')
      .deny('delete_file')
      .allowOnDomains('browser_click', '*.example.com')
      .setOverride(async () => true);

    expect(result).toBe(builder);
  });

  it('should create from existing config', () => {
    const existing = {
      tools: { read_file: 'allow' as const, delete_file: 'deny' as const },
    };
    const builder = PolicyBuilder.from(existing);

    const config = builder.build();
    expect(config).toEqual(existing);
  });

  it('should merge config', () => {
    const builder = new PolicyBuilder();
    builder.allow('read_file');

    builder.merge({
      tools: { write_file: 'allow' as const },
      domains: { browser_click: ['*.example.com'] },
    });

    const config = builder.build();
    expect(config.tools?.['read_file']).toBe('allow');
    expect(config.tools?.['write_file']).toBe('allow');
    expect(config.domains?.['browser_click']).toEqual(['*.example.com']);
  });

  it('should extend profile', () => {
    const builder = new PolicyBuilder();
    builder.allow('read_file');

    const profile = {
      tools: { write_file: 'allow' as const },
    };

    builder.extend(profile);

    const config = builder.build();
    expect(config.tools?.['read_file']).toBe('allow');
    expect(config.tools?.['write_file']).toBe('allow');
  });

  it('should clear config', () => {
    const builder = new PolicyBuilder();
    builder.allow('read_file').deny('delete_file');
    builder.clear();

    const config = builder.build();
    expect(config).toEqual({});
  });

  it('should clone builder', () => {
    const builder = new PolicyBuilder();
    builder.allow('read_file');

    const cloned = builder.clone();
    cloned.allow('write_file');

    expect(builder.build().tools).toEqual({ read_file: 'allow' });
    expect(cloned.build().tools).toEqual({
      read_file: 'allow',
      write_file: 'allow',
    });
  });

  it('should not affect original when merging', () => {
    const builder = new PolicyBuilder();
    builder.allow('read_file');

    const originalConfig = builder.build();

    builder.merge({
      tools: { write_file: 'deny' as const },
    });

    expect(originalConfig.tools?.['read_file']).toBe('allow');
    expect(originalConfig.tools?.['write_file']).toBeUndefined();
  });

  it('should handle empty merge', () => {
    const builder = new PolicyBuilder();
    builder.allow('read_file');

    builder.merge({});

    const config = builder.build();
    expect(config.tools?.['read_file']).toBe('allow');
  });

  it('should handle setting override after other configs', () => {
    const overrideFn = async () => false;
    const builder = new PolicyBuilder();

    builder.allow('read_file');
    builder.setOverride(overrideFn);

    const config = builder.build();
    expect(config.tools?.['read_file']).toBe('allow');
    expect(config.override).toBe(overrideFn);
  });

  it('should not override existing override when merging', () => {
    const overrideFn1 = async () => true;
    const overrideFn2 = async () => false;

    const builder = new PolicyBuilder();
    builder.setOverride(overrideFn1);

    builder.merge({ override: overrideFn2 });

    const config = builder.build();
    expect(config.override).toBe(overrideFn1);
  });
});
