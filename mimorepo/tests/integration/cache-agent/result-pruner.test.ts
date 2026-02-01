import { describe, it, expect } from 'vitest';
import { ResultPruner, type CachedAgentExecution } from '@mimo/agent-cache';

function makeExecution(): CachedAgentExecution {
  return {
    version: 1,
    key: 'agent:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    instruction: 'test',
    startUrl: 'http://127.0.0.1:1234/',
    options: {
      instruction: 'test',
      startUrl: 'http://127.0.0.1:1234/',
      model: 'openai/gpt-4o-mini',
      tools: ['goto', 'click', 'type'],
    },
    configSignature: 'sig',
    steps: [
      {
        action: { type: 'screenshot' },
        result: { screenshot: 'data:image/png;base64,AAA...', base64: 'AAA', data: 'AAA' },
      },
      {
        action: { type: 'evaluate', code: '1 + 1' },
        result: { ok: true, nested: { imageData: 'data:image/png;base64,BBB...' } },
      },
    ],
    result: {
      success: true,
      reasoning: 'x'.repeat(200),
      actions: [{ type: 'screenshot', screenshot: 'data:image/png;base64,CCC...' }],
    },
    timestamp: Date.now(),
  };
}

describe('Stage04 Cache Agent - ResultPruner', () => {
  it('removes screenshot/base64 data by default', () => {
    const pruner = new ResultPruner();
    const execution = makeExecution();

    const pruned = pruner.prune(execution, { removeScreenshots: true, removeBase64: false });

    expect(pruned.steps[0]?.result?.screenshot).toBe('[removed]');
    expect(pruned.steps[0]?.result?.base64).toBe('[removed]');
    expect(pruned.steps[0]?.result?.data).toBe('[removed]');
    expect(pruned.steps[1]?.result?.nested?.imageData).toBe('[removed]');

    expect(pruned.result?.actions?.[0]?.screenshot).toBe('[removed]');
  });

  it('truncates long text fields when maxTextLength is provided', () => {
    const pruner = new ResultPruner();
    const execution = makeExecution();

    const pruned = pruner.prune(execution, {
      maxTextLength: 10,
      truncationMarker: '...[truncated]',
    });

    expect(typeof pruned.result.reasoning).toBe('string');
    expect(pruned.result.reasoning.length).toBeGreaterThan(10);
    expect(pruned.result.reasoning).toContain('...[truncated]');
  });

  it('estimateSizeReduction reports consistent before/after sizes', () => {
    const pruner = new ResultPruner();
    const execution = makeExecution();

    const info = pruner.estimateSizeReduction(execution, { removeScreenshots: true });
    expect(info.before).toBeGreaterThan(0);
    expect(info.after).toBeGreaterThan(0);
    expect(info.after).toBeLessThan(info.before);
    expect(info.reduction).toBe(info.before - info.after);
    expect(info.percentage).toBeGreaterThan(0);
  });
});

