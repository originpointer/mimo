/**
 * Agent Cache for caching and replaying Agent executions
 * 参考 Stagehand AgentCache 的实现
 */

import type { ICacheStore } from '../core/types.js';
import type { AgentExecutionOptions } from './CacheKeyBuilder.js';
import type { PruneOptions } from './ResultPruner.js';
import type { ReplayOptions, AgentContext } from './ReplayEngine.js';
import { CacheKeyBuilder } from './CacheKeyBuilder.js';
import { ResultPruner } from './ResultPruner.js';
import { ReplayEngine } from './ReplayEngine.js';
import { MemoryStore } from '../storage/MemoryStore.js';

/**
 * Cached agent execution
 * 参考 Stagehand AgentCache
 */
export interface CachedAgentExecution {
    version: 1;
    key: string;
    instruction: string;
    startUrl: string;
    options: {
        instruction: string;
        startUrl?: string;
        model: string;
        tools: string[];
    };
    configSignature: string;
    steps: AgentReplayStep[];
    result: AgentResult;
    timestamp: number;
}

/**
 * Agent replay step
 */
export interface AgentReplayStep {
    action: AgentAction;
    selector?: string;
    result?: any;
}

/**
 * Agent action
 */
export interface AgentAction {
    type: string;
    [key: string]: any;
}

/**
 * Agent result
 */
export interface AgentResult {
    success: boolean;
    actions?: AgentAction[];
    error?: string;
    [key: string]: any;
}

/**
 * Cache options for Agent cache
 */
export interface AgentCacheOptions {
    ttl?: number;
    prune?: boolean;
}

/**
 * Agent cache configuration
 */
export interface AgentCacheConfig {
    store?: ICacheStore;
    namespace?: string;
    defaultTTL?: number;
    autoPrune?: boolean;
}

/**
 * Agent cache statistics
 */
export interface AgentCacheStats {
    totalEntries: number;
    hits: number;
    misses: number;
    replayCount: number;
}

/**
 * Agent Cache
 */
export class AgentCache {
    readonly store: ICacheStore;
    readonly namespace: string;
    private keyBuilder: CacheKeyBuilder;
    private pruner: ResultPruner;
    private replayEngine: ReplayEngine;
    private autoPrune: boolean;
    private defaultTTL?: number;

    // Statistics
    private stats: AgentCacheStats = {
        totalEntries: 0,
        hits: 0,
        misses: 0,
        replayCount: 0,
    };

    constructor(config: AgentCacheConfig = {}) {
        this.store = config.store ?? new MemoryStore();
        this.namespace = config.namespace ?? 'agent';
        this.keyBuilder = new CacheKeyBuilder();
        this.pruner = new ResultPruner();
        this.replayEngine = new ReplayEngine();
        this.autoPrune = config.autoPrune ?? true;
        this.defaultTTL = config.defaultTTL;
    }

    /**
     * Build cache key from instruction and options
     */
    buildKey(instruction: string, options: AgentExecutionOptions): string {
        const key = this.keyBuilder.buildFromInstruction(instruction, options);
        return `${this.namespace}:${key}`;
    }

    /**
     * Get cached execution
     */
    async get(key: string): Promise<CachedAgentExecution | null> {
        const cacheKey = `${this.namespace}:${key}`;

        const result = await this.store.get<CachedAgentExecution>(cacheKey);
        if (result) {
            this.stats.hits++;
        } else {
            this.stats.misses++;
        }

        return result;
    }

    /**
     * Save execution to cache
     */
    async save(
        key: string,
        execution: CachedAgentExecution,
        options?: AgentCacheOptions
    ): Promise<void> {
        const cacheKey = `${this.namespace}:${key}`;
        let dataToSave = execution;

        // Auto-prune if enabled or requested
        const shouldPrune = options?.prune ?? this.autoPrune;
        if (shouldPrune && options?.prune !== false) {
            // Convert AgentCacheOptions to PruneOptions
            dataToSave = this.pruner.prune(execution, {
                removeScreenshots: true,
                removeBase64: false,
            });
        }

        // Set with TTL
        await this.store.set(cacheKey, dataToSave, options?.ttl ?? this.defaultTTL);

        // Update stats
        this.stats.totalEntries = (await this.store.keys()).filter(k =>
            k.startsWith(this.namespace)
        ).length;
    }

