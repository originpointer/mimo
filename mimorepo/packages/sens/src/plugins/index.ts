/**
 * 示例插件集合
 * 这里可以放置一些基础插件或示例插件
 */

import type { PluginOptions } from '../types.js';
import { createPluginFactory } from '../utils/index.js';

/**
 * 示例：空插件（用于测试）
 */
export interface EmptyPluginOptions extends PluginOptions {
  message?: string;
}

/**
 * 创建一个简单的空插件（用于测试和示例）
 */
export const createEmptyPlugin = createPluginFactory<EmptyPluginOptions>(
  'sens-empty',
  (options = {}) => {
    return {
      name: 'sens-empty',
      message: options.message || 'Empty plugin',
      ...options,
    } as EmptyPluginOptions;
  },
);
