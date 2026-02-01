/**
 * Parameter Injector - Auto-detect and inject special parameters
 */

import type {
  ToolDefinition,
  ToolExecutionContext,
  SpecialInjectParam,
} from '@mimo/agent-core/types';

/**
 * Parameter Injector
 * Automatically detects and injects special parameters into tool execution
 */
export class ParamInjector {
  private specialParamTypes: Map<string, SpecialInjectParam> = new Map([
    ['fileSystem', 'fileSystem'],
    ['browser', 'browser'],
    ['llm', 'llm'],
    ['memory', 'memory'],
    ['logger', 'logger'],
    ['config', 'config'],
  ]);

  /**
   * Detect required special parameters from tool definition
   * @param tool - Tool definition
   * @returns List of parameters to inject
   */
  detectRequiredParams(tool: ToolDefinition): SpecialInjectParam[] {
    // Fallback 1: Check explicit injectConfig
    if (tool.injectConfig && tool.injectConfig.length > 0) {
      return tool.injectConfig;
    }

    // Primary path: Regex detection on function signature
    const funcStr = tool.execute.toString();
    const params: SpecialInjectParam[] = [];

    // Try to extract context parameter type
    const contextMatch = funcStr.match(/context\s*[:\s]\s*{([^}]+)}/);
    if (contextMatch && contextMatch[1]) {
      const contextType = contextMatch[1];
      for (const [name, paramType] of this.specialParamTypes) {
        if (contextType.includes(name)) {
          params.push(paramType);
        }
      }
    }

    // Fallback 2: If regex failed but injectConfig exists, use it
    if (params.length === 0 && tool.injectConfig) {
      return tool.injectConfig;
    }

    return params;
  }

  /**
   * Inject special parameters into the params object
   * @param params - Original parameters
   * @param context - Execution context
   * @param tool - Tool definition
   * @returns Parameters with injected values
   */
  inject<T>(
    params: T,
    context: ToolExecutionContext,
    tool: ToolDefinition
  ): T {
    const required = this.detectRequiredParams(tool);
    const injected = { ...params } as T & Partial<ToolExecutionContext>;

    for (const param of required) {
      if (!(param in injected)) {
        (injected as any)[param] = context[param];
      }
    }

    return injected;
  }

  /**
   * Validate that all required context parameters are available
   * @param tool - Tool definition
   * @param context - Execution context
   * @returns Object with valid flag and missing parameters
   */
  validate(
    tool: ToolDefinition,
    context: ToolExecutionContext
  ): { valid: boolean; missing: SpecialInjectParam[] } {
    const required = this.detectRequiredParams(tool);
    const missing: SpecialInjectParam[] = [];

    for (const param of required) {
      if (!(param in context) || context[param] === undefined) {
        missing.push(param);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
