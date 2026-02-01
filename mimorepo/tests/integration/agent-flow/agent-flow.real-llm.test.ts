import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import type { ILLMClient, ModelCapability, ChatCompletionOptions, ChatCompletionResponse, LLMProvider } from '@mimo/agent-core';

import { ToolRegistry } from '@mimo/agent-tools';
import { ToolExecutor } from '@mimo/agent-tools/executor';
import type { ToolDefinition } from '@mimo/agent-core/types';

import { AgentCache } from '@mimo/agent-cache';
import { MemoryStore } from '@mimo/agent-cache/storage';
import { createCacheNamespace } from '../fixtures/cache';
import { startTestServer } from '../fixtures/http-server';
import { createNodeTestPage } from '../fixtures/page';
import { describeWithAIGateway, testModels } from '../fixtures/llm';

import { LLMProvider as LLMProviderFactory } from '@mimo/llm';
import { WorkflowAgent } from '@mimo/agent-multi';

class CountingClient implements ILLMClient {
  public calls = 0;
  constructor(private readonly inner: ILLMClient) {}

  get provider(): LLMProvider {
    return this.inner.provider;
  }
  get model(): string {
    return this.inner.model;
  }
  get capabilities(): ModelCapability {
    return this.inner.capabilities;
  }
  supports(capability: keyof ModelCapability): boolean {
    return this.inner.supports(capability);
  }

  async complete<T = any>(options: ChatCompletionOptions): Promise<ChatCompletionResponse<T>> {
    this.calls++;
    return await this.inner.complete<T>(options);
  }

  async *stream<T = any>(options: ChatCompletionOptions): AsyncIterable<ChatCompletionResponse<T>> {
    // Not used by these tests.
    for await (const chunk of this.inner.stream<T>(options)) {
      yield chunk;
    }
  }
}

function buildBrowserTools(): ToolDefinition[] {
  const goto: ToolDefinition = {
    name: 'goto',
    description: 'Navigate to a URL',
    parameters: z.object({ url: z.string() }),
    execute: async ({ url }, ctx) => {
      const page = (ctx.config as any)?.page;
      await page.goto(url);
      return { ok: true };
    },
  };

  const typeTool: ToolDefinition = {
    name: 'type',
    description: 'Type into selector',
    parameters: z.object({ selector: z.string(), text: z.string() }),
    execute: async ({ selector, text }, ctx) => {
      const page = (ctx.config as any)?.page;
      await page.type(selector, text);
      return { typed: true };
    },
  };

  const click: ToolDefinition = {
    name: 'click',
    description: 'Click selector',
    parameters: z.object({ selector: z.string() }),
    execute: async ({ selector }, ctx) => {
      const page = (ctx.config as any)?.page;
      await page.click(selector);
      return { clicked: true };
    },
  };

  const evaluate: ToolDefinition = {
    name: 'evaluate',
    description: 'Evaluate JS expression',
    parameters: z.object({ code: z.string() }),
    execute: async ({ code }, ctx) => {
      const page = (ctx.config as any)?.page;
      const fn = new Function(`return (${code});`);
      const value = await page.evaluate(() => fn());
      return { value };
    },
  };

  return [goto, typeTool, click, evaluate];
}

describeWithAIGateway('Stage06 Agent Flow (real LLM, gated)', () => {
  it('Run1 uses real LLM to produce plan; Run2 replays from cache', async () => {
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
      const instruction =
        'Use tools to: go to startUrl, type "hello" into #q, click #submit, then evaluate "2 + 3".';

      const llmProvider = new LLMProviderFactory();
      const baseClient = llmProvider.getClient(testModels.claude);
      const llm = new CountingClient(baseClient);

      const registry = new ToolRegistry();
      registry.registerBatch(buildBrowserTools() as any);
      const executor = new ToolExecutor();

      const cache = new AgentCache({ store: new MemoryStore(), namespace: createCacheNamespace('agent-flow-real') });

      const agent = new WorkflowAgent({
        id: 'agent-flow-real',
        model: testModels.claude,
        llm,
        registry,
        executor,
        toolContext: { config: {} },
        cache,
        promptTemplate: 'default',
      });

      const page1 = createNodeTestPage();
      const res1 = await agent.execute(instruction, {
        instruction,
        startUrl,
        page: page1,
        enableCache: true,
      });
      expect(res1.success).toBe(true);
      expect(llm.calls).toBe(1);
      expect(page1.getState().elements.q?.value).toBe('hello');
      expect(page1.getState().elements.submit?.clicked).toBe(true);

      const page2 = createNodeTestPage();
      const res2 = await agent.execute(instruction, {
        instruction,
        startUrl,
        page: page2,
        enableCache: true,
      });
      expect(res2.success).toBe(true);
      expect(llm.calls).toBe(1);
      expect(page2.getState().elements.q?.value).toBe('hello');
      expect(page2.getState().elements.submit?.clicked).toBe(true);

      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.replayCount).toBe(1);
    } finally {
      await server.close();
    }
  });
});

