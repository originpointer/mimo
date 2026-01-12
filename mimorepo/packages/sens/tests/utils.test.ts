import { describe, it, expect } from 'vitest';
import {
  validatePlugin,
  composePlugins,
  extractPluginMetadata,
  mergePluginOptions,
  createPluginFactory,
} from '../src/index.js';

describe('validatePlugin', () => {
  it('应该验证有效的插件', () => {
    const plugin = { name: 'test-plugin' };
    const result = validatePlugin(plugin);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('应该拒绝缺少 name 的插件', () => {
    const plugin = {};
    const result = validatePlugin(plugin);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('应该拒绝空字符串 name 的插件', () => {
    const plugin = { name: '' };
    const result = validatePlugin(plugin);
    expect(result.valid).toBe(false);
  });

  it('应该拒绝非对象类型的插件', () => {
    const result = validatePlugin(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Plugin is required');
  });
});

describe('composePlugins', () => {
  it('应该组合多个有效插件', () => {
    const plugins = [
      { name: 'plugin-1' },
      { name: 'plugin-2' },
      { name: 'plugin-3' },
    ];
    const result = composePlugins(plugins);
    expect(result).toHaveLength(3);
  });

  it('应该在 continueOnError 为 true 时跳过无效插件', () => {
    const plugins = [
      { name: 'plugin-1' },
      {}, // 无效插件
      { name: 'plugin-3' },
    ];
    const result = composePlugins(plugins, { continueOnError: true });
    expect(result).toHaveLength(2);
  });

  it('应该在 continueOnError 为 false 时抛出错误', () => {
    const plugins = [
      { name: 'plugin-1' },
      {}, // 无效插件
    ];
    expect(() => composePlugins(plugins, { continueOnError: false })).toThrow();
  });
});

describe('extractPluginMetadata', () => {
  it('应该提取插件的基本元数据', () => {
    const plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
    };
    const metadata = extractPluginMetadata(plugin);
    expect(metadata.name).toBe('test-plugin');
    expect(metadata.version).toBe('1.0.0');
    expect(metadata.description).toBe('Test plugin');
  });

  it('应该处理缺少可选字段的插件', () => {
    const plugin = { name: 'test-plugin' };
    const metadata = extractPluginMetadata(plugin);
    expect(metadata.name).toBe('test-plugin');
    expect(metadata.version).toBeUndefined();
    expect(metadata.description).toBeUndefined();
  });
});

describe('mergePluginOptions', () => {
  it('应该合并插件选项', () => {
    const defaultOptions = { name: 'plugin', enabled: true };
    const userOptions = { enabled: false };
    const merged = mergePluginOptions(defaultOptions, userOptions);
    expect(merged.name).toBe('plugin');
    expect(merged.enabled).toBe(false);
  });

  it('应该深度合并嵌套对象', () => {
    const defaultOptions = {
      name: 'plugin',
      config: { a: 1, b: 2 },
    };
    const userOptions = {
      config: { b: 3 },
    };
    const merged = mergePluginOptions(defaultOptions, userOptions);
    expect(merged.config.a).toBe(1);
    expect(merged.config.b).toBe(3);
  });

  it('应该忽略 undefined 值', () => {
    const defaultOptions = { name: 'plugin', enabled: true };
    const userOptions = { enabled: undefined };
    const merged = mergePluginOptions(defaultOptions, userOptions);
    expect(merged.enabled).toBe(true);
  });
});

describe('createPluginFactory', () => {
  it('应该创建插件工厂函数', () => {
    const factory = createPluginFactory('test-plugin', (options = {}) => ({
      name: 'test-plugin',
      ...options,
    }));
    const plugin = factory({ version: '1.0.0' });
    expect(plugin.name).toBe('test-plugin');
    expect(plugin.version).toBe('1.0.0');
  });

  it('应该自动设置插件名称', () => {
    const factory = createPluginFactory('auto-name', () => ({} as any));
    const plugin = factory();
    expect(plugin.name).toBe('auto-name');
  });
});
