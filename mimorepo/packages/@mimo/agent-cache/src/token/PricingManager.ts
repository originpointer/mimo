/**
 * Pricing Manager for Token cost calculation
 * 参考 Browser-Use 的定价管理系统
 */

import { LLMProvider } from '@mimo/agent-core';

/**
 * Model pricing information
 */
export interface ModelPricing {
    /** Provider name */
    provider: LLMProvider;
    /** Input cost per token (USD) */
    inputCostPerToken: number;
    /** Output cost per token (USD) */
    outputCostPerToken: number;
    /** Cache read cost per token (Anthropic) */
    cacheReadCostPerToken?: number;
    /** Cache write cost per token (Anthropic) */
    cacheWriteCostPerToken?: number;
    /** Reasoning cost per token (OpenAI o1/o3) */
    reasoningCostPerToken?: number;
    /** Maximum context window */
    maxContext: number;
    /** Supports prompt caching */
    supportsCaching: boolean;
}

/**
 * Token cost record
 */
export interface TokenCostRecord {
    id: string;
    timestamp: number;
    model: string;
    provider: LLMProvider;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        cachedReadTokens?: number;
        cachedCreationTokens?: number;
        reasoningTokens?: number;
    };
    costs: {
        inputCost: number;
        outputCost: number;
        cacheReadCost?: number;
        cacheWriteCost?: number;
        reasoningCost?: number;
        totalCost: number;
    };
}

/**
 * Pricing statistics
 */
export interface PricingStats {
    totalCost: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCachedReadTokens: number;
    totalCachedCreationTokens: number;
    totalReasoningTokens: number;
    recordCount: number;
}

/**
 * Pricing Manager
 */
export class PricingManager {
    private pricing: Map<string, ModelPricing>;

    constructor() {
        this.pricing = new Map();
        this.loadDefaultPricing();
    }

    /**
     * Load default pricing data (2025)
     */
    private loadDefaultPricing(): void {
        // Anthropic Claude 4.5 (Sonnet)
        this.pricing.set('claude-3-5-sonnet-20241022', {
            provider: LLMProvider.ANTHROPIC,
            inputCostPerToken: 0.000003,
            outputCostPerToken: 0.000015,
            cacheReadCostPerToken: 0.0000003,
            cacheWriteCostPerToken: 0.00000375,
            maxContext: 200000,
            supportsCaching: true,
        });

        // Anthropic Claude 4.5 (Sonnet) - alias
        this.pricing.set('claude-sonnet-4-5', {
            provider: LLMProvider.ANTHROPIC,
            inputCostPerToken: 0.000003,
            outputCostPerToken: 0.000015,
            cacheReadCostPerToken: 0.0000003,
            cacheWriteCostPerToken: 0.00000375,
            maxContext: 200000,
            supportsCaching: true,
        });

        // Anthropic Claude 4.5 (Haiku)
        this.pricing.set('claude-3-5-haiku-20241022', {
            provider: LLMProvider.ANTHROPIC,
            inputCostPerToken: 0.0000008,
            outputCostPerToken: 0.000004,
            cacheReadCostPerToken: 0.00000008,
            cacheWriteCostPerToken: 0.000001,
            maxContext: 200000,
            supportsCaching: true,
        });

        // Anthropic Claude 4.5 (Haiku) - alias
        this.pricing.set('claude-haiku-4-5', {
            provider: LLMProvider.ANTHROPIC,
            inputCostPerToken: 0.0000008,
            outputCostPerToken: 0.000004,
            cacheReadCostPerToken: 0.00000008,
            cacheWriteCostPerToken: 0.000001,
            maxContext: 200000,
            supportsCaching: true,
        });

        // OpenAI GPT-4o
        this.pricing.set('gpt-4o', {
            provider: LLMProvider.OPENAI,
            inputCostPerToken: 0.000005,
            outputCostPerToken: 0.000015,
            maxContext: 128000,
            supportsCaching: false,
        });

        // OpenAI GPT-4o-mini
        this.pricing.set('gpt-4o-mini', {
            provider: LLMProvider.OPENAI,
            inputCostPerToken: 0.00000015,
            outputCostPerToken: 0.0000006,
            maxContext: 128000,
            supportsCaching: false,
        });

        // OpenAI o1 (reasoning model)
        this.pricing.set('o1', {
            provider: LLMProvider.OPENAI,
            inputCostPerToken: 0.000015,
            outputCostPerToken: 0.000060,
            reasoningCostPerToken: 0.000015,
            maxContext: 200000,
            supportsCaching: false,
        });

        // OpenAI o1-mini
        this.pricing.set('o1-mini', {
            provider: LLMProvider.OPENAI,
            inputCostPerToken: 0.000003,
            outputCostPerToken: 0.000012,
            reasoningCostPerToken: 0.000003,
            maxContext: 128000,
            supportsCaching: false,
        });

        // Google Gemini 2.0 Flash
        this.pricing.set('gemini-2.0-flash-exp', {
            provider: LLMProvider.GOOGLE,
            inputCostPerToken: 0.000000075,
            outputCostPerToken: 0.0000003,
            maxContext: 1000000,
            supportsCaching: false,
        });

        // Google Gemini 1.5 Pro
        this.pricing.set('gemini-1.5-pro', {
            provider: LLMProvider.GOOGLE,
            inputCostPerToken: 0.00000125,
            outputCostPerToken: 0.000005,
            maxContext: 2000000,
            supportsCaching: false,
        });
    }

