/**
 * Resources module exports.
 *
 * @module resources
 */

export {
  StaticSkillResource,
  CallableSkillResource,
  FileBasedSkillResource
} from './SkillResource.js';

export {
  createFileBasedResource,
  createStaticResource,
  createCallableResource
} from './SkillResource.js';

export type { BaseSkillResource } from './SkillResource.js';
