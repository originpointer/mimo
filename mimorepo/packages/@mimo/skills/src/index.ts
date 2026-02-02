/**
 * @mimo/skills - Progressive disclosure skills framework for AI agents
 *
 * A TypeScript/Node.js implementation of Anthropic's Agent Skills specification
 * with BM25-powered skill discovery.
 *
 * @example
 * ```ts
 * import { SkillsToolset } from '@mimo/skills';
 *
 * const toolset = new SkillsToolset({
 *   directories: ['./skills'],
 *   enableBM25: true
 * });
 *
 * await toolset.initialize();
 * const instructions = await toolset.getInstructions();
 * ```
 *
 * @module @mimo/skills
 */

// Re-export all public APIs
export * from './types.js';
export * from './constants.js';
export * from './validation.js';
export * from './exceptions.js';

export * from './discovery/index.js';
export * from './resources/index.js';
export * from './scripts/index.js';
export * from './execution/index.js';
export * from './skill/index.js';
export * from './toolset/index.js';
