/**
 * File system-based cache store implementation
 * Asynchronous file-based cache using node:fs/promises
 */

import type {
    ICacheStore,
    CacheStoreType,
    CacheStats,
    CacheEntry,
} from '../core/types.js';
import { isExpired } from '../core/CacheStore.js';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * File system store options
 */
export interface FileSystemStoreOptions {
    /** Root directory for cache files */
    rootDir: string;
    /** Default TTL in milliseconds */
    defaultTTL?: number;
    /** Subdirectory for cache files */
    subdir?: string;
}

/**
 * In-memory index for file system store
 */
interface FSIndex {
    keyToPath: Map<string, string>;
    metadata: Map<string, {
        createdAt: number;
        expiresAt?: number;
        size: number;
        hits: number;
    }>;
}

/**
 * File system-based cache store
 * All operations are asynchronous
 */
export class FileSystemStore implements ICacheStore {
    readonly type: CacheStoreType = 'filesystem';
    private cacheDir: string;
    private index: FSIndex;
    private stats: CacheStats;
    private defaultTTL?: number;
    private initialized: boolean = false;

    constructor(options: FileSystemStoreOptions) {
        this.cacheDir = join(options.rootDir, options.subdir || 'cache');
        this.defaultTTL = options.defaultTTL;
        this.index = {
            keyToPath: new Map(),
            metadata: new Map(),
        };
        this.stats = {
            totalEntries: 0,
            memoryUsage: 0,
            hitRate: 0,
            totalRequests: 0,
            hits: 0,
            misses: 0,
        };
    }

    /**
     * Initialize the store
     */
    private async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Create cache directory if it doesn't exist
        if (!existsSync(this.cacheDir)) {
            await fs.mkdir(this.cacheDir, { recursive: true });
        }

        // Load index from disk
        await this.loadIndex();

