import { describe, it, expect } from 'vitest';

import { MessageRole } from '@mimo/agent-core';
import { AgentCache, ReplayEngine, type AgentReplayStep, type CachedAgentExecution } from '@mimo/agent-cache';
import { MemoryStore } from '@mimo/agent-cache/storage';

import { createCacheNamespace } from '../fixtures/cache';
import { startTestServer } from '../fixtures/http-server';
import { createNodeTestPage } from '../fixtures/page';
import { createLLMClient, describeWithAIGateway, testModels } from '../fixtures/llm';

async function runOnce(params: {
  cache: AgentCache;
  modelId: string;
  complete: (args: Parameters<ReturnType<typeof createLLMClient>['complete']>[0]) => Promise<any>;
  instruction: string;
  startUrl: string;
  page: ReturnType<typeof createNodeTestPage>;
}): Promise<{
  fromCache: boolean;
  key: string;
  result: Awaited<ReturnType<ReplayEngine['replay']>>;
}> {
  const { cache, modelId, complete, instruction, startUrl, page } = params;

  const options = {
    instruction,
    startUrl,
    model: modelId,
    tools: ['goto', 'type', 'click', 'evaluate'],
  };
  const key = cache.buildKey(instruction, options);

  // Try replay first: miss should throw.
  try {
    const replayed = await cache.replay(key, { page }, { waitTimeout: 50, skipScreenshots: true });
    return { fromCache: true, key, result: replayed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('No cached execution found')) {
      throw err;
    }
  }

  // Cache miss: call real LLM once to produce a strict JSON plan.
  const response = await complete({
    model: modelId,
    temperature: 0,
    maxTokens: 300,
    messages: [
      {
        role: MessageRole.SYSTEM,
        content:
          'You output ONLY valid JSON. No markdown, no prose, no code fences. Output must be parseable by JSON.parse.',
      },
      {
        role: MessageRole.USER,
        content: [
          'Return a JSON object exactly matching this shape:',
          '{"steps":[{"action":{"type":"goto","url":"URL"}},{"action":{"type":"type","text":"hello"},"selector":"#q"},{"action":{"type":"click"},"selector":"#submit"},{"action":{"type":"evaluate","code":"2 + 3"}}]}',
          '',
          `Constraints: URL MUST equal: ${startUrl}`,
          'Selectors MUST be exactly: #q and #submit',
          'No extra keys besides "steps" at the top level.',
        ].join('\n'),
      },
    ],
  });

  const parsed = JSON.parse(response.content) as { steps: AgentReplayStep[] };
  expect(Array.isArray(parsed.steps)).toBe(true);
  expect(parsed.steps.length).toBeGreaterThanOrEqual(4);

  const cached: CachedAgentExecution = {
    version: 1,
    key,
    instruction,
    startUrl,
    options,
    configSignature: 'real-llm',
    steps: parsed.steps,
    result: { success: true },
    timestamp: Date.now(),
  };

  const engine = new ReplayEngine();
  const result = await engine.replay(cached, { page }, { waitTimeout: 50, skipScreenshots: true });
  cached.result = result;

  await cache.save(key, cached);
  return { fromCache: false, key, result };
}

describeWithAIGateway('Stage04 Cache Replay (real LLM, gated)', () => {
  describe('core + llm + cache', () => {
    it('Run1 records via real LLM; Run2 replays from cache without extra LLM calls', async () => {
      const server = await startTestServer({
        '/': async () => ({
          headers: { 'content-type': 'text/html; charset=utf-8' },
          body: [
            '<!doctype html>',
            '<html>',
            '<body>',
            '<input id="q" />',
            '<button id="submit">Submit</button>',
            '</body>',
            '</html>',
          ].join(''),
        }),
      });

      try {
        const startUrl = server.url('/');
        const instruction = 'Replay a small deterministic flow (real LLM plan)';
        const modelId = testModels.claude; // anthropic/claude-3-5-haiku

        const client = createLLMClient(modelId);
        let llmCalls = 0;
        const complete = async (
          args: Parameters<typeof client.complete>[0]
        ): Promise<Awaited<ReturnType<typeof client.complete>>> => {
          llmCalls++;
          return await client.complete(args);
        };

        const store = new MemoryStore();
        const cache = new AgentCache({ store, namespace: createCacheNamespace('core-llm-cache-real') });

        const page1 = createNodeTestPage();
        const run1 = await runOnce({ cache, modelId, complete, instruction, startUrl, page: page1 });
        expect(run1.fromCache).toBe(false);
        expect(llmCalls).toBe(1);

        const page2 = createNodeTestPage();
        const run2 = await runOnce({ cache, modelId, complete, instruction, startUrl, page: page2 });
        expect(run2.fromCache).toBe(true);
        expect(llmCalls).toBe(1);

        const stats = await cache.getStats();
        expect(stats.totalEntries).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hits).toBe(1);
        expect(stats.replayCount).toBe(1);

        // Basic replay correctness
        expect(page2.getState().elements.q?.value).toBe('hello');
        expect(page2.getState().elements.submit?.clicked).toBe(true);
      } finally {
        await server.close();
      }
    });
  });
});

