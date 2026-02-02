/**
 * Skill implementation with fluent API.
 *
 * Provides a builder pattern for creating programmatic skills.
 *
 * @module skill
 */

import type { Skill, SkillResource, SkillScript, ResourceCallable, ScriptCallable, FunctionSchema } from '../types.js';
import { normalizeSkillName } from '../types.js';
import { createCallableResource, createStaticResource } from '../resources/index.js';
import { createCallableScript } from '../scripts/index.js';
import { SkillValidationError } from '../exceptions.js';

/**
 * Skill builder for fluent API.
 *
 * @example
 * ```ts
 * const skill = new SkillBuilder('my-skill', 'My skill description')
 *   .setContent('Instructions here...')
 *   .addResource('schema', 'Schema content')
 *   .addScript('analyze', analyzeFn, schema)
 *   .build();
 * ```
 */
export class SkillBuilder {
  private resources: SkillResource[] = [];
  private scripts: SkillScript[] = [];

  constructor(
    private name: string,
    private description: string
  ) {
    this.name = normalizeSkillName(name);
  }

  /**
   * Set the skill content (instructions).
   */
  setContent(content: string): this {
    this.content = content;
    return this;
  }

  private content: string = '';

  /**
   * Set the skill license.
   */
  setLicense(license: string): this {
    this.license = license;
    return this;
  }

  private license: string | undefined;

  /**
   * Set skill compatibility requirements.
   */
  setCompatibility(compatibility: string): this {
    this.compatibility = compatibility;
    return this;
  }

  private compatibility: string | undefined;

  /**
   * Set the skill URI (file path).
   */
  setUri(uri: string): this {
    this.uri = uri;
    return this;
  }

  private uri: string | undefined;

  /**
   * Add metadata.
   */
  setMetadata(metadata: Record<string, unknown>): this {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  private metadata: Record<string, unknown> = {};

  /**
   * Add a static resource.
   */
  addResource(
    name: string,
    content: string,
    description?: string
  ): this {
    this.resources.push(createStaticResource(name, content, description));
    return this;
  }

  /**
   * Add a callable resource.
   */
  addCallableResource(
    name: string,
    fn: ResourceCallable,
    schema: FunctionSchema,
    description?: string
  ): this {
    this.resources.push(createCallableResource(name, fn, schema, description));
    return this;
  }

  /**
   * Add a callable script.
   */
  addScript(
    name: string,
    fn: ScriptCallable,
    schema: FunctionSchema,
    description?: string
  ): this {
    this.scripts.push(createCallableScript(name, fn, schema, description));
    return this;
  }

  /**
   * Build the skill.
   */
  build(): Skill {
    return {
      name: this.name,
      description: this.description,
      content: this.content,
      license: this.license,
      compatibility: this.compatibility,
      uri: this.uri,
      resources: this.resources,
      scripts: this.scripts,
      metadata: Object.keys(this.metadata).length > 0 ? this.metadata : undefined
    };
  }
}

/**
 * Create a skill using a fluent builder API.
 *
 * @param name - Skill name (will be normalized)
 * @param description - Skill description
 * @returns SkillBuilder instance
 *
 * @example
 * ```ts
 * const skill = createSkill('data-analyzer', 'Data analysis tool')
 *   .setContent('Instructions...')
 *   .addResource('schema', schemaContent)
 *   .build();
 * ```
 */
export function createSkill(
  name: string,
  description: string
): SkillBuilder {
  return new SkillBuilder(name, description);
}

/**
 * Create a skill from an options object.
 *
 * @param options - Skill options
 * @returns Skill object
 */
export function createSkillFromOptions(options: {
  name: string;
  description: string;
  content?: string;
  license?: string;
  compatibility?: string;
  uri?: string;
  resources?: SkillResource[];
  scripts?: SkillScript[];
  metadata?: Record<string, unknown>;
}): Skill {
  const normalizedName = normalizeSkillName(options.name);

  return {
    name: normalizedName,
    description: options.description,
    content: options.content ?? '',
    license: options.license,
    compatibility: options.compatibility,
    uri: options.uri,
    resources: options.resources ?? [],
    scripts: options.scripts ?? [],
    metadata: options.metadata
  };
}

// Re-exports
export { SkillBuilder };
export default SkillBuilder;
