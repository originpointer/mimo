/**
 * Cache Plugin System
 * 借鉴 Orama 的插件系统
 */

import type {
    BeforeTrackHook,
    AfterTrackHook,
    BeforeCacheHook,
    AfterCacheHook,
    BeforeReplayHook,
    AfterReplayHook,
    BeforeInvalidateHook,
    AfterInvalidateHook,
} from '../core/hooks.js';
import type { SyncOrAsync } from '../core/types.js';

/**
 * Cache plugin interface
 */
export interface CachePlugin {
    /** Plugin name */
    name: string;
    /** Plugin version */
    version?: string;
    /** Plugin description */
    description?: string;
    /** Plugin author */
    author?: string;
    /** Plugin hooks */
    hooks?: {
        beforeTrack?: BeforeTrackHook;
        afterTrack?: AfterTrackHook;
        beforeCache?: BeforeCacheHook;
        afterCache?: AfterCacheHook;
        beforeReplay?: BeforeReplayHook;
        afterReplay?: AfterReplayHook;
        beforeInvalidate?: BeforeInvalidateHook;
        afterInvalidate?: AfterInvalidateHook;
    };
    /** Plugin initialization (optional) */
    init?(): SyncOrAsync<void>;
    /** Plugin cleanup (optional) */
    destroy?(): SyncOrAsync<void>;
    /** Plugin-specific methods (optional) */
    [key: string]: any;
}

/**
 * Plugin manager
 */
export class PluginManager {
    private plugins: Map<string, CachePlugin>;
    private initialized: Set<string>;

    constructor() {
        this.plugins = new Map();
        this.initialized = new Set();
    }

    /**
     * Register a plugin
     */
    async register(plugin: CachePlugin): Promise<boolean> {
        if (this.plugins.has(plugin.name)) {
            return false;
        }

        this.plugins.set(plugin.name, plugin);

        // Initialize plugin if it has an init function
        if (plugin.init && !this.initialized.has(plugin.name)) {
            await plugin.init();
            this.initialized.add(plugin.name);
        }

        return true;
    }

    /**
     * Unregister a plugin
     */
    async unregister(name: string): Promise<boolean> {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            return false;
        }

        // Cleanup plugin if it has a destroy function
        if (plugin.destroy && this.initialized.has(name)) {
            await plugin.destroy();
            this.initialized.delete(name);
        }

        this.plugins.delete(name);
        return true;
    }

    /**
     * Get a plugin by name
     */
    get(name: string): CachePlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * Get all plugins
     */
    getAll(): CachePlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Check if a plugin is registered
     */
    has(name: string): boolean {
        return this.plugins.has(name);
    }

    /**
     * Get all hooks for a specific hook name
     */
    getHooks<K extends keyof CachePlugin['hooks']>(
        hookName: K
   ): NonNullable<CachePlugin['hooks']>[K][] {
        const hooks: NonNullable<CachePlugin['hooks']>[K][] = [];

        for (const plugin of this.plugins.values()) {
            if (plugin.hooks && plugin.hooks[hookName]) {
                hooks.push(plugin.hooks[hookName]!);
            }
        }

        return hooks;
    }

    /**
     * Clear all plugins
     */
    async clear(): Promise<void> {
        const pluginNames = Array.from(this.plugins.keys());

        for (const name of pluginNames) {
            await this.unregister(name);
        }
    }
}

/**
 * Create a logging plugin
 */
export function createLoggingPlugin(options?: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}): CachePlugin {
    const logLevel = options?.logLevel ?? 'info';

    return {
        name: 'logger',
        version: '1.0.0',
        description: 'Logging plugin for cache operations',
        hooks: {
            afterTrack: async (_context, record) => {
                if (logLevel === 'debug' || logLevel === 'info') {
                    console.log(`[Cache] Token tracked: ${record.model} - $${record.costs.totalCost.toFixed(6)}`);
                }
            },
            afterCache: async (context, _execution) => {
                if (logLevel === 'debug' || logLevel === 'info') {
                    console.log(`[Cache] Execution cached: ${context.key}`);
                }
            },
            afterReplay: async (cached, result) => {
                if (logLevel === 'debug' || logLevel === 'info') {
                    console.log(`[Cache] Execution replayed: ${cached.key} - ${result.success ? 'success' : 'failed'}`);
                }
            },
            afterInvalidate: async (pattern, count) => {
                if (logLevel === 'debug' || logLevel === 'info') {
                    console.log(`[Cache] Invalidated ${count} entries matching: ${pattern || 'all'}`);
                }
            },
        },
    };
}

/**
 * Create a metrics plugin
 */
export function createMetricsPlugin(): CachePlugin {
    const metrics = {
        tokenTrackCount: 0,
        totalTokenCost: 0,
        cacheHitCount: 0,
        cacheMissCount: 0,
        replayCount: 0,
        invalidateCount: 0,
    };

    return {
        name: 'metrics',
        version: '1.0.0',
        description: 'Metrics collection plugin',
        hooks: {
            afterTrack: async (_, record) => {
                metrics.tokenTrackCount++;
                metrics.totalTokenCost += record.costs.totalCost;
            },
            afterCache: async () => {
                metrics.cacheHitCount++;
            },
            afterReplay: async () => {
                metrics.replayCount++;
            },
            afterInvalidate: async () => {
                metrics.invalidateCount++;
            },
        },
        init() {
            // Reset metrics
            metrics.tokenTrackCount = 0;
            metrics.totalTokenCost = 0;
            metrics.cacheHitCount = 0;
            metrics.cacheMissCount = 0;
            metrics.replayCount = 0;
            metrics.invalidateCount = 0;
        },
        destroy() {
            // Log final metrics
            console.log('[Metrics] Final metrics:', metrics);
        },
        getMetrics: () => ({ ...metrics }),
    };
}

/**
 * Create a persistence plugin
 */
export function createPersistencePlugin(options: {
    saveInterval?: number;
    onSave?: (data: unknown) => SyncOrAsync<void>;
}): CachePlugin {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    return {
        name: 'persistence',
        version: '1.0.0',
        description: 'Automatic persistence plugin',
        hooks: {
            afterCache: async () => {
                // Trigger save on cache change
                if (options.onSave) {
                    await options.onSave({ timestamp: Date.now() });
                }
            },
        },
        init() {
            // Set up interval saving
            if (options.saveInterval && options.saveInterval > 0) {
                intervalId = setInterval(async () => {
                    if (options.onSave) {
                        await options.onSave({ timestamp: Date.now() });
                    }
                }, options.saveInterval);
            }
        },
        destroy() {
            if (intervalId) {
                clearInterval(intervalId);
            }
        },
    };
}
