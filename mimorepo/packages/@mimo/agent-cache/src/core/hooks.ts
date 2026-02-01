/**
 * Hook system for cache operations
 * 借鉴 Orama 的 Hook 系统 - 使用数组存储多个 hook 函数
 */

import type { SyncOrAsync } from './types.js';
import type {
    CachedAgentExecution,
    AgentResult,
} from '../agent/AgentCache.js';

// Re-export agent types from AgentCache to avoid duplication
export type {
    CachedAgentExecution,
    AgentReplayStep,
    AgentAction,
    AgentResult,
} from '../agent/AgentCache.js';

/**
 * Token tracking context
 */
export interface TrackContext {
    model: string;
    agentId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
}

/**
 * Token cost record
 */
export interface TokenCostRecord {
    id: string;
    timestamp: number;
    model: string;
    provider: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        cachedReadTokens?: number;
        cachedCreationTokens?: number;
        reasoningTokens?: number;
    };
    costs: {
        inputCost: number;
        outputCost: number;
        cacheReadCost?: number;
        cacheWriteCost?: number;
        reasoningCost?: number;
        totalCost: number;
    };
}

/**
 * Agent cache context
 */
export interface AgentCacheContext {
    key: string;
    instruction: string;
    options: {
        instruction: string;
        startUrl?: string;
        model: string;
        tools: string[];
    };
}

/**
 * Available hook names
 */
export type CacheHookName =
    | 'beforeTrack'
    | 'afterTrack'
    | 'beforeCache'
    | 'afterCache'
    | 'beforeReplay'
    | 'afterReplay'
    | 'beforeInvalidate'
    | 'afterInvalidate';

/**
 * Hook type definitions
 */
export type BeforeTrackHook = (context: TrackContext) => SyncOrAsync<void>;
export type AfterTrackHook = (context: TrackContext, record: TokenCostRecord) => SyncOrAsync<void>;
export type BeforeCacheHook = (context: AgentCacheContext, execution: CachedAgentExecution) => SyncOrAsync<void>;
export type AfterCacheHook = (context: AgentCacheContext, execution: CachedAgentExecution) => SyncOrAsync<void>;
export type BeforeReplayHook = (cached: CachedAgentExecution) => SyncOrAsync<void>;
export type AfterReplayHook = (cached: CachedAgentExecution, result: AgentResult) => SyncOrAsync<void>;
export type BeforeInvalidateHook = (pattern?: string) => SyncOrAsync<void>;
export type AfterInvalidateHook = (pattern?: string, count?: number) => SyncOrAsync<void>;

/**
 * Hook storage
 */
export interface CacheHooks {
    beforeTrack: BeforeTrackHook[];
    afterTrack: AfterTrackHook[];
    beforeCache: BeforeCacheHook[];
    afterCache: AfterCacheHook[];
    beforeReplay: BeforeReplayHook[];
    afterReplay: AfterReplayHook[];
    beforeInvalidate: BeforeInvalidateHook[];
    afterInvalidate: AfterInvalidateHook[];
}

/**
 * Create empty hooks object
 */
export function createEmptyHooks(): CacheHooks {
    return {
        beforeTrack: [],
        afterTrack: [],
        beforeCache: [],
        afterCache: [],
        beforeReplay: [],
        afterReplay: [],
        beforeInvalidate: [],
        afterInvalidate: [],
    };
}

/**
 * Run a single hook
 * 借鉴 Orama 的 runSingleHook 模式
 */
export async function runHook<T>(
    hooks: Array<(...args: any[]) => SyncOrAsync<T>>,
    ...args: any[]
): Promise<void> {
    for (const hook of hooks) {
        await hook(...args);
    }
}

/**
 * Run hooks and collect results
 */
export async function runHooksCollect<R>(
    hooks: Array<(...args: any[]) => SyncOrAsync<R>>,
    ...args: any[]
): Promise<R[]> {
    const results: R[] = [];
    for (const hook of hooks) {
        const result = await hook(...args);
        results.push(result);
    }
    return results;
}

/**
 * Check if a value is a promise
 */
export function isPromise<T>(value: SyncOrAsync<T>): value is PromiseLike<T> {
    return value !== null && typeof value === 'object' && 'then' in value;
}

/**
 * Resolve a sync or async value
 */
export async function resolveValue<T>(value: SyncOrAsync<T>): Promise<T> {
    if (isPromise(value)) {
        return await value;
    }
    return value;
}