    /**
     * Invalidate cache entries by pattern
     * @returns Number of entries invalidated
     */
    async invalidate(pattern?: string): Promise<number> {
        const allKeys = await this.store.keys();
        const matchingKeys = pattern
            ? allKeys.filter(key => key.includes(pattern))
            : allKeys.filter(key => key.startsWith(this.namespace));

        let count = 0;
        for (const key of matchingKeys) {
            await this.store.delete(key);
            count++;
        }

        this.stats.totalEntries = (await this.store.keys()).filter(k =>
            k.startsWith(this.namespace)
        ).length;

        return count;
    }

    /**
     * Clear all cached executions
     * @returns Number of entries cleared
     */
    async clear(): Promise<number> {
        return await this.invalidate();
    }

    /**
     * Replay a cached execution
     */
    async replay(
        key: string,
        context: AgentContext,
        options?: ReplayOptions
    ): Promise<AgentResult> {
        const cached = await this.get(key);
        if (!cached) {
            throw new Error(`No cached execution found for key: ${key}`);
        }

        this.stats.replayCount++;
        return await this.replayEngine.replay(cached, context, options);
    }

    /**
     * Check if replay is possible
     */
    canReplay(_key: string, _context?: AgentContext): boolean {
        // This would need async in real implementation
        // For now, return true as a placeholder
        return true;
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<AgentCacheStats> {
        const totalEntries = (await this.store.keys()).filter(k =>
            k.startsWith(this.namespace)
        ).length;

        return {
            totalEntries,
            hits: this.stats.hits,
            misses: this.stats.misses,
            replayCount: this.stats.replayCount,
        };
    }

    /**
     * Get all cache keys
     */
    async keys(): Promise<string[]> {
        const allKeys = await this.store.keys();
        return allKeys
            .filter(key => key.startsWith(this.namespace))
            .map(key => key.substring(this.namespace.length + 1));
    }

    /**
     * Get cache entries (with optional filter)
     */
    async entries(filter?: {
        instruction?: string;
        model?: string;
        startUrl?: string;
    }): Promise<CachedAgentExecution[]> {
        const keys = await this.keys();
        const entries: CachedAgentExecution[] = [];

        for (const key of keys) {
            const execution = await this.get(key);
            if (execution) {
                // Apply filter
                if (filter) {
                    if (filter.instruction && !execution.instruction.includes(filter.instruction)) {
                        continue;
                    }
                    if (filter.model && execution.options.model !== filter.model) {
                        continue;
                    }
                    if (filter.startUrl && execution.startUrl !== filter.startUrl) {
                        continue;
                    }
                }
                entries.push(execution);
            }
        }

        return entries;
    }

    /**
     * Prune an existing cached execution
     */
    async prune(key: string, options?: PruneOptions): Promise<boolean> {
        const execution = await this.get(key);
        if (!execution) {
            return false;
        }

        const pruned = this.pruner.prune(execution, options);
        await this.save(key, pruned, { ...options, prune: false });

        return true;
    }

    /**
     * Estimate size reduction for pruning
     */
    estimatePruningBenefit(execution: CachedAgentExecution, options?: PruneOptions): {
        before: number;
        after: number;
        reduction: number;
        percentage: number;
    } {
        return this.pruner.estimateSizeReduction(execution, options);
    }

    /**
     * Get replay summary for a cached execution
     */
    getReplaySummary(_key: string): {
        total: number;
        byType: Record<string, number>;
        hasScreenshots: boolean;
    } | null {
        // This would need the actual execution
        // For now, return placeholder
        return {
            total: 0,
            byType: {},
            hasScreenshots: false,
        };
    }

    /**
     * Export cache to JSON
     */
    async export(): Promise<Record<string, CachedAgentExecution>> {
        const entries = await this.entries();
        const result: Record<string, CachedAgentExecution> = {};

        for (const entry of entries) {
            result[entry.key] = entry;
        }

        return result;
    }

    /**
     * Import cache from JSON
     */
    async import(data: Record<string, CachedAgentExecution>): Promise<number> {
        let count = 0;

        for (const [key, execution] of Object.entries(data)) {
            await this.save(key, execution);
            count++;
        }

        return count;
    }
}
