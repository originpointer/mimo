import { describe, it, expect } from 'vitest';
import { ReplayEngine, type CachedAgentExecution } from '@mimo/agent-cache';
import { startTestServer } from '../fixtures/http-server';
import { createNodeTestPage } from '../fixtures/page';

function buildCached(baseUrl: string): CachedAgentExecution {
  return {
    version: 1,
    key: 'agent:replay-test',
    instruction: 'Replay a small deterministic flow',
    startUrl: baseUrl,
    options: {
      instruction: 'Replay a small deterministic flow',
      startUrl: baseUrl,
      model: 'openai/gpt-4o-mini',
      tools: ['goto', 'type', 'click', 'evaluate', 'wait', 'screenshot'],
    },
    configSignature: 'sig',
    steps: [
      { action: { type: 'goto', url: baseUrl + '/' }, result: { ok: true } },
      { action: { type: 'type', text: 'hello' }, selector: '#q', result: { typed: true } },
      { action: { type: 'click' }, selector: '#submit', result: { clicked: true } },
      { action: { type: 'evaluate', code: '2 + 3' }, result: { eval: true } },
      { action: { type: 'wait', duration: 10 }, result: { waited: true } },
      { action: { type: 'screenshot' }, result: { screenshotTaken: true } },
    ],
    result: { success: true },
    timestamp: Date.now(),
  };
}

describe('Stage04 Cache Agent - ReplayEngine (node-only)', () => {
  it('replays goto/type/click/evaluate/wait/screenshot against a real local page', async () => {
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
      const page = createNodeTestPage();
      const engine = new ReplayEngine();
      const cached = buildCached(server.baseUrl);

      const result = await engine.replay(cached, { page }, { waitTimeout: 50 });
      expect(result.success).toBe(true);
      expect(result.actions?.length).toBeGreaterThan(0);

      // Evaluate step returns the evaluated value and is pushed into actions
      expect(result.actions).toContain(5);

      const state = page.getState();
      expect(state.elements.q?.value).toBe('hello');
      expect(state.elements.submit?.clicked).toBe(true);
    } finally {
      await server.close();
    }
  });

  it('fails fast when continueOnError=false and a step throws', async () => {
    const server = await startTestServer({
      '/': async () => ({
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: '<html><body><button id="ok">OK</button></body></html>',
      }),
    });

    try {
      const page = createNodeTestPage();
      const engine = new ReplayEngine();

      const cached: CachedAgentExecution = {
        version: 1,
        key: 'agent:fail-fast',
        instruction: 'fail fast',
        startUrl: server.baseUrl,
        options: { instruction: 'fail fast', startUrl: server.baseUrl, model: 'x', tools: [] },
        configSignature: 'sig',
        steps: [
          { action: { type: 'goto', url: server.baseUrl + '/' }, result: { ok: true } },
          { action: { type: 'click' }, selector: '#missing', result: { clicked: false } },
          { action: { type: 'click' }, selector: '#ok', result: { clicked: true } },
        ],
        result: { success: true },
        timestamp: Date.now(),
      };

      const result = await engine.replay(cached, { page }, { waitTimeout: 10 });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No element');
    } finally {
      await server.close();
    }
  });

  it('continues when continueOnError=true and records error actions', async () => {
    const server = await startTestServer({
      '/': async () => ({
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: '<html><body><button id="ok">OK</button></body></html>',
      }),
    });

    try {
      const page = createNodeTestPage();
      const engine = new ReplayEngine();

      const cached: CachedAgentExecution = {
        version: 1,
        key: 'agent:continue',
        instruction: 'continue on error',
        startUrl: server.baseUrl,
        options: { instruction: 'continue on error', startUrl: server.baseUrl, model: 'x', tools: [] },
        configSignature: 'sig',
        steps: [
          { action: { type: 'goto', url: server.baseUrl + '/' }, result: { ok: true } },
          { action: { type: 'click' }, selector: '#missing', result: { clicked: false } },
          { action: { type: 'click' }, selector: '#ok', result: { clicked: true } },
          { action: { type: 'screenshot' }, result: { screenshotTaken: true } },
        ],
        result: { success: true },
        timestamp: Date.now(),
      };

      const result = await engine.replay(cached, { page }, { waitTimeout: 10, continueOnError: true });
      expect(result.success).toBe(true);

      const errorActions = (result.actions ?? []).filter(
        a => typeof a === 'object' && a && (a as any).type === 'error'
      );
      expect(errorActions.length).toBe(1);

      const state = page.getState();
      expect(state.elements.ok?.clicked).toBe(true);
    } finally {
      await server.close();
    }
  });

  it('skips screenshot steps when skipScreenshots=true', async () => {
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
      const page = createNodeTestPage();
      const engine = new ReplayEngine();
      const cached = buildCached(server.baseUrl);

      const result = await engine.replay(cached, { page }, { waitTimeout: 50, skipScreenshots: true });

      // One step is skipped entirely, so it won't contribute to actions
      expect(result.success).toBe(true);
      expect(result.actions?.some(a => (a as any)?.screenshotTaken === true)).toBe(false);
    } finally {
      await server.close();
    }
  });
});

