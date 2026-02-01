import { describe, it, expect } from 'vitest';
import { describeWithAIGateway, createLLMClient, testModels } from '../fixtures/llm';
import { createCacheNamespace, createTempDir, sleep } from '../fixtures/cache';
import { toAgentCoreTokenUsage, registerGatewayModelPricing } from '../fixtures/token';

import { PricingManager, TokenTracker } from '@mimo/agent-cache';
import { FileSystemStore } from '@mimo/agent-cache/storage';

describeWithAIGateway('Stage04 Cache Token (real LLM)', () => {
  describe('TokenTracker + PricingManager', () => {
    it('tracks a real LLM call and persists the record', async () => {
      const tmp = await createTempDir('mimo-cache-token-');
      try {
        const modelId = testModels.claude; // anthropic/claude-3-5-haiku
        const pricing = new PricingManager();
        registerGatewayModelPricing(pricing, modelId, 'claude-3-5-haiku-20241022');

        const store = new FileSystemStore({ rootDir: tmp.dir, subdir: 'token' });
        const namespace = createCacheNamespace('token-tracker');

        const tracker = new TokenTracker({ store, pricing, namespace });
        const client = createLLMClient(modelId);

        const response = await client.chatCompletion([
          { role: 'user', content: 'Reply with exactly: "Hello token tracker".' },
        ]);

        const usage = toAgentCoreTokenUsage(response.usage);
        const record = await tracker.track(modelId, usage, {
          agentId: 'agent-1',
          sessionId: 'session-1',
          metadata: { scenario: 'single-call' },
        });

        expect(record.model).toBe(modelId);
        expect(record.costs.totalCost).toBeGreaterThan(0);
        expect(record.usage.totalTokens).toBeGreaterThan(0);

        const records = await tracker.getRecords({ model: modelId, sessionId: 'session-1' });
        expect(records.length).toBeGreaterThanOrEqual(1);
        expect(records[0]?.model).toBe(modelId);

        // Re-create tracker to verify persistence
        const tracker2 = new TokenTracker({ store, pricing, namespace });
        const records2 = await tracker2.getRecords({ model: modelId, sessionId: 'session-1' });
        expect(records2.length).toBeGreaterThanOrEqual(1);
      } finally {
        await tmp.cleanup();
      }
    });

    it('aggregates totalCost by session and builds stats report', async () => {
      const tmp = await createTempDir('mimo-cache-token-');
      try {
        const modelId = testModels.gpt4o; // openai/gpt-4o-mini
        const pricing = new PricingManager();
        registerGatewayModelPricing(pricing, modelId, 'gpt-4o-mini');

        const store = new FileSystemStore({ rootDir: tmp.dir, subdir: 'token' });
        const namespace = createCacheNamespace('token-aggregate');
        const tracker = new TokenTracker({ store, pricing, namespace });

        const client = createLLMClient(modelId);
        for (let i = 0; i < 2; i++) {
          const response = await client.chatCompletion([
            { role: 'user', content: `Say "OK" (run ${i + 1}).` },
          ]);
          await tracker.track(modelId, toAgentCoreTokenUsage(response.usage), {
            agentId: 'agent-2',
            sessionId: 'session-agg',
          });
          await sleep(20);
        }

        const records = await tracker.getRecords({ model: modelId, sessionId: 'session-agg' });
        expect(records).toHaveLength(2);

        const totalCost = await tracker.getTotalCost({ model: modelId, sessionId: 'session-agg' });
        const sum = records.reduce((acc, r) => acc + r.costs.totalCost, 0);
        expect(totalCost).toBeCloseTo(sum, 10);

        const report = await tracker.getStatsReport({ model: modelId });
        expect(report.stats.recordCount).toBe(2);
        expect(report.byModel[modelId]).toBeDefined();
        expect(Object.keys(report.byProvider).length).toBeGreaterThanOrEqual(1);
      } finally {
        await tmp.cleanup();
      }
    });

    it('supports time-window filtering', async () => {
      const tmp = await createTempDir('mimo-cache-token-');
      try {
        const modelId = testModels.gpt4o; // openai/gpt-4o-mini
        const pricing = new PricingManager();
        registerGatewayModelPricing(pricing, modelId, 'gpt-4o-mini');

        const store = new FileSystemStore({ rootDir: tmp.dir, subdir: 'token' });
        const namespace = createCacheNamespace('token-window');
        const tracker = new TokenTracker({ store, pricing, namespace });
        const client = createLLMClient(modelId);

        const r1 = await client.chatCompletion([{ role: 'user', content: 'Say "ONE".' }]);
        const rec1 = await tracker.track(modelId, toAgentCoreTokenUsage(r1.usage), {
          agentId: 'agent-3',
          sessionId: 'session-window',
        });

        await sleep(25);

        const r2 = await client.chatCompletion([{ role: 'user', content: 'Say "TWO".' }]);
        const rec2 = await tracker.track(modelId, toAgentCoreTokenUsage(r2.usage), {
          agentId: 'agent-3',
          sessionId: 'session-window',
        });

        const onlySecond = await tracker.getRecords({
          model: modelId,
          sessionId: 'session-window',
          start: rec2.timestamp,
        });
        expect(onlySecond).toHaveLength(1);
        expect(onlySecond[0]?.id).toBe(rec2.id);

        const both = await tracker.getRecords({
          model: modelId,
          sessionId: 'session-window',
          start: rec1.timestamp,
        });
        expect(both).toHaveLength(2);
      } finally {
        await tmp.cleanup();
      }
    });
  });
});

