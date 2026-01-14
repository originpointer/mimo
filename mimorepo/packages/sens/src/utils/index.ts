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
} from './stagehand-xpath';
