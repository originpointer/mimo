import { describe, it, expect } from 'vitest';
import {
  validatePlugin,
  composePlugins,
  extractPluginMetadata,
  mergePluginOptions,
  createPluginFactory,
} from '../src/index.js';

describe('Browser: validatePlugin', () => {
  it('应该在浏览器环境中验证插件', () => {
    const plugin = { name: 'browser-plugin' };
    const result = validatePlugin(plugin);
    expect(result.valid).toBe(true);
  });

  it('应该在浏览器中处理 DOM 相关的插件验证', () => {
    // 测试浏览器环境的特殊场景
    const plugin = {
      name: 'dom-plugin',
      // 模拟浏览器环境中的插件
    };
    const result = validatePlugin(plugin);
    expect(result.valid).toBe(true);
  });
});

describe('Browser: composePlugins', () => {
  it('应该在浏览器环境中组合插件', () => {
    const plugins = [
      { name: 'browser-plugin-1' },
      { name: 'browser-plugin-2' },
    ];
    const result = composePlugins(plugins);
    expect(result).toHaveLength(2);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Browser: extractPluginMetadata', () => {
  it('应该在浏览器环境中提取元数据', () => {
    const plugin = {
      name: 'browser-plugin',
      version: '1.0.0',
    };
    const metadata = extractPluginMetadata(plugin);
    expect(metadata.name).toBe('browser-plugin');
    expect(typeof metadata.name).toBe('string');
  });
});

describe('Browser: mergePluginOptions', () => {
  it('应该在浏览器环境中合并选项', () => {
    const defaultOptions = { name: 'plugin', enabled: true };
    const userOptions = { enabled: false };
    const merged = mergePluginOptions(defaultOptions, userOptions);
    
    // 验证合并结果
    expect(merged).toBeDefined();
    expect(merged.name).toBe('plugin');
    expect(merged.enabled).toBe(false);
  });
});

describe('Browser: createPluginFactory', () => {
  it('应该在浏览器环境中创建插件工厂', () => {
    const factory = createPluginFactory('browser-plugin', (options = {}) => ({
      name: 'browser-plugin',
      ...options,
    }));
    const plugin = factory();
    expect(plugin.name).toBe('browser-plugin');
    expect(typeof plugin.name).toBe('string');
  });
});
