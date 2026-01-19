export {
  validatePlugin,
  composePlugins,
  extractPluginMetadata,
  mergePluginOptions,
  createPluginFactory,
} from './plugin-helpers';

export type {
  PluginValidationResult,
  PluginCompositionOptions,
} from '../types';

export {
  buildChildXPathSegments,
  joinXPath,
  normalizeXPath,
  prefixXPath,
  // DOM XPath 工具（浏览器环境）
  buildElementXPath,
  buildDomXPathMap,
  scanDomForXPaths,
  // XPath 逆向查询
  parseXPathSteps,
  getElementByXPath,
  getElementsByXPath,
} from './stagehand-xpath';

export type { DomXPathTraversalOptions } from './stagehand-xpath';
