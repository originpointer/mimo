/**
 * YAML frontmatter parser for SKILL.md files.
 *
 * Parses the YAML frontmatter (metadata) and markdown content from SKILL.md files.
 *
 * @module discovery
 */

import { parse as parseYAML } from 'yaml';
import type { ParsedSkillContent } from '../types.js';

/**
 * Regular expression to match YAML frontmatter.
 *
 * Matches content between --- delimiters at the start of the file.
 * Uses DOTALL and MULTILINE flags for proper matching.
 */
const FRONTMATTER_PATTERN = /^---\s*\n(.*?)^---\s*\n/s;

/**
 * Parse a SKILL.md file into frontmatter and instructions.
 *
 * @param content - Full content of the SKILL.md file
 * @returns Tuple of (frontmatter_dict, instructions_markdown)
 * @throws Error if YAML parsing fails
 *
 * @example
 * ```ts
 * const content = `
 * ---
 * name: my-skill
 * description: A skill
 * ---
 *
 * # Instructions
 * This is the skill content...
 * `;
 *
 * const { frontmatter, content: instructions } = FrontmatterParser.parse(content);
 * // frontmatter = { name: 'my-skill', description: 'A skill' }
 * // instructions = '# Instructions\nThis is the skill content...'
 * ```
 */
export function parseFrontmatter(content: string): ParsedSkillContent {
  const match = content.match(FRONTMATTER_PATTERN);

  if (!match) {
    // No frontmatter found, return entire content as instructions
    return {
      frontmatter: {},
      content: content.trim()
    };
  }

  const frontmatterYaml = match[1]!.trim();
  const instructions = content.slice(match[0]!.length).trim();

  if (!frontmatterYaml) {
    return {
      frontmatter: {},
      content: instructions
    };
  }

  try {
    const frontmatter = parseYAML(frontmatterYaml) as Record<string, unknown>;
    return {
      frontmatter,
      content: instructions
    };
  } catch (error) {
    throw new Error(`Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * FrontmatterParser class for parsing SKILL.md files.
 *
 * Provides static methods for parsing skill files with YAML frontmatter.
 */
export class FrontmatterParser {
  /**
   * Parse a SKILL.md file into frontmatter and instructions.
   *
   * @param content - Full content of the SKILL.md file
   * @returns Parsed content with frontmatter and instructions
   */
  static parse(content: string): ParsedSkillContent {
    return parseFrontmatter(content);
  }

  /**
   * Extract just the YAML frontmatter from content.
   *
   * @param content - Full content of the SKILL.md file
   * @returns Parsed frontmatter as an object, or empty object if no frontmatter
   */
  static extractFrontmatter(content: string): Record<string, unknown> {
    const { frontmatter } = this.parse(content);
    return frontmatter;
  }

  /**
   * Extract just the markdown content (instructions) from a SKILL.md file.
   *
   * @param content - Full content of the SKILL.md file
   * @returns Markdown instructions content
   */
  static extractContent(content: string): string {
    const { content: instructions } = this.parse(content);
    return instructions;
  }

  /**
   * Check if a file has valid YAML frontmatter.
   *
   * @param content - Content to check
   * @returns true if valid frontmatter is present
   */
  static hasFrontmatter(content: string): boolean {
    return FRONTMATTER_PATTERN.test(content);
  }
}

// Re-export the class for convenience
export default FrontmatterParser;
