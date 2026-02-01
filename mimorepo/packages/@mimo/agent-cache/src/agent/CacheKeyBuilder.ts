/**
 * Cache Key Builder for Agent executions
 * 参考 Stagehand AgentCache 的 SHA256 缓存键生成
 */

import { createHash } from 'node:crypto';

/**
 * Agent execution options
 */
export interface AgentExecutionOptions {
    instruction: string;
    startUrl?: string;
    model: string;
    tools: string[];
}

/**
 * Configuration for cache key building
 */
export interface CacheKeyConfig {
    instruction: string;
    startUrl?: string;
    model: string;
    tools: string[];
    configSignature?: string;
}

/**
 * Cache Key Builder
 */
export class CacheKeyBuilder {
    /**
     * Build a cache key from execution options
     * Uses SHA256 hash (参考 Stagehand)
     */
    build(options: CacheKeyConfig): string {
        const normalized = this.normalize(options);
        const hash = createHash('sha256').update(normalized).digest('hex');
        return `agent:${hash}`;
    }

    /**
     * Build a configuration signature
     */
    buildConfigSignature(config: {
        model: string;
        tools: string[];
        [key: string]: any;
    }): string {
        const normalized = this.normalize(config);
        const hash = createHash('sha256').update(normalized).digest('hex');
        return hash;
    }

    /**
     * Normalize input to a stable string representation
     */
    private normalize(input: any): string {
        if (input === null || input === undefined) {
            return '';
        }

        if (typeof input === 'string') {
            return input.trim().toLowerCase();
        }

        if (typeof input === 'number' || typeof input === 'boolean') {
            return String(input);
        }

        if (Array.isArray(input)) {
            // Sort arrays for stable ordering
            const sorted = input.map(item => this.normalize(item)).sort();
            return JSON.stringify(sorted);
        }

        if (typeof input === 'object') {
            // Sort object keys for stable ordering
            const sortedKeys = Object.keys(input).sort();
            const sortedObj: Record<string, any> = {};
            for (const key of sortedKeys) {
                sortedObj[key] = this.normalize(input[key]);
            }
            return JSON.stringify(sortedObj);
        }

        return String(input);
    }

    /**
     * Build key from instruction and options (convenience method)
     */
    buildFromInstruction(
        instruction: string,
        options: AgentExecutionOptions
    ): string {
        return this.build({
            instruction,
            startUrl: options.startUrl,
            model: options.model,
            tools: options.tools,
        });
    }

    /**
     * Validate if a cache key is valid format
     */
    isValidKey(key: string): boolean {
        return key.startsWith('agent:') && key.length === 'agent:'.length + 64;
    }
}

/**
 * Default cache key builder instance
 */
export const defaultKeyBuilder = new CacheKeyBuilder();
