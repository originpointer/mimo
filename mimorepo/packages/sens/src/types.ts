/**
 * Rolldown/Rollup 插件的基础类型定义
 * Rolldown 的插件 API 与 Rollup 高度兼容
 */

/**
 * 插件选项基类
 */
export interface PluginOptions {
  name?: string;
  [key: string]: unknown;
}

/**
 * 插件验证结果
 */
export interface PluginValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 插件组合选项
 */
export interface PluginCompositionOptions {
  /**
   * 如果为 true，遇到错误时继续处理其他插件
   * @default false
   */
  continueOnError?: boolean;
  
  /**
   * 插件执行顺序
   * @default 'sequential'
   */
  order?: 'sequential' | 'parallel';
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  name: string;
  version?: string;
  description?: string;
}
