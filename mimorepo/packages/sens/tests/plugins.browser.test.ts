import { describe, it, expect } from 'vitest';
import { createEmptyPlugin } from '../src/index.js';
import { validatePlugin } from '../src/index.js';

describe('Browser: createEmptyPlugin', () => {
  it('应该在浏览器环境中创建空插件', () => {
    const plugin = createEmptyPlugin();
    expect(plugin.name).toBe('sens-empty');
    expect(typeof plugin.name).toBe('string');
  });

  it('应该在浏览器环境中验证插件', () => {
    const plugin = createEmptyPlugin({ message: 'Browser test' });
    const validation = validatePlugin(plugin);
    expect(validation.valid).toBe(true);
  });

  it('应该支持浏览器环境中的选项覆盖', () => {
    const plugin = createEmptyPlugin({
      message: 'Browser message',
      name: 'custom-name', // 测试选项覆盖
    });
    expect(plugin.name).toBe('sens-empty'); // 工厂函数会确保名称正确
    expect(plugin.message).toBe('Browser message');
  });
});
