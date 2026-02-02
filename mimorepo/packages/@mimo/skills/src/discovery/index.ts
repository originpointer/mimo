/**
 * Discovery module exports.
 *
 * Provides skill discovery from filesystem and BM25 search functionality.
 *
 * @module discovery
 */

export { FileSystemDiscovery } from './FileSystemDiscovery.js';
export { FrontmatterParser, parseFrontmatter } from './FrontmatterParser.js';
export { OramaSearchManager } from './OramaSearchManager.js';

export type { SkillsDB } from './OramaSearchManager.js';
