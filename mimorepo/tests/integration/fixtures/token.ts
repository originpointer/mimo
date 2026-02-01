import type { TokenUsage } from '@mimo/agent-core';
import type { PricingManager } from '@mimo/agent-cache';

export function toAgentCoreTokenUsage(llmUsage: {
  inputTokens: number;
  outputTokens: number;
  cachedReadTokens?: number;
  cachedCreationTokens?: number;
  reasoningTokens?: number;
}): TokenUsage {
  const promptTokens = llmUsage.inputTokens ?? 0;
  const completionTokens = llmUsage.outputTokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    cachedReadTokens: llmUsage.cachedReadTokens,
    cachedCreationTokens: llmUsage.cachedCreationTokens,
    reasoningTokens: llmUsage.reasoningTokens,
  };
}

/**
 * PricingManager 内置的是“裸模型名”（如 gpt-4o-mini / claude-3-5-haiku-20241022）。
 * 但 integration tests 使用的是 AI Gateway 形式（如 openai/gpt-4o-mini）。
 * 为了让成本计算更贴近真实，测试里会把 gateway modelId 显式注册到 PricingManager。
 */
export function registerGatewayModelPricing(
  pricing: PricingManager,
  gatewayModelId: string,
  baseModel: string
): void {
  const modelPricing = pricing.getPricing(baseModel);
  pricing.registerPricing(gatewayModelId, modelPricing);
}

