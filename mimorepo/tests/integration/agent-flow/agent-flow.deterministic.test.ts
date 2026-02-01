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

import { WorkflowAgent } from '@mimo/agent-multi';

class DeterministicPlanClient implements ILLMClient {
  public calls = 0;

  constructor(public readonly model: string, private readonly plan: unknown) {}

  get provider(): LLMProvider {
    return 'openai' as any;
  }

  get capabilities(): ModelCapability {
    return {
      supportsCaching: false,
      supportsThinking: false,
      maxContext: 128_000,
      supportsStructuredOutput: true,
      supportsStreaming: false,
    };
  }

  supports(_capability: keyof ModelCapability): boolean {
    return true;
  }

  async complete<T = any>(_options: ChatCompletionOptions): Promise<ChatCompletionResponse<T>> {
    this.calls++;
    return {
      content: JSON.stringify(this.plan),
      structuredData: this.plan as any,
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      model: this.model,
      finishReason: 'stop',
    };
  }

  async *stream<T = any>(_options: ChatCompletionOptions): AsyncIterable<ChatCompletionResponse<T>> {
    throw new Error('stream not implemented');
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
      // Keep it simple/safe for tests.
      const fn = new Function(`return (${code});`);
      const value = await page.evaluate(() => fn());
      return { value };
    },
  };

  return [goto, typeTool, click, evaluate];
}

describe('Stage06 Agent Flow (deterministic, cache replay)', () => {
  it('Run1 executes via tools; Run2 replays from cache without extra LLM calls', async () => {
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
      const instruction = 'Type hello and click submit';

      const plan = {
        steps: [
          { action: { type: 'goto', url: startUrl } },
          { action: { type: 'type', text: 'hello' }, selector: '#q' },
          { action: { type: 'click' }, selector: '#submit' },
          { action: { type: 'evaluate', code: '2 + 3' } },
        ],
      };

      const llm = new DeterministicPlanClient('openai/gpt-4o-mini', plan);

      const registry = new ToolRegistry();
      registry.registerBatch(buildBrowserTools() as any);
      const executor = new ToolExecutor();

      const cache = new AgentCache({ store: new MemoryStore(), namespace: createCacheNamespace('agent-flow') });

      const agent = new WorkflowAgent({
        id: 'agent-flow',
        model: 'openai/gpt-4o-mini',
        llm,
        registry,
        executor,
        toolContext: { config: {} },
        cache,
        promptTemplate: 'default',
        customSystemPrompt: 'Sensitive token: sk-test-1234567890',
      });

      // Run 1: tools path.
      const page1 = createNodeTestPage();
      const res1 = await agent.execute(instruction, {
        instruction,
        startUrl,
        page: page1,
        enableCache: true,
        sensitiveData: new Map([['OPENAI_API_KEY', 'sk-test-1234567890']]),
      });

      expect(res1.success).toBe(true);
      expect(llm.calls).toBe(1);
      expect(page1.getState().elements.q?.value).toBe('hello');
      expect(page1.getState().elements.submit?.clicked).toBe(true);

      // Ensure sensitive value was redacted in stored history.
      const historyText = agent.getHistory().map(m => (typeof m.content === 'string' ? m.content : '')).join('\n');
      expect(historyText).not.toContain('sk-test-1234567890');
      expect(historyText).toContain('<secret>OPENAI_API_KEY</secret>');

      // Run 2: replay path (no extra llm).
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
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.replayCount).toBe(1);
    } finally {
      await server.close();
    }
  });
});

