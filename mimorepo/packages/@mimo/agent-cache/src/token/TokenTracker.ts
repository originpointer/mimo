/**
 * Token Tracker for tracking LLM usage and costs
 * 参考 Browser-Use 的 Token 追踪服务
 */

import type { ICacheStore } from '../core/types.js';
import type { TokenUsage, LLMProvider } from '@mimo/agent-core';
import type { TokenCostRecord, PricingStats } from './PricingManager.js';
import type { TrackContext } from '../core/hooks.js';
import { PricingManager } from './PricingManager.js';
import { MemoryStore } from '../storage/MemoryStore.js';
import { runHook } from '../core/hooks.js';

/**
 * Token tracking options
 */
export interface TokenTrackerOptions {
    /** Cache store for records */
    store?: ICacheStore;
    /** Pricing manager */
    pricing?: PricingManager;
    /** Namespace for cache keys */
    namespace?: string;
    /** Hooks */
    hooks?: {
        beforeTrack?: (context: TrackContext) => void | Promise<void>;
        afterTrack?: (context: TrackContext, record: TokenCostRecord) => void | Promise<void>;
    };
}

/**
 * Cost filter for querying records
 */
export interface CostFilter {
    /** Start timestamp */
    start?: number;
    /** End timestamp */
    end?: number;
    /** Model filter */
    model?: string;
    /** Provider filter */
    provider?: LLMProvider;
    /** Agent ID filter */
    agentId?: string;
    /** Session ID filter */
    sessionId?: string;
}

/**
 * Token usage record with context
 */
export interface TokenUsageRecord extends TokenCostRecord {
    agentId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
}

/**
 * Token Tracker
 */
export class TokenTracker {
    readonly store: ICacheStore;
    readonly pricing: PricingManager;
    readonly namespace: string;
    private hooks: TokenTrackerOptions['hooks'];

    constructor(options: TokenTrackerOptions = {}) {
        this.store = options.store ?? new MemoryStore();
        this.pricing = options.pricing ?? new PricingManager();
        this.namespace = options.namespace ?? 'token';
        this.hooks = options.hooks;
    }

    /**
     * Track token usage
     */
    async track(
        model: string,
        usage: TokenUsage,
        options?: {
            agentId?: string;
            sessionId?: string;
            metadata?: Record<string, any>;
        }
    ): Promise<TokenCostRecord> {
        const context: TrackContext = {
            model,
            agentId: options?.agentId,
            sessionId: options?.sessionId,
            metadata: options?.metadata,
        };

        // Run beforeTrack hook
        if (this.hooks?.beforeTrack) {
            await runHook([this.hooks.beforeTrack], context);
        }

        // Calculate cost
        const record = this.pricing.calculateCost(model, {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            cachedReadTokens: usage.cachedReadTokens,
            cachedCreationTokens: usage.cachedCreationTokens,
        });

        // Add context to record
        const fullRecord: TokenUsageRecord = {
            ...record,
            agentId: options?.agentId,
            sessionId: options?.sessionId,
            metadata: options?.metadata,
        };

        // Save to store
        const key = this.buildRecordKey(record.id, context);
        await this.store.set(key, fullRecord);

        // Update stats
        await this.updateStats(fullRecord);

        // Run afterTrack hook
        if (this.hooks?.afterTrack) {
            await runHook([this.hooks.afterTrack], context, record);
        }

        return record;
    }

    /**
     * Track multiple records
     */
    async trackMultiple(
        records: Array<{
            model: string;
            usage: TokenUsage;
            agentId?: string;
            sessionId?: string;
            metadata?: Record<string, any>;
        }>
    ): Promise<TokenCostRecord[]> {
        const results: TokenCostRecord[] = [];

        for (const record of records) {
            const result = await this.track(record.model, record.usage, {
                agentId: record.agentId,
                sessionId: record.sessionId,
                metadata: record.metadata,
            });
            results.push(result);
        }

        return results;
    }

    /**
     * Get total cost
     */
    async getTotalCost(filter?: CostFilter): Promise<number> {
        const records = await this.getRecords(filter);
        return records.reduce((sum, r) => sum + r.costs.totalCost, 0);
    }

    /**
     * Get token usage records
     */
    async getRecords(filter?: CostFilter): Promise<TokenUsageRecord[]> {
        const allKeys = await this.store.keys();
        const filteredKeys = allKeys.filter(key => key.startsWith(this.namespace));
        const records: TokenUsageRecord[] = [];

        for (const key of filteredKeys) {
            const record = await this.store.get<TokenUsageRecord>(key);
            if (record && this.matchesFilter(record, filter)) {
                records.push(record);
            }
        }

        // Sort by timestamp descending
        records.sort((a, b) => b.timestamp - a.timestamp);

        return records;
    }

    /**
     * Get statistics
     */
    async getStats(filter?: CostFilter): Promise<PricingStats> {
        const records = await this.getRecords(filter);

        const stats: PricingStats = {
            totalCost: 0,
            totalTokens: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCachedReadTokens: 0,
            totalCachedCreationTokens: 0,
            totalReasoningTokens: 0,
            recordCount: records.length,
        };

        for (const record of records) {
            stats.totalCost += record.costs.totalCost;
            stats.totalTokens += record.usage.totalTokens;
            stats.totalInputTokens += record.usage.promptTokens;
            stats.totalOutputTokens += record.usage.completionTokens;
            stats.totalCachedReadTokens += record.usage.cachedReadTokens ?? 0;
            stats.totalCachedCreationTokens += record.usage.cachedCreationTokens ?? 0;
            stats.totalReasoningTokens += record.usage.reasoningTokens ?? 0;
        }

        return stats;
    }

