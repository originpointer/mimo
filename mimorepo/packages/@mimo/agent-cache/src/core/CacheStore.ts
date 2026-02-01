/**
 * Cache Store implementation with internal key mapping
 * 借鉴 Orama InternalDocumentIDStore 实现高效的键映射
 */

import type {
    ICacheStore,
    CacheStoreType,
    CacheEntry,
    CacheStats,
    InternalKeyStore,
} from './types.js';
import type { SyncOrAsync } from './types.js';
import { resolveValue } from './hooks.js';

/**
 * Create an internal key store
 * 借鉴 Orama createInternalDocumentIDStore
 */
export function createInternalKeyStore(): InternalKeyStore {
    return {
        keyToInternal: new Map<string, number>(),
        internalToKey: [],
        data: new Map<number, CacheEntry>(),
    };
}

/**
 * Get or create internal ID for a key
 * 借鉴 Orama getInternalDocumentId
 */
export function getInternalId(store: InternalKeyStore, key: string): number {
    let internalId = store.keyToInternal.get(key);
    if (internalId === undefined) {
        internalId = store.internalToKey.length;
        store.keyToInternal.set(key, internalId);
        store.internalToKey.push(key);
    }
    return internalId;
}

/**
 * Get original key from internal ID
 * 借鉴 Orama getDocumentIdFromInternalId
 */
export function getKeyFromInternal(store: InternalKeyStore, internalId: number): string | undefined {
    return store.internalToKey[internalId];
}

/**
 * Check if entry is expired
 */
export function isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt < Date.now();
}

/**
 * Estimate memory usage of a value (rough approximation)
 */
export function estimateMemoryUsage(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (value instanceof ArrayBuffer) return value.byteLength;
    if (Array.isArray(value)) {
        return value.reduce((sum, item) => sum + estimateMemoryUsage(item), 0);
    }
    if (typeof value === 'object') {
        return Object.entries(value).reduce(
            (sum, [k, v]) => sum + k.length * 2 + estimateMemoryUsage(v),
            0
        );
    }
    return 0;
}

/**
 * Base cache store implementation with internal key mapping
 */
export abstract class BaseCacheStore implements ICacheStore {
    abstract readonly type: CacheStoreType;

    protected store: InternalKeyStore;
    protected stats: CacheStats;
    protected defaultTTL?: number;
    protected startTime: number;

    constructor(defaultTTL?: number) {
        this.store = createInternalKeyStore();
        this.stats = {
            totalEntries: 0,
            memoryUsage: 0,
            hitRate: 0,
            totalRequests: 0,
            hits: 0,
            misses: 0,
        };
        this.defaultTTL = defaultTTL;
        this.startTime = Date.now();
    }

    /**
     * Get a value from cache
     */
    get<T>(key: string): SyncOrAsync<T | null> {
        this.stats.totalRequests++;
        const internalId = this.store.keyToInternal.get(key);

        if (internalId === undefined) {
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }

        const entry = this.store.data.get(internalId);

        if (!entry || isExpired(entry)) {
            this.stats.misses++;
            this.updateHitRate();
            // Clean up expired entry
            if (entry?.expiresAt && entry.expiresAt < Date.now()) {
                this.deleteSync(key);
            }
            return null;
        }

        this.stats.hits++;
        entry.hits++;
        this.updateHitRate();
        return entry.value as T;
    }

    /**
     * Set a value in cache
     */
    set<T>(key: string, value: T, ttl?: number): SyncOrAsync<void> {
        const internalId = getInternalId(this.store, key);
        const now = Date.now();
        const effectiveTTL = ttl ?? this.defaultTTL;

        const entry: CacheEntry<T> = {
            key,
            internalId,
            value,
            createdAt: now,
            expiresAt: effectiveTTL ? now + effectiveTTL : undefined,
            hits: 0,
            metadata: undefined,
        };

        const oldEntry = this.store.data.get(internalId);
        if (oldEntry) {
            this.stats.memoryUsage -= estimateMemoryUsage(oldEntry.value);
        }

        this.store.data.set(internalId, entry);
        this.stats.memoryUsage += estimateMemoryUsage(value);
        this.stats.totalEntries = this.store.data.size;
    }

    /**
     * Delete a value from cache
     */
    delete(key: string): SyncOrAsync<boolean> {
        return this.deleteSync(key);
    }

    /**
     * Synchronous delete implementation
     */
    protected deleteSync(key: string): boolean {
        const internalId = this.store.keyToInternal.get(key);
        if (internalId === undefined) {
            return false;
        }

        const entry = this.store.data.get(internalId);
        if (entry) {
            this.stats.memoryUsage -= estimateMemoryUsage(entry.value);
        }

        this.store.data.delete(internalId);
        this.store.keyToInternal.delete(key);
        // Keep internalToKey array intact to avoid reindexing
        this.stats.totalEntries = this.store.data.size;
        return true;
    }

    /**
     * Clear all cache entries
     */
    clear(): SyncOrAsync<void> {
        return this.clearSync();
    }

    /**
     * Synchronous clear implementation
     */
    protected clearSync(): void {
        this.store.data.clear();
        this.store.keyToInternal.clear();
        this.store.internalToKey = [];
        this.stats.totalEntries = 0;
        this.stats.memoryUsage = 0;
    }

    /**
     * Check if a key exists in cache
     */
    has(key: string): SyncOrAsync<boolean> {
        const internalId = this.store.keyToInternal.get(key);
        if (internalId === undefined) {
            return false;
        }
        const entry = this.store.data.get(internalId);
        return entry !== undefined && !isExpired(entry);
    }

    /**
     * Get all cache keys
     */
    keys(): SyncOrAsync<string[]> {
        const validKeys: string[] = [];

        for (const [key, internalId] of this.store.keyToInternal) {
            const entry = this.store.data.get(internalId);
            if (entry && !isExpired(entry)) {
                validKeys.push(key);
            }
        }

        return validKeys;
    }

    /**
     * Get cache statistics
     */
    getStats(): SyncOrAsync<CacheStats> {
        return { ...this.stats };
    }

    /**
     * Update hit rate
     */
    protected updateHitRate(): void {
        if (this.stats.totalRequests === 0) {
            this.stats.hitRate = 0;
        } else {
            this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
        }
    }

    /**
     * Clean up expired entries
     */
    cleanupExpired(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, internalId] of this.store.keyToInternal) {
            const entry = this.store.data.get(internalId);
            if (entry && entry.expiresAt && entry.expiresAt < now) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.deleteSync(key);
        }
    }
}

/**
 * Resolve sync or async store operation
 * Helper for working with unified interface
 */
export async function resolveStoreOperation<T>(
    operation: SyncOrAsync<T>
): Promise<T> {
    return await resolveValue(operation);
}
