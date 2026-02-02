/**
 * Constants for the skills framework.
 */

/**
 * Regular expression pattern for valid skill names.
 *
 * Pattern: lowercase letters, numbers, and hyphens (no consecutive hyphens)
 *
 * @example
 * ```ts
 * SKILL_NAME_PATTERN.test('arxiv-search'); // true
 * SKILL_NAME_PATTERN.test('arXivSearch'); // false
 * SKILL_NAME_PATTERN.test('arxiv--search'); // false
 * ```
 */
export const SKILL_NAME_PATTERN: RegExp = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Reserved words that cannot be used in skill names.
 */
export const RESERVED_WORDS: Set<string> = new Set(['anthropic', 'claude']);

/**
 * Maximum allowed length for skill names (Anthropic spec).
 */
export const MAX_SKILL_NAME_LENGTH = 64;

/**
 * Maximum allowed length for skill descriptions (Anthropic spec).
 */
export const MAX_DESCRIPTION_LENGTH = 1024;

/**
 * Maximum allowed length for skill compatibility field.
 */
export const MAX_COMPATIBILITY_LENGTH = 500;

/**
 * Maximum recommended lines for skill instructions (Anthropic spec).
 */
export const MAX_INSTRUCTIONS_LINES = 500;

/**
 * Supported file extensions for skill resources.
 */
export const SUPPORTED_RESOURCE_EXTENSIONS = [
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.csv',
  '.xml',
  '.txt'
] as const;

/**
 * Default maximum depth for recursive skill discovery.
 */
export const DEFAULT_MAX_DEPTH = 3;

/**
 * Default script execution timeout in milliseconds.
 */
export const DEFAULT_SCRIPT_TIMEOUT = 30000;

/**
 * Default BM25 search threshold (0-1).
 */
export const DEFAULT_BM25_THRESHOLD = 0.3;

/**
 * Default maximum results for BM25 search.
 */
export const DEFAULT_BM25_LIMIT = 10;
