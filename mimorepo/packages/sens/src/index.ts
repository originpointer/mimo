/**
 * @repo/sens
 * 
 * Rolldown 插件工具库
 * 提供插件开发的基础工具和类型定义
 */

// 导出类型
export type {
  PluginOptions,
  PluginValidationResult,
  PluginCompositionOptions,
  PluginMetadata,
} from './types';

// 导出工具函数
export {
  validatePlugin,
  composePlugins,
  extractPluginMetadata,
  mergePluginOptions,
  createPluginFactory,
} from './utils/index';

// 导出示例插件
export {
  createEmptyPlugin,
} from './plugins/index';

export type {
  EmptyPluginOptions,
} from './plugins/index';

// 导出 detectors
export {
  ResourcePerformanceDetector,
} from './detectors/index';

export type {
  ResourcePerformanceConfig,
  ResourceInfo,
  SlowResourceInfo,
  NetworkQuietInfo,
  NavigationTimingInfo,
  CoreWebVitalInfo,
  LongTaskInfo,
  PerformanceMetrics,
  CoreWebVitalType,
  TaskAttribution,
  LayoutShiftAttribution,
} from './detectors/index';
