/**
 * Result Pruner for Agent execution results
 * 参考 Stagehand AgentCache 的结果剪枝功能
 * 移除大体积数据（如截图 base64）以减少缓存大小
 */

import type { CachedAgentExecution } from './AgentCache.js';

/**
 * Pruning options
 */
export interface PruneOptions {
    /** Remove screenshot base64 data */
    removeScreenshots?: boolean;
    /** Remove all base64 data */
    removeBase64?: boolean;
    /** Maximum text length (0 = no limit) */
    maxTextLength?: number;
    /** Truncation marker */
    truncationMarker?: string;
}

/**
 * Result Pruner
 */
export class ResultPruner {
    private defaultOptions: PruneOptions = {
        removeScreenshots: true,
        removeBase64: false,
        maxTextLength: 0,
        truncationMarker: '...[truncated]',
    };

    /**
     * Prune a cached execution
     */
    prune(execution: CachedAgentExecution, options?: PruneOptions): CachedAgentExecution {
        const opts = { ...this.defaultOptions, ...options };

        // Deep clone to avoid mutating original
        const pruned: CachedAgentExecution = JSON.parse(JSON.stringify(execution));

        // Prune steps
        for (const step of pruned.steps) {
            this.pruneStep(step, opts);
        }

        // Prune result
        if (pruned.result) {
            this.pruneResult(pruned.result, opts);
        }

        return pruned;
    }

    /**
     * Prune a single step
     */
    private pruneStep(step: any, options: PruneOptions): void {
        if (!step) return;

        // Remove screenshots
        if (options.removeScreenshots || options.removeBase64) {
            this.removeBase64(step);
        }

        // Truncate text
        if (options.maxTextLength && options.maxTextLength > 0) {
            this.truncateText(step, options.maxTextLength, options.truncationMarker);
        }
    }

    /**
     * Prune result object
     */
    private pruneResult(result: any, options: PruneOptions): void {
        if (!result) return;

        // Remove screenshots from actions
        if (result.actions && Array.isArray(result.actions)) {
            for (const action of result.actions) {
                this.pruneStep(action, options);
            }
        }

        // Remove base64 from result
        if (options.removeScreenshots || options.removeBase64) {
            this.removeBase64(result);
        }

        // Truncate text
        if (options.maxTextLength && options.maxTextLength > 0) {
            this.truncateText(result, options.maxTextLength, options.truncationMarker);
        }
    }

    /**
     * Remove base64 data from an object
     */
    private removeBase64(obj: any): void {
        if (!obj || typeof obj !== 'object') return;

        // Handle base64 fields
        if (obj.base64 && typeof obj.base64 === 'string') {
            obj.base64 = '[removed]';
            obj.data = '[removed]';
            delete obj.buffer;
        }

        // Handle screenshot fields
        if (obj.screenshot && typeof obj.screenshot === 'string') {
            obj.screenshot = '[removed]';
        }

        // Handle imageData fields
        if (obj.imageData && typeof obj.imageData === 'string') {
            obj.imageData = '[removed]';
        }

        // Recursively process nested objects
        for (const key of Object.keys(obj)) {
            if (obj[key] && typeof obj[key] === 'object') {
                this.removeBase64(obj[key]);
            }
        }
    }

    /**
     * Truncate text fields
     */
    private truncateText(obj: any, maxLength: number, marker?: string): void {
        if (!obj || typeof obj !== 'object') return;

        // Handle common text fields
        const textFields = ['text', 'content', 'message', 'error', 'output', 'reasoning'];

        for (const field of textFields) {
            if (obj[field] && typeof obj[field] === 'string') {
                const text = obj[field];
                if (text.length > maxLength) {
                    obj[field] = text.substring(0, maxLength) + (marker || '');
                }
            }
        }

        // Recursively process nested objects
        for (const key of Object.keys(obj)) {
            if (obj[key] && typeof obj[key] === 'object') {
                this.truncateText(obj[key], maxLength, marker);
            }
        }
    }

    /**
     * Restore pruned data (placeholder for future implementation)
     * Currently just returns the original execution
     */
    restore(execution: CachedAgentExecution): CachedAgentExecution {
        // For now, we can't restore removed data
        // In the future, this could fetch original data from a separate store
        return execution;
    }

    /**
     * Estimate size reduction
     */
    estimateSizeReduction(execution: CachedAgentExecution, options?: PruneOptions): {
        before: number;
        after: number;
        reduction: number;
        percentage: number;
    } {
        const before = JSON.stringify(execution).length;
        const pruned = this.prune(execution, options);
        const after = JSON.stringify(pruned).length;

        return {
            before,
            after,
            reduction: before - after,
            percentage: ((before - after) / before) * 100,
        };
    }
}

/**
 * Default result pruner instance
 */
export const defaultPruner = new ResultPruner();
