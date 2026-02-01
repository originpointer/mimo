/**
 * Core types for the cache optimization layer
 *借鉴 Orama 的类型系统设计
 */

/**
 * Synchronous or async value type (借鉴 Orama)
 */
export type SyncOrAsync<T = void> = T | PromiseLike<T>;

/**
 * Cache entry
 */
export interface CacheEntry<T = any> {
    /** Cache key (original string key) */
    key: string;
    /** Internal numeric key (for performance optimization) */
    internalId: number;
    /** Cached value */
    value: T;
    /** Creation timestamp */
    createdAt: number;
    /** Expiration timestamp (optional) */
    expiresAt?: number;
    /** Number of cache hits */
    hits: number;
    /** Metadata */
    metadata?: Record<string, any>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    /** Total number of entries */
    totalEntries: number;
    /** Memory usage in bytes (estimated) */
    memoryUsage: number;
    /** Cache hit rate (0-1) */
    hitRate: number;
    /** Total number of requests */
    totalRequests: number;
    /** Number of cache hits */
    hits: number;
    /** Number of cache misses */
    misses: number;
}

/**
 * Internal key store (借鉴 Orama InternalDocumentIDStore)
 * Provides efficient string <-> number mapping for cache keys
 */
export interface InternalKeyStore {
    /** User key -> Internal numeric ID */
    keyToInternal: Map<string, number>;
    /** Internal numeric ID -> User key */
    internalToKey: string[];
    /** Data storage using internal IDs */
    data: Map<number, CacheEntry>;
}

/**
 * Cache store type
 */
export type CacheStoreType = 'memory' | 'filesystem' | 'redis';

/**
 * Base interface for all cache stores
 * 借鉴 Orama 的组件化设计 - 所有核心组件都可替换
 */
export interface ICacheStore {
    /** Store type identifier */
    readonly type: CacheStoreType;

    /**
     * Get a value from cache
     * @param key - Cache key
     * @returns Cached value or null if not found/expired
     */
    get<T>(key: string): SyncOrAsync<T | null>;

    /**
     * Set a value in cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time to live in milliseconds (optional)
     */
    set<T>(key: string, value: T, ttl?: number): SyncOrAsync<void>;

    /**
     * Delete a value from cache
     * @param key - Cache key
     * @returns True if deleted, false if not found
     */
    delete(key: string): SyncOrAsync<boolean>;

    /**
     * Clear all cache entries
     */
    clear(): SyncOrAsync<void>;

    /**
     * Check if a key exists in cache
     * @param key - Cache key
     * @returns True if key exists and not expired
     */
    has(key: string): SyncOrAsync<boolean>;

    /**
     * Get all cache keys
     * @returns Array of cache keys
     */
    keys(): SyncOrAsync<string[]>;

    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    getStats(): SyncOrAsync<CacheStats>;

    /**
     * Save store state for serialization (借鉴 Orama save/load)
     * @returns Serializable store state
     */
    save?(): SyncOrAsync<unknown>;

    /**
     * Load store state from serialized data
     * @param raw - Serialized store state
     */
    load?(raw: unknown): SyncOrAsync<void>;
}

/**
 * Cache options
 */
export interface CacheOptions {
    /** Time to live in milliseconds */
    ttl?: number;
    /** Whether to automatically refresh on access */
    autoRefresh?: boolean;
    /** Custom serialization function */
    serialize?: (value: any) => string;
    /** Custom deserialization function */
    deserialize?: (data: string) => any;
}

/**
 * Re-export types from agent-core for convenience
 */
export type { TokenUsage, LLMProvider } from '@mimo/agent-core';
