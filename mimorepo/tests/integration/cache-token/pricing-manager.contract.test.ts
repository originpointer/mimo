import { describe, it, expect } from 'vitest';
import { PricingManager } from '@mimo/agent-cache';
import { registerGatewayModelPricing } from '../fixtures/token';

describe('Stage04 Cache Token (contract)', () => {
  it('calculates cost for an AI Gateway modelId after registration', () => {
    const pricing = new PricingManager();

    const modelId = 'openai/gpt-4o-mini';
    registerGatewayModelPricing(pricing, modelId, 'gpt-4o-mini');

    const record = pricing.calculateCost(modelId, {
      promptTokens: 1000,
      completionTokens: 500,
    });

    // gpt-4o-mini default pricing is extremely cheap but must be > 0
    expect(record.model).toBe(modelId);
    expect(record.costs.totalCost).toBeGreaterThan(0);
    expect(record.usage.totalTokens).toBe(1500);
  });

  it('includes cache read/write token costs for Anthropic pricing when provided', () => {
    const pricing = new PricingManager();
    const modelId = 'anthropic/claude-haiku-4.5';
    registerGatewayModelPricing(pricing, modelId, 'claude-3-5-haiku-20241022');

    const record = pricing.calculateCost(modelId, {
      promptTokens: 1000,
      completionTokens: 500,
      cachedReadTokens: 200,
      cachedCreationTokens: 300,
    });

    expect(record.costs.cacheReadCost).toBeDefined();
    expect(record.costs.cacheWriteCost).toBeDefined();
    expect(record.costs.totalCost).toBeGreaterThan(0);
  });
});

