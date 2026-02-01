/**
 * Cache Manager - Main entry point for the cache optimization layer
 * 借鉴 Orama 的 create() 模式提供统一的实例创建接口
 */

import type { ICacheStore } from './types.js';
import type {
    CacheHooks,
    BeforeTrackHook,
    AfterTrackHook,
    BeforeCacheHook,
    AfterCacheHook,
} from './hooks.js';
import { createEmptyHooks } from './hooks.js';
import { TokenTracker } from '../token/TokenTracker.js';
import { PricingManager } from '../token/PricingManager.js';
import { AgentCache } from '../agent/AgentCache.js';

/**
 * Cache manager configuration
 */
export interface CacheManagerConfig {
    /** Namespace for cache isolation */
    namespace?: string;
    /** Default TTL for cache entries (milliseconds) */
    defaultTTL?: number;
    /** Enable hook system */
    enableHooks?: boolean;
}

/**
 * Cache components for dependency injection
 * 借鉴 Orama 的组件化设计 - 所有核心组件都可替换
 */
export interface CacheComponents {
    /** Token tracking store */
    tokenStore?: ICacheStore;
    /** Agent cache store */
    agentStore?: ICacheStore;
    /** Custom pricing manager */
    pricingManager?: PricingManager;
    /** Plugins to register */
    plugins?: CachePlugin[];
}

/**
 * Cache plugin interface
 * 借鉴 Orama 的插件系统
 */
export interface CachePlugin {
    /** Plugin name */
    name: string;
    /** Plugin version */
    version?: string;
    /** Plugin hooks */
    hooks?: Partial<{
        beforeTrack: BeforeTrackHook;
        afterTrack: AfterTrackHook;
        beforeCache: BeforeCacheHook;
        afterCache: AfterCacheHook;
    }>;
}

/**
 * Global statistics
 */
export interface GlobalStats {
    tokenTracking: {
        totalCost: number;
        totalTokens: number;
        recordCount: number;
    };
    agentCache: {
        hitCount: number;
        missCount: number;
        replayCount: number;
        entryCount: number;
    };
}

/**
 * Cache Manager - Main class
 */
export class CacheManager {
    readonly config: CacheManagerConfig;
    readonly tokenTracker: TokenTracker;
    readonly agentCache: AgentCache;
    readonly pricing: PricingManager;

    private hooks: CacheHooks;
    private plugins: Map<string, CachePlugin>;

    private constructor(
        config: CacheManagerConfig,
        components: CacheComponents = {}
    ) {
        this.config = {
            namespace: 'default',
            enableHooks: true,
            ...config,
        };

        this.hooks = createEmptyHooks();
        this.plugins = new Map();

        // Initialize pricing manager
        this.pricing = components.pricingManager ?? new PricingManager();

        // Initialize token tracker
        this.tokenTracker = new TokenTracker({
            store: components.tokenStore,
            pricing: this.pricing,
            namespace: `${this.config.namespace}:token`,
        });

        // Initialize agent cache
        this.agentCache = new AgentCache({
            store: components.agentStore,
            namespace: `${this.config.namespace}:agent`,
        });

        // Register plugins
        if (components.plugins) {
            for (const plugin of components.plugins) {
                this.registerPlugin(plugin);
            }
        }
    }

    /**
     * Create a new CacheManager instance
     * 借鉴 Orama 的 create() 模式
     */
    static create(
        config: CacheManagerConfig = {},
        components?: CacheComponents
    ): CacheManager {
        return new CacheManager(config, components);
    }

    /**
     * Register a beforeTrack hook
     */
    onBeforeTrack(hook: BeforeTrackHook): void {
        this.hooks.beforeTrack.push(hook);
    }

    /**
     * Register an afterTrack hook
     */
    onAfterTrack(hook: AfterTrackHook): void {
        this.hooks.afterTrack.push(hook);
    }

    /**
     * Register a beforeCache hook
     */
    onBeforeCache(hook: BeforeCacheHook): void {
        this.hooks.beforeCache.push(hook);
    }

    /**
     * Register an afterCache hook
     */
    onAfterCache(hook: AfterCacheHook): void {
        this.hooks.afterCache.push(hook);
    }

    /**
     * Register a plugin
     */
    registerPlugin(plugin: CachePlugin): void {
        if (this.plugins.has(plugin.name)) {
            throw new Error(`Plugin '${plugin.name}' is already registered`);
        }

        this.plugins.set(plugin.name, plugin);

        // Register plugin hooks
        if (plugin.hooks) {
            if (plugin.hooks.beforeTrack) {
                this.hooks.beforeTrack.push(plugin.hooks.beforeTrack);
            }
            if (plugin.hooks.afterTrack) {
                this.hooks.afterTrack.push(plugin.hooks.afterTrack);
            }
            if (plugin.hooks.beforeCache) {
                this.hooks.beforeCache.push(plugin.hooks.beforeCache);
            }
            if (plugin.hooks.afterCache) {
                this.hooks.afterCache.push(plugin.hooks.afterCache);
            }
        }
    }

    /**
     * Unregister a plugin
     */
    unregisterPlugin(name: string): boolean {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            return false;
        }

        // Remove plugin hooks (requires rebuilding hooks arrays)
        this.hooks = createEmptyHooks();
        this.plugins.delete(name);

        // Re-register remaining plugins
        for (const [_, p] of this.plugins) {
            this.registerPlugin(p);
        }

        return true;
    }

    /**
     * Get registered plugins
     */
    getPlugins(): CachePlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Get hooks (for internal use)
     */
    getHooks(): CacheHooks {
        return this.hooks;
    }

    /**
     * Get global statistics
     */
    async getStats(): Promise<GlobalStats> {
        const tokenStats = await this.tokenTracker.getStats();
        const agentStats = await this.agentCache.getStats();

        return {
            tokenTracking: {
                totalCost: tokenStats.totalCost,
                totalTokens: tokenStats.totalTokens,
                recordCount: tokenStats.recordCount,
            },
            agentCache: {
                hitCount: agentStats.hits,
                missCount: agentStats.misses,
                replayCount: agentStats.replayCount,
                entryCount: agentStats.totalEntries,
            },
        };
    }

    /**
     * Clear all caches
     */
    async clear(): Promise<void> {
        await Promise.all([
            this.tokenTracker.clear(),
            this.agentCache.clear(),
        ]);
    }

    /**
     * Save state to serializable data
     * 借鉴 Orama 的 save() 模式
     */
    async save(): Promise<Record<string, unknown>> {
        const result: Record<string, unknown> = {
            version: 1,
            config: this.config,
            plugins: Array.from(this.plugins.entries()).map(([name, plugin]) => [
                name,
                { name: plugin.name, version: plugin.version },
            ]),
        };

        // Save token tracker state
        if (this.tokenTracker.store?.save) {
            result.tokenTracker = await this.tokenTracker.store.save();
        }

        // Save agent cache state
        if (this.agentCache.store?.save) {
            result.agentCache = await this.agentCache.store.save();
        }

        return result;
    }

    /**
     * Load state from serialized data
     * 借鉴 Orama 的 load() 模式
     */
    async load(data: Record<string, unknown>): Promise<void> {
        if (data.tokenTracker && this.tokenTracker.store?.load) {
            await this.tokenTracker.store.load(data.tokenTracker);
        }

        if (data.agentCache && this.agentCache.store?.load) {
            await this.agentCache.store.load(data.agentCache);
        }
    }
}
