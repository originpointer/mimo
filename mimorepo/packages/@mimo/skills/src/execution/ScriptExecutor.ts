/**
 * Script executors for running skill scripts.
 *
 * Provides local subprocess execution and custom callable executors.
 *
 * @module execution
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import type { ScriptExecutor, SkillScript } from '../types.js';
import { SkillScriptExecutionError } from '../exceptions.js';
import { DEFAULT_SCRIPT_TIMEOUT } from '../constants.js';

/**
 * Execute skill scripts using local Python subprocess.
 *
 * Converts args dict to command-line flags and executes with timeout.
 */
export class LocalScriptExecutor implements ScriptExecutor {
  private pythonPath: string;

  /**
   * Create a local script executor.
   *
   * @param timeout - Execution timeout in milliseconds (default: 30000)
   * @param pythonPath - Path to Python executable (default: 'python3')
   */
  constructor(
    private timeout = DEFAULT_SCRIPT_TIMEOUT,
    pythonPath?: string
  ) {
    this.pythonPath = pythonPath || process.env.PYTHON || 'python3';
  }

  /**
   * Run a skill script locally using subprocess.
   *
   * Converts args dict to CLI flags:
   * - Boolean True: --flag only
   * - Boolean False/None: omit
   * - List: repeat flag for each item
   * - Other: --key value
   *
   * @param script - The script to run
   * @param args - Named arguments as a dictionary
   * @returns Combined stdout and stderr output
   * @throws {@link SkillScriptExecutionError} If execution fails or times out
   */
  async run(script: SkillScript, args?: Record<string, unknown>): Promise<string> {
    if (!script.uri) {
      throw new SkillScriptExecutionError(script.name, new Error('Script has no URI'));
    }

    const cmd = [this.pythonPath, script.uri];
    const cwd = resolve(script.uri, '..');

    // Convert args to CLI flags
    if (args) {
      for (const [key, value] of Object.entries(args)) {
        const flag = `--${key}`;

        if (typeof value === 'boolean') {
          if (value) {
            cmd.push(flag);
          }
          // false/undefined: omit the flag
        } else if (Array.isArray(value)) {
          for (const item of value) {
            cmd.push(flag, String(item));
          }
        } else if (value !== null && value !== undefined) {
          cmd.push(flag, String(value));
        }
      }
    }

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timer: NodeJS.Timeout | undefined;

      const proc = spawn(cmd[0]!, cmd.slice(1), { cwd });

      // Set timeout
      timer = setTimeout(() => {
        proc.kill();
        reject(
          new SkillScriptExecutionError(
            script.name,
            new Error(`Script execution timeout after ${this.timeout}ms`)
          )
        );
      }, this.timeout);

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (timer) clearTimeout(timer);
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          const errorMsg = stderr.trim() || `Script exited with code ${code}`;
          reject(new SkillScriptExecutionError(script.name, new Error(errorMsg)));
        }
      });

      proc.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(new SkillScriptExecutionError(script.name, err));
      });
    });
  }
}

/**
 * Wraps a callable in a script executor interface.
 *
 * Allows custom execution logic for file-based scripts (remote execution,
 * sandboxed execution, etc.).
 *
 * @example
 * ```ts
 * async function myExecutor(script: SkillScript, args?: Record<string, unknown>) {
 *   // Custom execution logic
 *   return `Executed ${script.name} with ${JSON.stringify(args)}`;
 * }
 *
 * const executor = new CallableScriptExecutor(myExecutor);
 * ```
 */
export class CallableScriptExecutor implements ScriptExecutor {
  private isAsync: boolean;

  /**
   * Create a callable script executor.
   *
   * @param fn - Callable that executes scripts
   */
  constructor(private fn: (script: SkillScript, args?: Record<string, unknown>) => unknown) {
    this.isAsync = fn.constructor.name === 'AsyncFunction';
  }

  /**
   * Run using the wrapped callable.
   *
   * @param script - The script to run
   * @param args - Named arguments as a dictionary
   * @returns Script output (can be any type)
   */
  async run(script: SkillScript, args?: Record<string, unknown>): Promise<unknown> {
    const result = this.fn(script, args);
    return this.isAsync ? await result : result;
  }
}

/**
 * Factory function to create a local script executor.
 *
 * @param timeout - Execution timeout in milliseconds
 * @param pythonPath - Path to Python executable
 * @returns LocalScriptExecutor instance
 */
export function createLocalScriptExecutor(
  timeout?: number,
  pythonPath?: string
): LocalScriptExecutor {
  return new LocalScriptExecutor(timeout, pythonPath);
}

/**
 * Factory function to create a callable script executor.
 *
 * @param fn - Function that executes scripts
 * @returns CallableScriptExecutor instance
 */
export function createCallableScriptExecutor(
  fn: (script: SkillScript, args?: Record<string, unknown>) => unknown
): CallableScriptExecutor {
  return new CallableScriptExecutor(fn);
}