        this.initialized = true;
    }

    /**
     * Load index from disk
     */
    private async loadIndex(): Promise<void> {
        const indexPath = join(this.cacheDir, '.index.json');
        try {
            if (existsSync(indexPath)) {
                const data = await fs.readFile(indexPath, 'utf-8');
                const saved = JSON.parse(data);

                if (saved.keyToPath) {
                    this.index.keyToPath = new Map(Object.entries(saved.keyToPath));
                }
                if (saved.metadata) {
                    this.index.metadata = new Map(Object.entries(saved.metadata));
                }

                // Cleanup expired entries
                await this.cleanupExpired();

                this.stats.totalEntries = this.index.metadata.size;
            }
        } catch {
            // Start fresh if index load fails
            this.index.keyToPath.clear();
            this.index.metadata.clear();
        }
    }

    /**
     * Save index to disk
     */
    private async saveIndex(): Promise<void> {
        const indexPath = join(this.cacheDir, '.index.json');
        const data = {
            keyToPath: Object.fromEntries(this.index.keyToPath),
            metadata: Object.fromEntries(this.index.metadata),
        };
        await fs.writeFile(indexPath, JSON.stringify(data, null, 2));
    }

    /**
     * Get file path for a key
     */
    private getFilePath(key: string): string {
        let path = this.index.keyToPath.get(key);
        if (!path) {
            // Use hash of key as filename
            const hash = this.hashKey(key);
            path = join(this.cacheDir, `${hash}.json`);
            this.index.keyToPath.set(key, path);
        }
        return path;
    }

    /**
     * Hash a key to a safe filename
     */
    private hashKey(key: string): string {
        // Simple hash function - in production use crypto.createHash
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get a value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        await this.init();
        this.stats.totalRequests++;

        const metadata = this.index.metadata.get(key);
        if (!metadata) {
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }

        // Check expiration
        if (metadata.expiresAt && metadata.expiresAt < Date.now()) {
            await this.delete(key);
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }

        const filePath = this.getFilePath(key);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const entry = JSON.parse(data) as CacheEntry<T>;

            if (isExpired(entry)) {
                await this.delete(key);
                this.stats.misses++;
                this.updateHitRate();
                return null;
            }

            this.stats.hits++;
            metadata.hits++;
            this.updateHitRate();
            return entry.value;
        } catch {
            this.stats.misses++;
            this.updateHitRate();
            return null;
        }
    }

    /**
     * Set a value in cache
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        await this.init();

        const now = Date.now();
        const effectiveTTL = ttl ?? this.defaultTTL;
        const filePath = this.getFilePath(key);

        const entry: CacheEntry<T> = {
            key,
            internalId: 0, // Not used in FS store
            value,
            createdAt: now,
            expiresAt: effectiveTTL ? now + effectiveTTL : undefined,
            hits: 0,
        };

        const data = JSON.stringify(entry);
        const size = data.length;

        // Create directory if needed
        await fs.mkdir(dirname(filePath), { recursive: true });

        // Write to file
        await fs.writeFile(filePath, data, 'utf-8');

        // Update metadata
        const oldSize = this.index.metadata.get(key)?.size ?? 0;
        this.index.metadata.set(key, {
            createdAt: now,
            expiresAt: entry.expiresAt,
            size,
            hits: 0,
        });

        this.stats.memoryUsage += size - oldSize;
        this.stats.totalEntries = this.index.metadata.size;

        // Save index
        await this.saveIndex();
    }

    /**
     * Delete a value from cache
     */
    async delete(key: string): Promise<boolean> {
        await this.init();

        const metadata = this.index.metadata.get(key);
        if (!metadata) {
            return false;
        }

        const filePath = this.getFilePath(key);
        try {
            await fs.unlink(filePath);
        } catch {
            // File might not exist
        }

        this.index.keyToPath.delete(key);
        this.index.metadata.delete(key);
        this.stats.memoryUsage -= metadata.size;
        this.stats.totalEntries = this.index.metadata.size;

        await this.saveIndex();
        return true;
    }

    /**
     * Clear all cache entries
     */
    async clear(): Promise<void> {
        await this.init();

        // Delete all cache files
        for (const filePath of this.index.keyToPath.values()) {
            try {
                await fs.unlink(filePath);
            } catch {
                // Ignore errors
            }
        }

        this.index.keyToPath.clear();
        this.index.metadata.clear();
        this.stats.totalEntries = 0;
        this.stats.memoryUsage = 0;

        await this.saveIndex();
    }

    /**
     * Check if a key exists in cache
     */
    async has(key: string): Promise<boolean> {
        await this.init();

        const metadata = this.index.metadata.get(key);
        if (!metadata) {
            return false;
        }

        if (metadata.expiresAt && metadata.expiresAt < Date.now()) {
            await this.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Get all cache keys
     */
    async keys(): Promise<string[]> {
        await this.init();

        const now = Date.now();
        const validKeys: string[] = [];

        for (const [key, metadata] of this.index.metadata) {
            if (!metadata.expiresAt || metadata.expiresAt > now) {
                validKeys.push(key);
            }
        }

        return validKeys;
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        await this.init();
        return { ...this.stats };
    }

    /**
     * Update hit rate
     */
    private updateHitRate(): void {
        if (this.stats.totalRequests === 0) {
            this.stats.hitRate = 0;
        } else {
            this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
        }
    }

    /**
     * Clean up expired entries
     */
    private async cleanupExpired(): Promise<void> {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, metadata] of this.index.metadata) {
            if (metadata.expiresAt && metadata.expiresAt < now) {
                expiredKeys.push(key);
            }
        }

        await Promise.all(expiredKeys.map(key => this.delete(key)));
    }

    /**
     * Save store state for serialization
     */
    async save(): Promise<unknown> {
        await this.init();
        return {
            version: 1,
            cacheDir: this.cacheDir,
            stats: this.stats,
        };
    }

    /**
     * Load store state from serialized data
     */
    async load(raw: unknown): Promise<void> {
        if (!raw || typeof raw !== 'object') {
            return;
        }

        const data = raw as {
            version?: number;
            cacheDir?: string;
            stats?: CacheStats;
        };

        if (data.version !== 1) {
            return;
        }

        if (data.cacheDir) {
            this.cacheDir = data.cacheDir;
        }

        await this.loadIndex();

        if (data.stats) {
            this.stats = { ...data.stats };
        }
    }
}

/**
 * Create a file system store with default options
 */
export function createFileSystemStore(options: FileSystemStoreOptions): FileSystemStore {
    return new FileSystemStore(options);
}
