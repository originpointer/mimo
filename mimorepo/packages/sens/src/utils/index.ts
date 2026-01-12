export {
  validatePlugin,
  composePlugins,
  extractPluginMetadata,
  mergePluginOptions,
  createPluginFactory,
} from './plugin-helpers.js';

export type {
  PluginValidationResult,
  PluginCompositionOptions,
} from '../types.js';

export {
  buildChildXPathSegments,
  joinXPath,
  normalizeXPath,
  prefixXPath,
} from './stagehand-xpath.js';