    /**
     * Generate statistics report
     */
    async getStatsReport(filter?: CostFilter): Promise<{
        stats: PricingStats;
        byModel: Record<string, PricingStats>;
        byProvider: Record<string, PricingStats>;
    }> {
        const records = await this.getRecords(filter);

        const byModel: Record<string, PricingStats> = {};
        const byProvider: Record<string, PricingStats> = {};

        for (const record of records) {
            // Group by model
            if (!byModel[record.model]) {
                byModel[record.model] = {
                    totalCost: 0,
                    totalTokens: 0,
                    totalInputTokens: 0,
                    totalOutputTokens: 0,
                    totalCachedReadTokens: 0,
                    totalCachedCreationTokens: 0,
                    totalReasoningTokens: 0,
                    recordCount: 0,
                };
            }
            const modelStats = byModel[record.model]!;
            modelStats.totalCost += record.costs.totalCost;
            modelStats.totalTokens += record.usage.totalTokens;
            modelStats.totalInputTokens += record.usage.promptTokens;
            modelStats.totalOutputTokens += record.usage.completionTokens;
            modelStats.totalCachedReadTokens += record.usage.cachedReadTokens ?? 0;
            modelStats.totalCachedCreationTokens += record.usage.cachedCreationTokens ?? 0;
            modelStats.totalReasoningTokens += record.usage.reasoningTokens ?? 0;
            modelStats.recordCount++;

            // Group by provider
            if (!byProvider[record.provider]) {
                byProvider[record.provider] = {
                    totalCost: 0,
                    totalTokens: 0,
                    totalInputTokens: 0,
                    totalOutputTokens: 0,
                    totalCachedReadTokens: 0,
                    totalCachedCreationTokens: 0,
                    totalReasoningTokens: 0,
                    recordCount: 0,
                };
            }
            const providerStats = byProvider[record.provider]!;
            providerStats.totalCost += record.costs.totalCost;
            providerStats.totalTokens += record.usage.totalTokens;
            providerStats.totalInputTokens += record.usage.promptTokens;
            providerStats.totalOutputTokens += record.usage.completionTokens;
            providerStats.totalCachedReadTokens += record.usage.cachedReadTokens ?? 0;
            providerStats.totalCachedCreationTokens += record.usage.cachedCreationTokens ?? 0;
            providerStats.totalReasoningTokens += record.usage.reasoningTokens ?? 0;
            providerStats.recordCount++;
        }

        const stats = await this.getStats(filter);

        return {
            stats,
            byModel,
            byProvider,
        };
    }

    /**
     * Clear all records
     */
    async clear(): Promise<void> {
        const allKeys = await this.store.keys();
        const filteredKeys = allKeys.filter(key => key.startsWith(this.namespace));

        for (const key of filteredKeys) {
            await this.store.delete(key);
        }
    }

    /**
     * Build cache key for a record
     */
    private buildRecordKey(id: string, context: TrackContext): string {
        const parts = [this.namespace, id];
        if (context.agentId) {
            parts.push(context.agentId);
        }
        if (context.sessionId) {
            parts.push(context.sessionId);
        }
        return parts.join(':');
    }

    /**
     * Update aggregate stats
     */
    private async updateStats(record: TokenUsageRecord): Promise<void> {
        const statsKey = `${this.namespace}:stats`;
        const existing = await this.store.get<PricingStats>(statsKey);

        const updated: PricingStats = {
            totalCost: (existing?.totalCost ?? 0) + record.costs.totalCost,
            totalTokens: (existing?.totalTokens ?? 0) + record.usage.totalTokens,
            totalInputTokens: (existing?.totalInputTokens ?? 0) + record.usage.promptTokens,
            totalOutputTokens: (existing?.totalOutputTokens ?? 0) + record.usage.completionTokens,
            totalCachedReadTokens: (existing?.totalCachedReadTokens ?? 0) + (record.usage.cachedReadTokens ?? 0),
            totalCachedCreationTokens: (existing?.totalCachedCreationTokens ?? 0) + (record.usage.cachedCreationTokens ?? 0),
            totalReasoningTokens: (existing?.totalReasoningTokens ?? 0) + (record.usage.reasoningTokens ?? 0),
            recordCount: (existing?.recordCount ?? 0) + 1,
        };

        await this.store.set(statsKey, updated);
    }

    /**
     * Check if record matches filter
     */
    private matchesFilter(record: TokenUsageRecord, filter?: CostFilter): boolean {
        if (!filter) {
            return true;
        }

        if (filter.start && record.timestamp < filter.start) {
            return false;
        }

        if (filter.end && record.timestamp > filter.end) {
            return false;
        }

        if (filter.model && record.model !== filter.model) {
            return false;
        }

        if (filter.provider && record.provider !== filter.provider) {
            return false;
        }

        if (filter.agentId && record.agentId !== filter.agentId) {
            return false;
        }

        if (filter.sessionId && record.sessionId !== filter.sessionId) {
            return false;
        }

        return true;
    }
}
