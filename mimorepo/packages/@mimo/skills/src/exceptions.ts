/**
 * Custom error classes for the skills framework.
 *
 * All skill exceptions inherit from {@link SkillException},
 * making it easy to catch all skill-related errors.
 *
 * @example
 * ```ts
 * try {
 *   await toolset.loadSkill('my-skill');
 * } catch (error) {
 *   if (error instanceof SkillException) {
 *     console.error('Skill-related error:', error.message);
 *   }
 * }
 * ```
 */

/**
 * Base exception for all skill-related errors.
 */
export class SkillException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillException';
  }
}

/**
 * Thrown when a skill is not found in any source.
 */
export class SkillNotFoundError extends SkillException {
  constructor(skillName: string) {
    super(`Skill '${skillName}' not found`);
    this.name = 'SkillNotFoundError';
  }
}

/**
 * Thrown when skill validation fails.
 */
export class SkillValidationError extends SkillException {
  constructor(message: string) {
    super(message);
    this.name = 'SkillValidationError';
  }
}

/**
 * Thrown when a skill resource is not found.
 */
export class SkillResourceNotFoundError extends SkillException {
  constructor(resourceName: string, skillName?: string) {
    const skillInfo = skillName ? ` in skill '${skillName}'` : '';
    super(`Resource '${resourceName}'${skillInfo} not found`);
    this.name = 'SkillResourceNotFoundError';
  }
}

/**
 * Thrown when loading a skill resource fails.
 */
export class SkillResourceLoadError extends SkillException {
  constructor(resourceName: string, cause?: Error) {
    const message = `Failed to load resource '${resourceName}'${cause ? `: ${cause.message}` : ''}`;
    super(message);
    this.name = 'SkillResourceLoadError';
    this.cause = cause;
  }
}

/**
 * Thrown when a skill script is not found.
 */
export class SkillScriptNotFoundError extends SkillException {
  constructor(scriptName: string, skillName?: string) {
    const skillInfo = skillName ? ` in skill '${skillName}'` : '';
    super(`Script '${scriptName}'${skillInfo} not found`);
    this.name = 'SkillScriptNotFoundError';
  }
}

/**
 * Thrown when skill script execution fails.
 */
export class SkillScriptExecutionError extends SkillException {
  constructor(scriptName: string, cause?: Error) {
    const message = `Script '${scriptName}' execution failed${cause ? `: ${cause.message}` : ''}`;
    super(message);
    this.name = 'SkillScriptExecutionError';
    this.cause = cause;
  }
}
