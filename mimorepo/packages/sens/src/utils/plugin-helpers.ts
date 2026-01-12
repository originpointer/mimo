import type { PluginMetadata, PluginOptions, PluginValidationResult, PluginCompositionOptions } from '../types.js';

/**
 * 验证插件是否符合基本规范
 * @param plugin 插件对象
 * @returns 验证结果
 */
export function validatePlugin(plugin: unknown): PluginValidationResult {
  const errors: string[] = [];

  if (!plugin) {
    errors.push('Plugin is required');
    return { valid: false, errors };
  }

  if (typeof plugin !== 'object') {
    errors.push('Plugin must be an object');
    return { valid: false, errors };
  }

  const pluginObj = plugin as Record<string, unknown>;

  // 检查 name 属性
  if (!('name' in pluginObj) || typeof pluginObj.name !== 'string' || !pluginObj.name.trim()) {
    errors.push('Plugin must have a non-empty "name" property');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 组合多个插件
 * @param plugins 插件数组
 * @param options 组合选项
 * @returns 组合后的插件数组
 */
export function composePlugins<T extends PluginOptions>(
  plugins: T[],
  options: PluginCompositionOptions = {},
): T[] {
  const { continueOnError = false } = options;
  const validatedPlugins: T[] = [];

  for (const plugin of plugins) {
    const validation = validatePlugin(plugin);
    
    if (!validation.valid) {
      if (continueOnError) {
        console.warn(`Plugin validation failed: ${validation.errors.join(', ')}`);
        continue;
      } else {
        throw new Error(`Plugin validation failed: ${validation.errors.join(', ')}`);
      }
    }

    validatedPlugins.push(plugin);
  }

  return validatedPlugins;
}

/**
 * 从插件中提取元数据
 * @param plugin 插件对象
 * @returns 插件元数据
 */
export function extractPluginMetadata(plugin: Record<string, unknown>): PluginMetadata {
  return {
    name: (plugin.name as string) || 'unknown',
    version: plugin.version as string | undefined,
    description: plugin.description as string | undefined,
  };
}

/**
 * 合并插件选项，支持深度合并
 * @param defaultOptions 默认选项
 * @param userOptions 用户选项
 * @returns 合并后的选项
 */
export function mergePluginOptions<T extends PluginOptions>(
  defaultOptions: Partial<T>,
  userOptions: Partial<T>,
): T {
  const merged = { ...defaultOptions };

  for (const key in userOptions) {
    const userValue = userOptions[key];
    const defaultValue = merged[key];

    if (userValue === undefined) {
      continue;
    }

    if (
      typeof userValue === 'object' &&
      userValue !== null &&
      !Array.isArray(userValue) &&
      typeof defaultValue === 'object' &&
      defaultValue !== null &&
      !Array.isArray(defaultValue)
    ) {
      merged[key] = mergePluginOptions(
        defaultValue as Partial<T>,
        userValue as Partial<T>,
      ) as T[Extract<keyof T, string>];
    } else {
      merged[key] = userValue as T[Extract<keyof T, string>];
    }
  }

  return merged as T;
}

/**
 * 创建一个命名插件工厂函数
 * @param name 插件名称
 * @param factory 插件工厂函数
 * @returns 插件工厂函数
 */
export function createPluginFactory<T extends PluginOptions = PluginOptions>(
  name: string,
  factory: (options?: Partial<T>) => T,
) {
  return (options?: Partial<T>): T => {
    const plugin = factory(options);
    
    // 强制设置插件名称，确保不被用户选项覆盖
    plugin.name = name;
    
    return plugin;
  };
}
