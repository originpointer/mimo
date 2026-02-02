/**
 * Skill script implementations.
 *
 * Provides callable and file-based script types for execution.
 *
 * @module scripts
 */

import { ScriptExecutor } from '../types.js';
import type { SkillScript, ScriptCallable, FunctionSchema } from '../types.js';
import { SkillScriptExecutionError } from '../exceptions.js';

/**
 * Base class for skill scripts.
 */
abstract class BaseSkillScript implements SkillScript {
  public function?: ScriptCallable;

  constructor(
    public name: string,
    public description: string | undefined = undefined,
    func?: ScriptCallable,
    public takesCtx: boolean = false,
    public functionSchema?: FunctionSchema,
    public uri?: string,
    public skillName?: string,
    public executor?: ScriptExecutor
  ) {
    this.function = func;
    if (!func && !uri) {
      throw new Error(`Script '${name}' must have either function or uri`);
    }
  }

  abstract run(ctx: unknown, args?: Record<string, unknown>): Promise<unknown>;
}

/**
 * Callable skill script implemented as a function.
 */
export class CallableSkillScript extends BaseSkillScript {
  /**
   * Create a callable script.
   *
   * @param name - Script name
   * @param fn - Function that implements the script
   * @param functionSchema - Function schema for LLM integration
   * @param description - Optional description
   * @param skillName - Optional parent skill name
   * @param takesCtx - Whether function takes context as first argument
   */
  constructor(
    name: string,
    fn: ScriptCallable,
    functionSchema: FunctionSchema,
    description?: string,
    skillName?: string,
    takesCtx: boolean = false
  ) {
    super(name, description, fn, takesCtx, functionSchema, undefined, skillName);
  }

  /**
   * Execute the script by calling the function.
   */
  async run(ctx: unknown, args?: Record<string, unknown>): Promise<unknown> {
    if (!this.function || !this.functionSchema) {
      throw new Error(`Script '${this.name}' has no function or schema`);
    }
    return await this.functionSchema.call(args ?? {}, ctx);
  }
}

/**
 * File-based skill script that executes via subprocess.
 *
 * Uses an executor to run the script file.
 */
export class FileBasedSkillScript extends BaseSkillScript {
  /**
   * Create a file-based script.
   *
   * @param name - Script name (usually includes .py extension)
   * @param uri - Path to the script file
   * @param executor - Executor for running the script
   * @param description - Optional description
   * @param skillName - Optional parent skill name
   */
  constructor(
    name: string,
    uri: string,
    executor: ScriptExecutor,
    description?: string,
    skillName?: string
  ) {
    super(name, description, undefined, false, undefined, uri, skillName, executor);
  }

  /**
   * Execute the script via the executor.
   *
   * @param ctx - Context (passed to executor)
   * @param args - Named arguments for the script
   * @returns Script output
   */
  async run(ctx: unknown, args?: Record<string, unknown>): Promise<unknown> {
    if (!this.uri) {
      throw new SkillScriptExecutionError(this.name, new Error('Script has no URI'));
    }

    if (!this.executor) {
      throw new SkillScriptExecutionError(this.name, new Error('Script has no executor'));
    }

    return await this.executor.run(this, args);
  }
}

/**
 * Factory function to create a callable script.
 *
 * @param name - Script name
 * @param fn - Function that implements the script
 * @param functionSchema - Function schema
 * @param description - Optional description
 * @returns CallableSkillScript instance
 */
export function createCallableScript(
  name: string,
  fn: ScriptCallable,
  functionSchema: FunctionSchema,
  description?: string
): CallableSkillScript {
  return new CallableSkillScript(name, fn, functionSchema, description);
}

/**
 * Factory function to create a file-based script.
 *
 * @param name - Script name
 * @param uri - Path to the script file
 * @param executor - Executor for running the script
 * @param description - Optional description
 * @returns FileBasedSkillScript instance
 */
export function createFileBasedScript(
  name: string,
  uri: string,
  executor: ScriptExecutor,
  description?: string
): FileBasedSkillScript {
  return new FileBasedSkillScript(name, uri, executor, description);
}
