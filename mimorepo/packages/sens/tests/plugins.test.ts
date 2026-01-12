import { describe, it, expect } from 'vitest';
import { createEmptyPlugin } from '../src/index.js';
import { validatePlugin } from '../src/index.js';

describe('createEmptyPlugin', () => {
  it('应该创建一个空插件', () => {
    const plugin = createEmptyPlugin();
    expect(plugin.name).toBe('sens-empty');
    expect(plugin.message).toBe('Empty plugin');
  });

  it('应该接受自定义选项', () => {
    const plugin = createEmptyPlugin({ message: 'Custom message' });
    expect(plugin.name).toBe('sens-empty');
    expect(plugin.message).toBe('Custom message');
  });

  it('创建的插件应该通过验证', () => {
    const plugin = createEmptyPlugin();
    const validation = validatePlugin(plugin);
    expect(validation.valid).toBe(true);
  });
});
