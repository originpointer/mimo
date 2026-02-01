/**
 * @mimo/agent-cache - Cache optimization layer for Mimo Agent system
 *
 * 借鉴 @orama/orama 的设计模式，实现标准化、组件化的缓存优化层
 *
 * @module @mimo/agent-cache
 */

// Core exports
export { CacheManager } from './core/CacheManager.js';
export type {
    CacheManagerConfig,
    CacheComponents,
    GlobalStats,
    CachePlugin as CacheManagerPlugin,
} from './core/CacheManager.js';

export {
    BaseCacheStore,
    createInternalKeyStore,
    getInternalId,
    getKeyFromInternal,
    isExpired,
    estimateMemoryUsage,
} from './core/CacheStore.js';
export type {
    ICacheStore,
    CacheStoreType,
    CacheEntry,
    CacheStats,
    InternalKeyStore,
    CacheOptions,
    SyncOrAsync,
} from './core/types.js';

export {
    createEmptyHooks,
    runHook,
    runHooksCollect,
    isPromise,
    resolveValue,
} from './core/hooks.js';
export type {
    TrackContext,
    TokenCostRecord,
    AgentCacheContext,
    CacheHookName,
    BeforeTrackHook,
    AfterTrackHook,
    BeforeCacheHook,
    AfterCacheHook,
    BeforeReplayHook,
    AfterReplayHook,
    BeforeInvalidateHook,
    AfterInvalidateHook,
    CacheHooks,
} from './core/hooks.js';

// Token tracking exports
export { TokenTracker } from './token/TokenTracker.js';
export type {
    TokenTrackerOptions,
    CostFilter,
    TokenUsageRecord,
} from './token/TokenTracker.js';

export { PricingManager } from './token/PricingManager.js';
export type {
    ModelPricing,
    TokenCostRecord as PricingTokenCostRecord,
    PricingStats,
} from './token/PricingManager.js';

// Agent cache exports
export { AgentCache } from './agent/AgentCache.js';
export type {
    AgentCacheOptions,
    AgentCacheConfig,
    AgentCacheStats,
    CachedAgentExecution,
    AgentReplayStep,
    AgentAction,
    AgentResult,
} from './agent/AgentCache.js';

export { CacheKeyBuilder, defaultKeyBuilder } from './agent/CacheKeyBuilder.js';
export type {
    AgentExecutionOptions,
    CacheKeyConfig,
} from './agent/CacheKeyBuilder.js';

export { ResultPruner, defaultPruner } from './agent/ResultPruner.js';
export type { PruneOptions } from './agent/ResultPruner.js';

export { ReplayEngine, defaultReplayEngine } from './agent/ReplayEngine.js';
export type {
    ReplayOptions,
    AgentContext,
    IPage,
} from './agent/ReplayEngine.js';

// Plugin exports
export {
    PluginManager,
    createLoggingPlugin,
    createMetricsPlugin,
    createPersistencePlugin,
} from './plugins/CachePlugin.js';
export type { CachePlugin } from './plugins/CachePlugin.js';

// Re-export types from agent-core
export type { TokenUsage, LLMProvider } from '@mimo/agent-core';
