/**
 * Type extensions for ToolDefinition
 * Uses module augmentation to add fields without modifying agent-core
 */

import type { SpecialInjectParam } from '@mimo/agent-core/types';

declare module '@mimo/agent-core/types' {
  interface ToolDefinition<T = any> {
    /**
     * Tool group for scheduling
     * Tools in the same group execute serially, different groups execute in parallel
     * @example 'browser', 'filesystem', 'web', 'runtime', 'memory'
     */
    group?: string;

    /**
     * Manual parameter injection configuration (fallback)
     * When regex detection fails, use this to explicitly declare required parameters
     * @example ['fileSystem', 'browser', 'logger']
     */
    injectConfig?: SpecialInjectParam[];
  }
}

export {};
