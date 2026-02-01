import { describe, it, expect } from 'vitest';
import type { ChatMessage, LLMResponse, LLMStreamChunk, StagehandZodSchema } from '@mimo/types';

import { MessageRole, LLMProvider as CoreLLMProvider, type ModelCapability } from '@mimo/agent-core';
import { LLMClient } from '@mimo/llm';

import {
  AgentCache,
  ReplayEngine,
  type AgentReplayStep,
  type CachedAgentExecution,
} from '@mimo/agent-cache';
import { MemoryStore } from '@mimo/agent-cache/storage';

import { createCacheNamespace } from '../fixtures/cache';
import { startTestServer } from '../fixtures/http-server';
import { createNodeTestPage } from '../fixtures/page';

class DeterministicMockClient extends LLMClient {
  public calls = 0;

  constructor(
    model: string,
    private readonly plan: { steps: AgentReplayStep[] }
  ) {
    super(model);
  }

  get provider(): CoreLLMProvider {
    return CoreLLMProvider.OPENAI;
  }

  get capabilities(): ModelCapability {
    return {
      supportsCaching: false,
      supportsThinking: false,
      maxContext: 128_000,
      supportsStructuredOutput: false,
      supportsStreaming: true,
    };
  }

  getProviderType(): 'openai' {
    return 'openai';
  }

  protected async doChatCompletion(_messages: ChatMessage[], _options?: any): Promise<LLMResponse> {
    this.calls++;
    return {
      content: JSON.stringify(this.plan),
      usage: { inputTokens: 10, outputTokens: 20 },
      model: this.model,
    } as any;
  }

  protected async *doStreamChatCompletion(
    _messages: ChatMessage[],
    _options?: any
  ): AsyncGenerator<LLMStreamChunk> {
    this.calls++;
    // Not used by this test, but required by the abstract base class.
    yield { content: '', delta: { content: '' }, usage: { inputTokens: 0, outputTokens: 0 } } as any;
  }

  protected async doGenerateStructure<T>(
    _messages: ChatMessage[],
    _schema: StagehandZodSchema<T>
  ): Promise<any> {
    throw new Error('DeterministicMockClient.generateStructure is not implemented');
  }
}

async function runOnce(params: {
  cache: AgentCache;
  client: DeterministicMockClient;
  instruction: string;
  startUrl: string;
  page: ReturnType<typeof createNodeTestPage>;
}): Promise<{
  fromCache: boolean;
  key: string;
  result: Awaited<ReturnType<ReplayEngine['replay']>>;
}> {
  const { cache, client, instruction, startUrl, page } = params;

  const options = {
    instruction,
    startUrl,
    model: client.model,
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

  // Cache miss: call the LLM once, then execute and record.
  const completion = await client.complete({
    model: client.model,
    messages: [
      {
        role: MessageRole.USER,
        content: 'Return a JSON object with a steps array.',
      },
    ],
  });
  const parsed = JSON.parse(completion.content) as { steps: AgentReplayStep[] };

  const cached: CachedAgentExecution = {
    version: 1,
    key,
    instruction,
    startUrl,
    options,
    configSignature: 'test',
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

describe('Stage04 Cache Replay (core + llm + cache, deterministic)', () => {
  it('Run1 records via LLM; Run2 replays from cache without calling LLM again', async () => {
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
      const instruction = 'Replay a small deterministic flow';
      const plan: { steps: AgentReplayStep[] } = {
        steps: [
          { action: { type: 'goto', url: startUrl }, result: { ok: true } },
          { action: { type: 'type', text: 'hello' }, selector: '#q', result: { typed: true } },
          { action: { type: 'click' }, selector: '#submit', result: { clicked: true } },
          { action: { type: 'evaluate', code: '2 + 3' }, result: { eval: true } },
        ],
      };

      const store = new MemoryStore();
      const cache = new AgentCache({ store, namespace: createCacheNamespace('core-llm-cache') });
      const client = new DeterministicMockClient('openai/gpt-4o-mini', plan);

      // Run 1: miss -> LLM -> record -> save
      const page1 = createNodeTestPage();
      const run1 = await runOnce({ cache, client, instruction, startUrl, page: page1 });
      expect(run1.fromCache).toBe(false);
      expect(client.calls).toBe(1);
      expect(page1.getState().elements.q?.value).toBe('hello');
      expect(page1.getState().elements.submit?.clicked).toBe(true);

      // Run 2: hit -> replay (no extra LLM call)
      const page2 = createNodeTestPage();
      const run2 = await runOnce({ cache, client, instruction, startUrl, page: page2 });
      expect(run2.fromCache).toBe(true);
      expect(client.calls).toBe(1);
      expect(run2.result.actions).toContain(5);
      expect(page2.getState().elements.q?.value).toBe('hello');
      expect(page2.getState().elements.submit?.clicked).toBe(true);

      const stats = await cache.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.replayCount).toBe(1);
    } finally {
      await server.close();
    }
  });
});

