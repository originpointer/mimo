/**
 * Skill resource implementations.
 *
 * Provides static, callable, and file-based resource types.
 *
 * @module resources
 */

import { promises as fs } from 'fs';
import { extname } from 'path';
import JSON5 from 'json5';
import { parse as parseYAML } from 'yaml';
import type { SkillResource, ResourceCallable, FunctionSchema } from '../types.js';
import { SkillResourceLoadError } from '../exceptions.js';

/**
 * Base class for skill resources.
 */
abstract class BaseSkillResource implements SkillResource {
  public function?: ResourceCallable;

  constructor(
    public name: string,
    public description: string | undefined = undefined,
    public content?: string,
    func?: ResourceCallable,
    public takesCtx: boolean = false,
    public functionSchema?: FunctionSchema,
    public uri?: string
  ) {
    this.function = func;
    if (!content && !func && !uri) {
      throw new Error(`Resource '${name}' must have either content, function, or uri`);
    }
  }

  abstract load(ctx: unknown, args?: Record<string, unknown>): Promise<unknown>;
}

/**
 * Static skill resource with pre-defined content.
 */
export class StaticSkillResource extends BaseSkillResource {
  /**
   * Create a static resource with content.
   *
   * @param name - Resource name
   * @param content - Static content string
   * @param description - Optional description
   */
  constructor(
    name: string,
    content: string,
    description?: string
  ) {
    super(name, description, content);
  }

  /**
   * Load the static resource content.
   */
  async load(): Promise<string> {
    return this.content ?? '';
  }
}

/**
 * Callable skill resource that generates content dynamically.
 */
export class CallableSkillResource extends BaseSkillResource {
  /**
   * Create a callable resource.
   *
   * @param name - Resource name
   * @param fn - Function that generates content
   * @param functionSchema - Function schema for LLM integration
   * @param description - Optional description
   * @param takesCtx - Whether function takes context as first argument
   */
  constructor(
    name: string,
    fn: ResourceCallable,
    functionSchema: FunctionSchema,
    description?: string,
    takesCtx: boolean = false
  ) {
    super(name, description, undefined, fn, takesCtx, functionSchema);
  }

  /**
   * Load content by calling the resource function.
   */
  async load(ctx: unknown, args?: Record<string, unknown>): Promise<unknown> {
    if (!this.function || !this.functionSchema) {
      throw new Error(`Resource '${this.name}' has no function or schema`);
    }
    return await this.functionSchema.call(args ?? {}, ctx);
  }
}

/**
 * File-based skill resource that loads content from disk.
 *
 * Automatically parses JSON and YAML files; returns text for other formats.
 */
export class FileBasedSkillResource extends BaseSkillResource {
  /**
   * Create a file-based resource.
   *
   * @param name - Resource name (e.g., "FORMS.md", "data.json")
   * @param uri - Path to the resource file
   * @param description - Optional description
   */
  constructor(
    name: string,
    uri: string,
    description?: string
  ) {
    super(name, description, undefined, undefined, false, undefined, uri);
  }

  /**
   * Load resource content from file.
   *
   * JSON and YAML files are parsed; other files are returned as text.
   *
   * @param ctx - Context (unused for file-based resources)
   * @param args - Arguments (unused for file-based resources)
   * @returns Parsed content (object for JSON/YAML, string for others)
   * @throws {@link SkillResourceLoadError} If file cannot be read
   */
  async load(_ctx: unknown, _args?: Record<string, unknown>): Promise<unknown> {
    if (!this.uri) {
      throw new SkillResourceLoadError(this.name, new Error('Resource has no URI'));
    }

    try {
      const content = await fs.readFile(this.uri, { encoding: 'utf-8' });
      const ext = extname(this.name).toLowerCase();

      // Parse based on file extension
      if (ext === '.json') {
        try {
          return JSON5.parse(content);
        } catch {
          return content; // Fallback to text
        }
      } else if (ext === '.yaml' || ext === '.yml') {
        try {
          return parseYAML(content);
        } catch {
          return content; // Fallback to text
        }
      }

      return content;
    } catch (error) {
      throw new SkillResourceLoadError(
        this.name,
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * Factory function to create a file-based resource.
 *
 * @param name - Resource name
 * @param uri - Path to the resource file
 * @param description - Optional description
 * @returns FileBasedSkillResource instance
 */
export function createFileBasedResource(
  name: string,
  uri: string,
  description?: string
): FileBasedSkillResource {
  return new FileBasedSkillResource(name, uri, description);
}

/**
 * Factory function to create a static resource.
 *
 * @param name - Resource name
 * @param content - Static content
 * @param description - Optional description
 * @returns StaticSkillResource instance
 */
export function createStaticResource(
  name: string,
  content: string,
  description?: string
): StaticSkillResource {
  return new StaticSkillResource(name, content, description);
}

/**
 * Factory function to create a callable resource.
 *
 * @param name - Resource name
 * @param fn - Function that generates content
 * @param functionSchema - Function schema
 * @param description - Optional description
 * @returns CallableSkillResource instance
 */
export function createCallableResource(
  name: string,
  fn: ResourceCallable,
  functionSchema: FunctionSchema,
  description?: string
): CallableSkillResource {
  return new CallableSkillResource(name, fn, functionSchema, description);
}
