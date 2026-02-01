/**
 * Memory-based cache store implementation
 * Synchronous in-memory cache using Map
 */

import type {
    ICacheStore,
    CacheStoreType,
    CacheStats,
} from '../core/types.js';
import {
    BaseCacheStore,
    getInternalId,
    isExpired,
} from '../core/CacheStore.js';

/**
 * Memory store options
 */
export interface MemoryStoreOptions {
    /** Maximum number of entries */
    maxSize?: number;
    /** Default TTL in milliseconds */
    defaultTTL?: number;
    /** Cleanup interval in milliseconds (0 to disable) */
    cleanupInterval?: number;
}

/**
 * Memory-based cache store
 * All operations are synchronous
 */
export class MemoryStore extends BaseCacheStore implements ICacheStore {
    readonly type: CacheStoreType = 'memory';
    private maxSize?: number;
    private cleanupTimer?: ReturnType<typeof setInterval>;

    constructor(options: MemoryStoreOptions = {}) {
        super(options.defaultTTL);
        this.maxSize = options.maxSize;

        // Start cleanup interval if configured
        if (options.cleanupInterval && options.cleanupInterval > 0) {
            this.cleanupTimer = setInterval(() => {
                this.cleanupExpired();
            }, options.cleanupInterval);
        }
    }

    /**
     * Set a value with size limit enforcement
     */
    set<T>(key: string, value: T, ttl?: number): void {
        // Check if we need to evict entries
        if (this.maxSize && this.stats.totalEntries >= this.maxSize) {
            this.evictLRU();
        }

        super.set(key, value, ttl);
    }

    /**
     * Evict least recently used entry
     */
    private evictLRU(): void {
        let oldestKey: string | undefined;
        let oldestTime = Infinity;

        for (const entry of this.store.data.values()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestKey = entry.key;
            }
        }

        if (oldestKey) {
            this.deleteSync(oldestKey);
        }
    }

    /**
     * Save store state for serialization
     * 借鉴 Orama 的 save() 模式
     */
    save(): unknown {
        const entries: Array<{
            key: string;
            value: unknown;
            createdAt: number;
            expiresAt?: number;
        }> = [];

        for (const entry of this.store.data.values()) {
            if (!isExpired(entry)) {
                entries.push({
                    key: entry.key,
                    value: entry.value,
                    createdAt: entry.createdAt,
                    expiresAt: entry.expiresAt,
                });
            }
        }

        return {
            version: 1,
            entries,
            stats: this.stats,
        };
    }

    /**
     * Load store state from serialized data
     * 借鉴 Orama 的 load() 模式
     */
    load(raw: unknown): void {
        if (!raw || typeof raw !== 'object') {
            return;
        }

        const data = raw as {
            version?: number;
            entries?: Array<{
                key: string;
                value: unknown;
                createdAt: number;
                expiresAt?: number;
            }>;
            stats?: CacheStats;
        };

        if (data.version !== 1) {
            return;
        }

        this.clearSync();

        if (data.entries) {
            for (const item of data.entries) {
                const internalId = getInternalId(this.store, item.key);
                this.store.data.set(internalId, {
                    key: item.key,
                    internalId,
                    value: item.value,
                    createdAt: item.createdAt,
                    expiresAt: item.expiresAt,
                    hits: 0,
                });
            }
        }

        if (data.stats) {
            this.stats = { ...data.stats };
        }

        this.stats.totalEntries = this.store.data.size;
    }

    /**
     * Destroy the store and cleanup resources
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.clearSync();
    }
}

/**
 * Create a memory store with default options
 */
export function createMemoryStore(options?: MemoryStoreOptions): MemoryStore {
    return new MemoryStore(options);
}
