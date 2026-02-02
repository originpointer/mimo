/**
 * Validation utilities for skills.
 */

import {
  SKILL_NAME_PATTERN,
  RESERVED_WORDS,
  MAX_SKILL_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_COMPATIBILITY_LENGTH,
  MAX_INSTRUCTIONS_LINES
} from './constants.js';
import { SkillValidationError } from './exceptions.js';

/**
 * Normalizes a function name to a valid skill name.
 *
 * Converts underscores to hyphens and validates against the skill naming pattern.
 *
 * @param funcName - The function name to normalize
 * @returns Normalized skill name (lowercase, underscores replaced with hyphens)
 * @throws {@link SkillValidationError} If the name contains invalid characters after normalization
 *
 * @example
 * ```ts
 * normalizeSkillName('data_analyzer'); // Returns 'data-analyzer'
 * normalizeSkillName('my_cool_skill'); // Returns 'my-cool-skill'
 * normalizeSkillName('InvalidName');   // Throws SkillValidationError
 * ```
 */
export function normalizeSkillName(funcName: string): string {
  // Replace underscores with hyphens and convert to lowercase
  const normalized = funcName.replace(/_/g, '-').toLowerCase();

  // Validate against pattern
  if (!SKILL_NAME_PATTERN.test(normalized)) {
    throw new SkillValidationError(
      `Skill name '${normalized}' (derived from '${funcName}') is invalid. ` +
      `Skill names must contain only lowercase letters, numbers, and hyphens ` +
      `(no consecutive hyphens).`
    );
  }

  // Check length
  if (normalized.length > MAX_SKILL_NAME_LENGTH) {
    throw new SkillValidationError(
      `Skill name '${normalized}' exceeds ${MAX_SKILL_NAME_LENGTH} characters ` +
      `(${normalized.length} chars).`
    );
  }

  return normalized;
}

/**
 * Validates a skill name against Anthropic's requirements.
 *
 * Emits warnings for any validation issues found.
 *
 * @param name - The skill name to validate
 * @returns Object with validation results
 *
 * @example
 * ```ts
 * const result = validateSkillName('my-skill');
 * // { isValid: true, warnings: [] }
 *
 * const badResult = validateSkillName('My_Skill');
 * // { isValid: false, warnings: ['...'] }
 * ```
 */
export function validateSkillName(name: string): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let isValid = true;

  if (!name) {
    return { isValid: false, warnings: ['Skill name is required'] };
  }

  // Check length
  if (name.length > MAX_SKILL_NAME_LENGTH) {
    warnings.push(
      `Skill name '${name}' exceeds ${MAX_SKILL_NAME_LENGTH} characters ` +
      `(${name.length} chars). Consider shortening it.`
    );
    isValid = false;
  }

  // Check pattern
  if (!SKILL_NAME_PATTERN.test(name)) {
    warnings.push(
      `Skill name '${name}' should contain only lowercase letters, numbers, and hyphens.`
    );
    isValid = false;
  }

  // Check for reserved words
  for (const reserved of RESERVED_WORDS) {
    if (name.includes(reserved)) {
      warnings.push(`Skill name '${name}' contains reserved word '${reserved}'.`);
      isValid = false;
    }
  }

  return { isValid, warnings };
}

/**
 * Validates skill metadata against Anthropic's requirements.
 *
 * @param frontmatter - Parsed YAML frontmatter
 * @param instructions - The skill instructions content
 * @returns Object with validation results
 */
export function validateSkillMetadata(
  frontmatter: Record<string, unknown>,
  instructions: string
): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let isValid = true;

  const name = frontmatter.name as string | undefined;
  const description = frontmatter.description as string | undefined;
  const compatibility = frontmatter.compatibility as string | undefined;

  // Validate name
  if (name) {
    const nameValidation = validateSkillName(name);
    warnings.push(...nameValidation.warnings);
    if (!nameValidation.isValid) {
      isValid = false;
    }
  }

  // Validate description
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    warnings.push(
      `Skill description exceeds ${MAX_DESCRIPTION_LENGTH} characters ` +
      `(${description.length} chars).`
    );
    isValid = false;
  }

  // Validate compatibility
  if (compatibility && compatibility.length > MAX_COMPATIBILITY_LENGTH) {
    warnings.push(
      `Skill compatibility exceeds ${MAX_COMPATIBILITY_LENGTH} characters ` +
      `(${compatibility.length} chars).`
    );
    isValid = false;
  }

  // Validate instructions length
  const lines = instructions.split('\n');
  if (lines.length > MAX_INSTRUCTIONS_LINES) {
    warnings.push(
      `SKILL.md body exceeds recommended ${MAX_INSTRUCTIONS_LINES} lines ` +
      `(${lines.length} lines). Consider splitting into separate resource files.`
    );
    isValid = false;
  }

  return { isValid, warnings };
}

/**
 * Validates that a path is safe (no path traversal attacks).
 *
 * @param resolvedPath - The resolved absolute path
 * @param basePath - The base directory to check against
 * @returns true if the path is safe, false otherwise
 */
export function isSafePath(resolvedPath: string, basePath: string): boolean {
  try {
    const resolved = resolvedPath;
    const base = basePath;
    // Check if resolved path is within base path
    const relative = resolved.replace(base, '');
    // No parent directory references
    return !relative.includes('..');
  } catch {
    return false;
  }
}