    /**
     * Get pricing for a model
     */
    getPricing(model: string): ModelPricing {
        // Try exact match first
        let pricing = this.pricing.get(model);

        // Try partial match
        if (!pricing) {
            for (const [key, value] of this.pricing) {
                if (model.includes(key) || key.includes(model)) {
                    pricing = value;
                    break;
                }
            }
        }

        // Default to Claude Sonnet
        if (!pricing) {
            pricing = this.pricing.get('claude-sonnet-4-5')!;
        }

        return pricing;
    }

    /**
     * Register custom pricing for a model
     */
    registerPricing(model: string, pricing: ModelPricing): void {
        this.pricing.set(model, pricing);
    }

    /**
     * Register multiple pricings
     */
    registerPricingMap(map: Record<string, ModelPricing>): void {
        for (const [model, pricing] of Object.entries(map)) {
            this.pricing.set(model, pricing);
        }
    }

    /**
     * Calculate cost from token usage
     */
    calculateCost(
        model: string,
        usage: {
            promptTokens: number;
            completionTokens: number;
            cachedReadTokens?: number;
            cachedCreationTokens?: number;
            reasoningTokens?: number;
        }
    ): TokenCostRecord {
        const pricing = this.getPricing(model);

        const inputCost = usage.promptTokens * pricing.inputCostPerToken;
        const outputCost = usage.completionTokens * pricing.outputCostPerToken;
        const cacheReadCost = usage.cachedReadTokens
            ? usage.cachedReadTokens * (pricing.cacheReadCostPerToken ?? 0)
            : 0;
        const cacheWriteCost = usage.cachedCreationTokens
            ? usage.cachedCreationTokens * (pricing.cacheWriteCostPerToken ?? 0)
            : 0;
        const reasoningCost = usage.reasoningTokens
            ? usage.reasoningTokens * (pricing.reasoningCostPerToken ?? 0)
            : 0;

        const totalCost = inputCost + outputCost + cacheReadCost + cacheWriteCost + reasoningCost;

        return {
            id: `cost:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`,
            timestamp: Date.now(),
            model,
            provider: pricing.provider,
            usage: {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: usage.promptTokens + usage.completionTokens,
                cachedReadTokens: usage.cachedReadTokens,
                cachedCreationTokens: usage.cachedCreationTokens,
                reasoningTokens: usage.reasoningTokens,
            },
            costs: {
                inputCost,
                outputCost,
                cacheReadCost: cacheReadCost || undefined,
                cacheWriteCost: cacheWriteCost || undefined,
                reasoningCost: reasoningCost || undefined,
                totalCost,
            },
        };
    }

    /**
     * Get all registered models
     */
    getModels(): string[] {
        return Array.from(this.pricing.keys());
    }

    /**
     * Check if model supports caching
     */
    supportsCaching(model: string): boolean {
        const pricing = this.getPricing(model);
        return pricing.supportsCaching;
    }
}
